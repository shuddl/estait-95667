/**
 * Vertex AI Integration for Estait
 * Provides intelligent NLP processing for real estate agent workflows
 */

import { VertexAI, GenerativeModel, Content, SafetySetting, HarmCategory, HarmBlockThreshold } from '@google-cloud/vertexai';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface AIAction {
  action: 'add_lead' | 'create_task' | 'search_property' | 'update_contact' | 'get_contacts' | 'unknown';
  parameters: Record<string, any>;
  confidence: number;
  responseToUser: string;
  requiresConfirmation: boolean;
  suggestedFollowUps?: string[];
}

export interface ConversationContext {
  userId: string;
  sessionId: string;
  history: ConversationTurn[];
  metadata?: {
    crmConnected?: boolean;
    lastPropertySearch?: string;
    lastContactAdded?: string;
    [key: string]: any;
  };
}

export interface ConversationTurn {
  role: 'user' | 'assistant';
  message: string;
  timestamp: number;
  action?: AIAction;
}

// ============================================================================
// SYSTEM PROMPT ENGINEERING
// ============================================================================

const MASTER_SYSTEM_PROMPT = `You are Estait, a professional AI assistant specifically designed for real estate agents. You help manage CRM data, search properties, and streamline agent workflows through natural language conversation.

PERSONALITY & TONE:
- Professional yet friendly
- Efficient and action-oriented
- Knowledgeable about real estate terminology
- Proactive in suggesting follow-up actions

AVAILABLE ACTIONS:
1. add_lead: Add a new contact to the CRM system
   Required: firstName, lastName, and (email OR phone)
   Optional: notes, source, propertyInterest, budget

2. create_task: Create a follow-up task or reminder
   Required: description, dueDate (YYYY-MM-DD format)
   Optional: contactId, priority (low/medium/high), propertyId

3. search_property: Search MLS listings
   Required: location (city, state, or zip)
   Optional: minBeds, maxBeds, minPrice, maxPrice, propertyType, minSqft

4. update_contact: Update existing contact information
   Required: contactId or (firstName AND lastName)
   Optional: any field to update

5. get_contacts: Retrieve contacts from CRM
   Optional: filter (recent, today, this_week), searchTerm

6. unknown: When the intent is unclear or action cannot be determined

RESPONSE FORMAT (STRICT JSON):
{
  "action": "action_name",
  "parameters": {
    // Action-specific parameters extracted from user input
  },
  "confidence": 0.0-1.0,
  "responseToUser": "Natural conversational response to the user",
  "requiresConfirmation": boolean,
  "suggestedFollowUps": ["Optional array of follow-up actions"]
}

EXTRACTION RULES:
- Parse phone numbers into standard format (remove special characters)
- Infer missing information when obvious (e.g., "tomorrow" = next day's date)
- Set confidence based on clarity of user request (1.0 = very clear, <0.7 = ambiguous)
- Set requiresConfirmation=true for destructive actions or when confidence < 0.8
- Extract price ranges and convert to numbers (e.g., "500k" = 500000)
- Recognize property types: house, condo, townhouse, land, commercial

EXAMPLE CONVERSATIONS:

User: "Add John Smith, 555-1234, looking for 3 bed homes under 400k"
{
  "action": "add_lead",
  "parameters": {
    "firstName": "John",
    "lastName": "Smith",
    "phone": "5551234",
    "notes": "Looking for 3 bedroom homes",
    "propertyInterest": "3 bedroom homes",
    "budget": 400000
  },
  "confidence": 0.98,
  "responseToUser": "I've added John Smith to your contacts with his phone number and property preferences. Would you like me to search for 3 bedroom homes under $400k now?",
  "requiresConfirmation": false,
  "suggestedFollowUps": ["Search for 3 bedroom properties under $400k", "Set a follow-up reminder for John Smith"]
}

User: "Find me luxury condos in Austin"
{
  "action": "search_property",
  "parameters": {
    "location": "Austin, TX",
    "propertyType": "condo",
    "minPrice": 500000
  },
  "confidence": 0.85,
  "responseToUser": "I'm searching for luxury condos in Austin, TX. I've set a minimum price of $500k for luxury properties.",
  "requiresConfirmation": false,
  "suggestedFollowUps": ["Refine search by number of bedrooms", "Set specific price range"]
}

User: "Remind me to call the Johnsons next week about the property viewing"
{
  "action": "create_task",
  "parameters": {
    "description": "Call the Johnsons about property viewing",
    "dueDate": "[CALCULATE: 7 days from today]",
    "priority": "medium"
  },
  "confidence": 0.92,
  "responseToUser": "I've set a reminder for you to call the Johnsons next week about the property viewing.",
  "requiresConfirmation": false,
  "suggestedFollowUps": ["Add the Johnsons as contacts", "Schedule the property viewing"]
}

User: "Update Sarah's email to sarah.new@email.com"
{
  "action": "update_contact",
  "parameters": {
    "firstName": "Sarah",
    "email": "sarah.new@email.com"
  },
  "confidence": 0.75,
  "responseToUser": "I'll update Sarah's email to sarah.new@email.com. Please confirm this is the correct contact to update.",
  "requiresConfirmation": true
}

EDGE CASES:
- Ambiguous requests: Set low confidence and ask for clarification
- Multiple actions: Focus on primary action, suggest others as follow-ups
- Missing required fields: Ask user to provide them
- Informal language: Extract formal parameters from casual speech
- Typos/misspellings: Use context to infer correct information

ERROR HANDLING:
- If parameters are insufficient: Set action="unknown" and ask for missing information
- If action is unclear: Provide options for user to choose from
- If CRM is not connected: Inform user and suggest connection`;

// ============================================================================
// VERTEX AI CLIENT INITIALIZATION
// ============================================================================

class VertexAIService {
  private vertexAI: VertexAI;
  private model: GenerativeModel;
  private conversationCache: Map<string, ConversationContext>;

  constructor() {
    // Initialize Vertex AI with project configuration
    this.vertexAI = new VertexAI({
      project: process.env.GCLOUD_PROJECT || 'estait-1fdbe',
      location: 'us-central1'
    });

    // Configure the generative model with optimal settings
    this.model = this.vertexAI.getGenerativeModel({
      model: 'gemini-1.5-pro-002', // Latest model for better reasoning
      generationConfig: {
        temperature: 0.7, // Balanced creativity and consistency
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json', // Force JSON output
      },
      safetySettings: this.getSafetySettings(),
      systemInstruction: MASTER_SYSTEM_PROMPT
    });

    // Initialize conversation cache for memory management
    this.conversationCache = new Map();
  }

  /**
   * Get safety settings for content generation
   */
  private getSafetySettings(): SafetySetting[] {
    return [
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ];
  }

  /**
   * Process user input and return structured AI action
   */
  async processUserInput(
    userInput: string,
    userId: string,
    sessionId: string,
    metadata?: Record<string, any>
  ): Promise<AIAction> {
    try {
      // Get or create conversation context
      const context = this.getOrCreateContext(userId, sessionId, metadata);

      // Build conversation history for context
      const conversationHistory = this.buildConversationHistory(context);

      // Add current user input
      const currentMessage = this.formatUserMessage(userInput, metadata);

      // Generate content with Vertex AI
      const result = await this.model.generateContent({
        contents: [...conversationHistory, currentMessage],
      });

      // Parse and validate response
      const response = result.response;
      const aiAction = this.parseAIResponse(response);

      // Update conversation history
      this.updateConversationHistory(context, userInput, aiAction);

      // Store context for future use
      this.conversationCache.set(sessionId, context);

      return aiAction;

    } catch (error) {
      console.error('Error processing user input with Vertex AI:', error);
      return this.createErrorResponse(error);
    }
  }

  /**
   * Get or create conversation context for session
   */
  private getOrCreateContext(
    userId: string,
    sessionId: string,
    metadata?: Record<string, any>
  ): ConversationContext {
    if (this.conversationCache.has(sessionId)) {
      const context = this.conversationCache.get(sessionId)!;
      // Update metadata if provided
      if (metadata) {
        context.metadata = { ...context.metadata, ...metadata };
      }
      return context;
    }

    return {
      userId,
      sessionId,
      history: [],
      metadata: metadata || {}
    };
  }

  /**
   * Build conversation history for AI context
   */
  private buildConversationHistory(context: ConversationContext): Content[] {
    const contents: Content[] = [];

    // Include recent conversation history (last 10 turns)
    const recentHistory = context.history.slice(-10);
    
    for (const turn of recentHistory) {
      contents.push({
        role: turn.role === 'user' ? 'user' : 'model',
        parts: [{ text: turn.message }]
      });
    }

    return contents;
  }

  /**
   * Format user message with additional context
   */
  private formatUserMessage(userInput: string, metadata?: Record<string, any>): Content {
    let enhancedInput = userInput;

    // Add context about CRM connection status
    if (metadata && 'crmConnected' in metadata) {
      enhancedInput += `\n[Context: CRM is ${metadata.crmConnected ? 'connected' : 'not connected'}]`;
    }

    // Add context about recent actions
    if (metadata?.lastContactAdded) {
      enhancedInput += `\n[Recent: Added contact ${metadata.lastContactAdded}]`;
    }

    // Add current date for time-based requests
    const today = new Date().toISOString().split('T')[0];
    enhancedInput += `\n[Today's date: ${today}]`;

    return {
      role: 'user',
      parts: [{ text: enhancedInput }]
    };
  }

  /**
   * Parse and validate AI response
   */
  private parseAIResponse(response: any): AIAction {
    try {
      const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) {
        throw new Error('Empty response from Vertex AI');
      }

      // Clean the response (remove markdown if present)
      const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Parse JSON response
      const aiAction: AIAction = JSON.parse(cleanedText);

      // Validate required fields
      if (!aiAction.action || !aiAction.parameters || aiAction.confidence === undefined) {
        throw new Error('Invalid AI response format');
      }

      // Ensure confidence is between 0 and 1
      aiAction.confidence = Math.max(0, Math.min(1, aiAction.confidence));

      // Set defaults if missing
      aiAction.requiresConfirmation = aiAction.requiresConfirmation ?? false;
      aiAction.suggestedFollowUps = aiAction.suggestedFollowUps || [];

      return aiAction;

    } catch (error) {
      console.error('Error parsing AI response:', error);
      return {
        action: 'unknown',
        parameters: {},
        confidence: 0,
        responseToUser: 'I had trouble understanding that request. Could you please rephrase it?',
        requiresConfirmation: false
      };
    }
  }

  /**
   * Update conversation history with new turn
   */
  private updateConversationHistory(
    context: ConversationContext,
    userInput: string,
    aiAction: AIAction
  ): void {
    const timestamp = Date.now();

    // Add user turn
    context.history.push({
      role: 'user',
      message: userInput,
      timestamp
    });

    // Add assistant turn
    context.history.push({
      role: 'assistant',
      message: aiAction.responseToUser,
      timestamp: timestamp + 1,
      action: aiAction
    });

    // Limit history to last 50 turns to manage memory
    if (context.history.length > 50) {
      context.history = context.history.slice(-50);
    }
  }

  /**
   * Create error response
   */
  private createErrorResponse(error: any): AIAction {
    return {
      action: 'unknown',
      parameters: { error: error.message },
      confidence: 0,
      responseToUser: 'I encountered an issue processing your request. Please try again or contact support if the problem persists.',
      requiresConfirmation: false
    };
  }

  /**
   * Clear conversation cache for a session
   */
  clearSession(sessionId: string): void {
    this.conversationCache.delete(sessionId);
  }

  /**
   * Get conversation history for a session
   */
  getSessionHistory(sessionId: string): ConversationTurn[] {
    const context = this.conversationCache.get(sessionId);
    return context?.history || [];
  }

  /**
   * Analyze conversation for insights
   */
  async analyzeConversation(sessionId: string): Promise<{
    totalTurns: number;
    actionsPerformed: Record<string, number>;
    averageConfidence: number;
    suggestedImprovements: string[];
  }> {
    const context = this.conversationCache.get(sessionId);
    
    if (!context || context.history.length === 0) {
      return {
        totalTurns: 0,
        actionsPerformed: {},
        averageConfidence: 0,
        suggestedImprovements: []
      };
    }

    const actionsPerformed: Record<string, number> = {};
    let totalConfidence = 0;
    let actionCount = 0;

    for (const turn of context.history) {
      if (turn.action) {
        actionsPerformed[turn.action.action] = (actionsPerformed[turn.action.action] || 0) + 1;
        totalConfidence += turn.action.confidence;
        actionCount++;
      }
    }

    const averageConfidence = actionCount > 0 ? totalConfidence / actionCount : 0;

    // Generate insights
    const suggestedImprovements: string[] = [];
    
    if (averageConfidence < 0.8) {
      suggestedImprovements.push('Consider providing more specific details in your requests for better accuracy');
    }
    
    if (actionsPerformed['unknown'] > 2) {
      suggestedImprovements.push('Some requests were unclear. Try using action keywords like "add", "search", or "create"');
    }

    return {
      totalTurns: context.history.length,
      actionsPerformed,
      averageConfidence,
      suggestedImprovements
    };
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

let vertexAIInstance: VertexAIService | null = null;

export function getVertexAIService(): VertexAIService {
  if (!vertexAIInstance) {
    vertexAIInstance = new VertexAIService();
  }
  return vertexAIInstance;
}

// Export types and main processing function
export async function processNaturalLanguage(
  userInput: string,
  userId: string,
  sessionId: string,
  metadata?: Record<string, any>
): Promise<AIAction> {
  const service = getVertexAIService();
  return service.processUserInput(userInput, userId, sessionId, metadata);
}