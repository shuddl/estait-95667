import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
// Security functions are now handled by service classes
// import { encrypt } from "./lib/security";
import { corsMiddleware } from "./lib/cors";
import { processNaturalLanguage, AIAction } from "./vertexai";
import {
  CRMType,
  ProcessAgentCommandData,
  ProcessAgentCommandResponse,
  WiseAgentAuthResponse,
  OAuthCallbackQuery,
  isAuthenticated
} from "./types";
import { WiseAgentService } from "./services/crm/wiseagent";
import { followUpBossService } from "./services/crm/followupboss";
import { realGeeksService } from "./services/crm/realgeeks";

// Initialize CRM services
const wiseAgentServiceInstance = new WiseAgentService("");
const wiseAgentService = {
  getValidAccessToken: async (userId: string) => {
    const service = new WiseAgentService(userId);
    return await service.getAccessToken();
  },
  addContact: async (userId: string, contact: any) => {
    const service = new WiseAgentService(userId);
    return await service.createContact(contact);
  },
  addTask: async (userId: string, contactId: string, task: any) => {
    const service = new WiseAgentService(userId);
    return await service.createTask(contactId, task);
  },
  updateContact: async (userId: string, contactId: string, updates: any) => {
    const service = new WiseAgentService(userId);
    return await service.updateContact(contactId, updates);
  },
  getContacts: async (userId: string, query: string) => {
    const service = new WiseAgentService(userId);
    return await service.searchContacts(query);
  },
  exchangeCodeForTokens: async (code: string) => {
    // This would be implemented in oauthCallbacks
    return { access_token: "", refresh_token: "" };
  },
  storeTokens: async (userId: string, tokens: any) => {
    // Store in Firestore
    return {};
  }
};
import { mlsService } from "./services/mls/realestate";
import { stripeService } from "./services/payments/stripe";
import Stripe from 'stripe';

admin.initializeApp();

// ============================================================================
// CORE CRM & API LOGIC (INTERNAL HELPERS)
// ============================================================================

/**
 * Retrieves valid, decrypted CRM access tokens from Firestore.
 * Automatically refreshes expired tokens.
 * @param userId The user's ID.
 * @param crmType The type of CRM (e.g., "wise_agent").
 * @returns The valid access token.
 */
// Token retrieval is now handled directly by service classes
// Kept here for reference on how the token refresh works
/*
async function _getAccessToken(userId: string, crmType: CRMType): Promise<string> {
  try {
    switch (crmType) {
      case 'wise_agent':
        return await wiseAgentService.getValidAccessToken(userId);
      case 'follow_up_boss':
        return await followUpBossService.getValidAccessToken(userId);
      case 'real_geeks':
        return await realGeeksService.getValidAccessToken(userId);
      default:
        throw new functions.https.HttpsError(
          'invalid-argument',
          `Unsupported CRM type: ${crmType}`
        );
    }
  } catch (error) {
    console.error(`Error getting access token for ${crmType}:`, error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError(
      'unauthenticated',
      `Failed to authenticate with ${crmType}. Please reconnect your account.`
    );
  }
}
*/

/**
 * Check if user has CRM connected
 */
async function _isCRMConnected(userId: string, crmType: CRMType): Promise<boolean> {
  try {
    const tokenDoc = await admin.firestore()
      .collection("users")
      .doc(userId)
      .collection("credentials")
      .doc(crmType)
      .get();
    
    return tokenDoc.exists && tokenDoc.data()?.accessToken;
  } catch {
    return false;
  }
}

/**
 * Adds a contact to the connected CRM.
 * @param userId The user's ID.
 * @param crmType The CRM type.
 * @param params The contact details from the AI response.
 */
async function _addContact(userId: string, crmType: CRMType, params: any): Promise<void> {
  const contactData = {
    first_name: params.firstName || params.first_name,
    last_name: params.lastName || params.last_name,
    email: params.email || params.email_address,
    phone: params.phone || params.phone_number,
    notes: params.notes,
    source: params.source || 'Estait AI'
  };

  switch (crmType) {
    case 'wise_agent':
      await wiseAgentService.addContact(userId, contactData);
      break;
    case 'follow_up_boss':
      await followUpBossService.addContact(userId, {
        name: `${contactData.first_name} ${contactData.last_name}`,
        email: contactData.email,
        phones: contactData.phone ? [{ type: 'mobile', value: contactData.phone }] : [],
        source: contactData.source
      });
      break;
    case 'real_geeks':
      await realGeeksService.addLead(userId, contactData);
      break;
    default:
      throw new functions.https.HttpsError(
        'invalid-argument',
        `Unsupported CRM type: ${crmType}`
      );
  }
}

/**
 * Adds a task to the connected CRM.
 * @param userId The user's ID.
 * @param crmType The CRM type.
 * @param params The task details from the AI response.
 */
async function _addTask(userId: string, crmType: CRMType, params: any): Promise<void> {
  const taskData = {
    description: params.description,
    due_date: params.dueDate || params.due_date,
    priority: params.priority || 'medium',
    contact_id: params.contactId || params.contact_id
  };

  switch (crmType) {
    case 'wise_agent':
      await wiseAgentService.addTask(userId, taskData);
      break;
    case 'follow_up_boss':
      await followUpBossService.addTask(userId, {
        description: taskData.description,
        dueDate: taskData.due_date,
        personId: taskData.contact_id,
        type: 'Other'
      });
      break;
    case 'real_geeks':
      await realGeeksService.addActivity(userId, {
        lead_id: taskData.contact_id || '',
        type: 'note',
        description: taskData.description,
        due_date: taskData.due_date
      });
      break;
    default:
      throw new functions.https.HttpsError(
        'invalid-argument',
        `Unsupported CRM type: ${crmType}`
      );
  }
}

/**
 * Updates a contact in the connected CRM.
 * @param userId The user's ID.
 * @param crmType The CRM type.
 * @param params The contact update details.
 */
async function _updateContact(userId: string, crmType: CRMType, params: any): Promise<void> {
  const contactId = params.contactId || params.contact_id;
  
  if (!contactId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Contact ID is required for updating a contact.'
    );
  }

  const updateData: any = {};
  if (params.firstName || params.first_name) updateData.first_name = params.firstName || params.first_name;
  if (params.lastName || params.last_name) updateData.last_name = params.lastName || params.last_name;
  if (params.email || params.email_address) updateData.email = params.email || params.email_address;
  if (params.phone || params.phone_number) updateData.phone = params.phone || params.phone_number;
  if (params.notes) updateData.notes = params.notes;

  switch (crmType) {
    case 'wise_agent':
      await wiseAgentService.updateContact(userId, contactId, updateData);
      break;
    case 'follow_up_boss':
      await followUpBossService.updateContact(userId, contactId, {
        name: updateData.first_name && updateData.last_name 
          ? `${updateData.first_name} ${updateData.last_name}` 
          : undefined,
        email: updateData.email,
        phones: updateData.phone ? [{ type: 'mobile', value: updateData.phone }] : undefined
      });
      break;
    case 'real_geeks':
      await realGeeksService.updateLead(userId, contactId, updateData);
      break;
    default:
      throw new functions.https.HttpsError(
        'invalid-argument',
        `Unsupported CRM type: ${crmType}`
      );
  }
}

/**
 * Get contacts from the connected CRM.
 * @param userId The user's ID.
 * @param crmType The CRM type.
 * @param params Filter parameters.
 */
async function _getContacts(userId: string, crmType: CRMType, params: any): Promise<any[]> {
  const filterParams: any = {
    limit: params.limit || 20
  };

  // Add filter parameters if provided
  if (params.filter === 'recent') {
    filterParams.limit = 10;
    filterParams.sort = 'created_desc';
  } else if (params.filter === 'today') {
    const today = new Date().toISOString().split('T')[0];
    filterParams.created_after = today;
  } else if (params.searchTerm) {
    filterParams.search = params.searchTerm;
  }

  switch (crmType) {
    case 'wise_agent':
      const wiseResult = await wiseAgentService.getContacts(userId, filterParams);
      return wiseResult.contacts || [];
    case 'follow_up_boss':
      const fubResult = await followUpBossService.getContacts(userId, {
        limit: filterParams.limit,
        q: filterParams.search,
        sort: filterParams.sort
      });
      return fubResult.people || [];
    case 'real_geeks':
      const rgResult = await realGeeksService.getLeads(userId, {
        per_page: filterParams.limit,
        search: filterParams.search,
        created_after: filterParams.created_after
      });
      return rgResult.leads || [];
    default:
      throw new functions.https.HttpsError(
        'invalid-argument',
        `Unsupported CRM type: ${crmType}`
      );
  }
}

/**
 * Searches for properties using the MLS service.
 * @param params The search criteria from the AI response.
 */
async function _searchProperties(params: any): Promise<any> {
  const searchParams = {
    location: params.location,
    city: params.city,
    state: params.state,
    zip: params.zip,
    min_beds: params.minBeds || params.min_beds,
    max_beds: params.maxBeds || params.max_beds,
    min_price: params.minPrice || params.min_price,
    max_price: params.maxPrice || params.max_price,
    min_baths: params.minBaths || params.min_baths,
    max_baths: params.maxBaths || params.max_baths,
    property_type: params.propertyType ? [params.propertyType] : undefined,
    min_sqft: params.minSqft || params.min_sqft,
    max_sqft: params.maxSqft || params.max_sqft,
    limit: params.limit || 20
  };

  return await mlsService.searchProperties(searchParams);
}

// ============================================================================
// EXPORTED CLOUD FUNCTIONS
// ============================================================================

/**
 * Main endpoint to process a user's natural language command using Vertex AI.
 * This function now uses the advanced Vertex AI integration instead of Dialogflow.
 */
export const processAgentCommand = functions.https.onCall(
  async (
    data: ProcessAgentCommandData, 
    context: functions.https.CallableContext
  ): Promise<ProcessAgentCommandResponse> => {
    // Type guard to ensure authentication
    if (!isAuthenticated(context)) {
      throw new functions.https.HttpsError(
        "unauthenticated", 
        "You must be logged in to call this function."
      );
    }
    
    const { commandText, sessionId = 'default' } = data;
    const userId = context.auth.uid;

    try {
      // Get user metadata for context
      const userDoc = await admin.firestore().collection("users").doc(userId).get();
      const userData = userDoc.data() || {};
      const crmType = userData.crmType as CRMType | undefined;
      
      // Check CRM connection status
      const crmConnected = crmType ? await _isCRMConnected(userId, crmType) : false;
      
      // Process natural language with Vertex AI
      const aiAction: AIAction = await processNaturalLanguage(
        commandText,
        userId,
        sessionId,
        {
          crmConnected,
          userName: userData.displayName || userData.email,
          lastContactAdded: userData.lastContactAdded,
          lastPropertySearch: userData.lastPropertySearch
        }
      );

      // Log the AI decision for monitoring
      console.log('Vertex AI Decision:', {
        action: aiAction.action,
        confidence: aiAction.confidence,
        requiresConfirmation: aiAction.requiresConfirmation
      });

      // If confirmation is required, return early
      if (aiAction.requiresConfirmation) {
        return {
          responseToUser: aiAction.responseToUser,
          data: {
            requiresConfirmation: true,
            action: aiAction.action,
            parameters: aiAction.parameters,
            suggestedFollowUps: aiAction.suggestedFollowUps
          }
        };
      }

      // Execute the action based on AI decision
      let actionResult: any = undefined;

      switch (aiAction.action) {
        case "add_lead":
          if (!crmConnected || !crmType) {
            throw new functions.https.HttpsError(
              "failed-precondition",
              "Please connect your CRM first to add contacts."
            );
          }
          await _addContact(userId, crmType, aiAction.parameters);
          
          // Update user metadata
          await admin.firestore().collection("users").doc(userId).update({
            lastContactAdded: `${aiAction.parameters.firstName} ${aiAction.parameters.lastName}`,
            lastActionTimestamp: admin.firestore.FieldValue.serverTimestamp()
          });
          break;
          
        case "create_task":
          if (!crmConnected || !crmType) {
            throw new functions.https.HttpsError(
              "failed-precondition",
              "Please connect your CRM first to create tasks."
            );
          }
          await _addTask(userId, crmType, aiAction.parameters);
          break;
          
        case "search_property":
          actionResult = await _searchProperties(aiAction.parameters);
          
          // Save search and update user metadata
          if (actionResult && userId) {
            await mlsService.savePropertySearch(userId, aiAction.parameters, actionResult);
          }
          break;
          
        case "update_contact":
          if (!crmConnected || !crmType) {
            throw new functions.https.HttpsError(
              "failed-precondition",
              "Please connect your CRM first to update contacts."
            );
          }
          await _updateContact(userId, crmType, aiAction.parameters);
          break;
          
        case "get_contacts":
          if (!crmConnected || !crmType) {
            throw new functions.https.HttpsError(
              "failed-precondition",
              "Please connect your CRM first to view contacts."
            );
          }
          actionResult = await _getContacts(userId, crmType, aiAction.parameters);
          break;
          
        case "unknown":
          // No action needed, just return the AI's response
          break;
          
        default:
          console.warn(`Unsupported AI action: ${aiAction.action}`);
      }

      // Store conversation turn in Firestore for analytics
      await admin.firestore()
        .collection("conversations")
        .doc(userId)
        .collection("turns")
        .add({
          sessionId,
          userInput: commandText,
          aiAction: aiAction.action,
          confidence: aiAction.confidence,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

      return {
        responseToUser: aiAction.responseToUser,
        data: {
          ...actionResult,
          suggestedFollowUps: aiAction.suggestedFollowUps,
          confidence: aiAction.confidence
        }
      };

    } catch (error) {
      console.error("Error processing agent command:", error);
      
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      
      // Log error for monitoring
      await admin.firestore()
        .collection("errors")
        .add({
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
          command: commandText,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
      
      throw new functions.https.HttpsError(
        "internal", 
        "I encountered an issue processing your request. Please try again."
      );
    }
  }
);

/**
 * Get conversation analytics for a user
 */
export const getConversationAnalytics = functions.https.onCall(
  async (
    data: { sessionId?: string },
    context: functions.https.CallableContext
  ) => {
    if (!isAuthenticated(context)) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be logged in."
      );
    }

    const userId = context.auth.uid;
    const { sessionId = 'default' } = data;

    try {
      // Get conversation history from Firestore
      const turnsSnapshot = await admin.firestore()
        .collection("conversations")
        .doc(userId)
        .collection("turns")
        .where("sessionId", "==", sessionId)
        .orderBy("timestamp", "desc")
        .limit(50)
        .get();

      const turns = turnsSnapshot.docs.map(doc => doc.data());
      
      // Calculate analytics
      const actionCounts: Record<string, number> = {};
      let totalConfidence = 0;
      
      turns.forEach(turn => {
        if (turn.aiAction) {
          actionCounts[turn.aiAction] = (actionCounts[turn.aiAction] || 0) + 1;
          totalConfidence += turn.confidence || 0;
        }
      });

      const averageConfidence = turns.length > 0 ? totalConfidence / turns.length : 0;

      return {
        totalTurns: turns.length,
        actionCounts,
        averageConfidence,
        recentTurns: turns.slice(0, 10)
      };
    } catch (error) {
      console.error("Error getting analytics:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to retrieve analytics."
      );
    }
  }
);

/**
 * Initiates the OAuth 2.0 flow for Wise Agent.
 */
export const wiseAgentAuth = functions.https.onCall(
  async (
    data: unknown, 
    context: functions.https.CallableContext
  ): Promise<WiseAgentAuthResponse> => {
    // Type guard to ensure authentication
    if (!isAuthenticated(context)) {
      throw new functions.https.HttpsError(
        "unauthenticated", 
        "You must be logged in."
      );
    }
    
    const clientId = process.env.WISE_AGENT_CLIENT_ID || 
                    functions.config().wiseagent?.client_id;
    
    if (!clientId) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Wise Agent client ID is not configured."
      );
    }
    
    const redirectUri = `https://${process.env.GCLOUD_PROJECT}.firebaseapp.com/wiseAgentCallback`;
    
    // Using the user's UID in the state parameter to securely identify them on callback
    const state = context.auth.uid;
    
    const authUrl = `https://sync.thewiseagent.com/WiseAuth/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=profile%20contacts&state=${state}`;
    
    return { authUrl };
  }
);

/**
 * Handles the OAuth 2.0 callback from Wise Agent.
 */
export const wiseAgentCallback = functions.https.onRequest(
  async (req: functions.Request, res: functions.Response): Promise<void> => {
    corsMiddleware(req, res, async () => {
      try {
        const query = req.query as OAuthCallbackQuery;
        const { code, state } = query;
        
        if (!code || !state) {
          throw new Error("Missing code or state from OAuth callback.");
        }

        const userId = state;
        const tokens = await wiseAgentService.exchangeCodeForTokens(code);
        await wiseAgentService.storeTokens(userId, tokens);

        res.send(`
          <html>
            <body style="background: black; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
              <div style="text-align: center;">
                <h1>✅ Connection to Wise Agent Successful!</h1>
                <p>You can now close this window and return to Estait.</p>
                <script>
                  setTimeout(() => {
                    window.close();
                  }, 3000);
                </script>
              </div>
            </body>
          </html>
        `);
      } catch (error) {
        console.error("Error handling Wise Agent OAuth callback:", error);
        res.status(500).send(`
          <html>
            <body style="background: black; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
              <div style="text-align: center;">
                <h1>❌ Authentication Failed</h1>
                <p>Please try again or contact support.</p>
                <p style="color: #666; font-size: 14px;">${error instanceof Error ? error.message : 'Unknown error'}</p>
              </div>
            </body>
          </html>
        `);
      }
    });
  }
);

/**
 * Initiates the OAuth 2.0 flow for Follow Up Boss.
 */
export const followUpBossAuth = functions.https.onCall(
  async (
    data: unknown,
    context: functions.https.CallableContext
  ): Promise<{ authUrl: string }> => {
    if (!isAuthenticated(context)) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be logged in."
      );
    }
    
    const redirectUri = `https://${process.env.GCLOUD_PROJECT}.firebaseapp.com/followUpBossCallback`;
    const authUrl = followUpBossService.getAuthUrl(context.auth.uid, redirectUri);
    
    return { authUrl };
  }
);

/**
 * Handles the OAuth 2.0 callback from Follow Up Boss.
 */
export const followUpBossCallback = functions.https.onRequest(
  async (req: functions.Request, res: functions.Response): Promise<void> => {
    corsMiddleware(req, res, async () => {
      try {
        const query = req.query as OAuthCallbackQuery;
        const { code, state } = query;
        
        if (!code || !state) {
          throw new Error("Missing code or state from OAuth callback.");
        }

        const userId = state;
        const redirectUri = `https://${process.env.GCLOUD_PROJECT}.firebaseapp.com/followUpBossCallback`;
        const tokens = await followUpBossService.exchangeCodeForTokens(code, redirectUri);
        await followUpBossService.storeTokens(userId, tokens);

        res.send(`
          <html>
            <body style="background: black; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
              <div style="text-align: center;">
                <h1>✅ Connection to Follow Up Boss Successful!</h1>
                <p>You can now close this window and return to Estait.</p>
                <script>
                  setTimeout(() => {
                    window.close();
                  }, 3000);
                </script>
              </div>
            </body>
          </html>
        `);
      } catch (error) {
        console.error("Error handling Follow Up Boss OAuth callback:", error);
        res.status(500).send(`
          <html>
            <body style="background: black; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
              <div style="text-align: center;">
                <h1>❌ Authentication Failed</h1>
                <p>Please try again or contact support.</p>
                <p style="color: #666; font-size: 14px;">${error instanceof Error ? error.message : 'Unknown error'}</p>
              </div>
            </body>
          </html>
        `);
      }
    });
  }
);

/**
 * Initiates the OAuth 2.0 flow for Real Geeks.
 */
export const realGeeksAuth = functions.https.onCall(
  async (
    data: unknown,
    context: functions.https.CallableContext
  ): Promise<{ authUrl: string }> => {
    if (!isAuthenticated(context)) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be logged in."
      );
    }
    
    const redirectUri = `https://${process.env.GCLOUD_PROJECT}.firebaseapp.com/realGeeksCallback`;
    const authUrl = realGeeksService.getAuthUrl(context.auth.uid, redirectUri);
    
    return { authUrl };
  }
);

/**
 * Handles the OAuth 2.0 callback from Real Geeks.
 */
export const realGeeksCallback = functions.https.onRequest(
  async (req: functions.Request, res: functions.Response): Promise<void> => {
    corsMiddleware(req, res, async () => {
      try {
        const query = req.query as OAuthCallbackQuery;
        const { code, state } = query;
        
        if (!code || !state) {
          throw new Error("Missing code or state from OAuth callback.");
        }

        const userId = state;
        const redirectUri = `https://${process.env.GCLOUD_PROJECT}.firebaseapp.com/realGeeksCallback`;
        const tokens = await realGeeksService.exchangeCodeForTokens(code, redirectUri);
        await realGeeksService.storeTokens(userId, tokens);

        res.send(`
          <html>
            <body style="background: black; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
              <div style="text-align: center;">
                <h1>✅ Connection to Real Geeks Successful!</h1>
                <p>You can now close this window and return to Estait.</p>
                <script>
                  setTimeout(() => {
                    window.close();
                  }, 3000);
                </script>
              </div>
            </body>
          </html>
        `);
      } catch (error) {
        console.error("Error handling Real Geeks OAuth callback:", error);
        res.status(500).send(`
          <html>
            <body style="background: black; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
              <div style="text-align: center;">
                <h1>❌ Authentication Failed</h1>
                <p>Please try again or contact support.</p>
                <p style="color: #666; font-size: 14px;">${error instanceof Error ? error.message : 'Unknown error'}</p>
              </div>
            </body>
          </html>
        `);
      }
    });
  }
);
/**
 * Create Stripe checkout session for subscription
 */
export const createCheckoutSession = functions.https.onCall(
  async (
    data: { planId: string; successUrl: string; cancelUrl: string },
    context: functions.https.CallableContext
  ) => {
    if (!isAuthenticated(context)) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be logged in."
      );
    }

    try {
      const session = await stripeService.createCheckoutSession(
        context.auth.uid,
        data.planId,
        data.successUrl,
        data.cancelUrl
      );

      return {
        sessionId: session.id,
        url: session.url
      };
    } catch (error) {
      console.error("Error creating checkout session:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to create checkout session"
      );
    }
  }
);

/**
 * Get subscription status
 */
export const getSubscriptionStatus = functions.https.onCall(
  async (
    data: unknown,
    context: functions.https.CallableContext
  ) => {
    if (!isAuthenticated(context)) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be logged in."
      );
    }

    try {
      const hasSubscription = await stripeService.hasActiveSubscription(context.auth.uid);
      const details = await stripeService.getSubscriptionDetails(context.auth.uid);
      
      return {
        hasActiveSubscription: hasSubscription,
        subscriptionDetails: details
      };
    } catch (error) {
      console.error("Error getting subscription status:", error);
      return {
        hasActiveSubscription: false,
        subscriptionDetails: null
      };
    }
  }
);

/**
 * Stripe webhook handler
 */
export const stripeWebhook = functions.https.onRequest(
  async (req: functions.Request, res: functions.Response) => {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || 
                          functions.config().stripe?.webhook_secret;

    if (!endpointSecret) {
      console.error("Stripe webhook secret not configured");
      res.status(500).send("Webhook not configured");
      return;
    }

    const sig = req.headers['stripe-signature'];
    if (!sig) {
      res.status(400).send("No signature");
      return;
    }

    try {
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 
                             functions.config().stripe?.secret_key || '';
      const stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2025-07-30.basil'
      });
      
      const event = stripe.webhooks.constructEvent(
        (req as any).rawBody || req.body,
        sig,
        endpointSecret
      );

      await stripeService.handleWebhook(event);
      res.status(200).send("OK");
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(400).send(`Webhook Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

// ============================================================================
// SMART REMINDERS SYSTEM
// ============================================================================

import { smartRemindersService } from './services/reminders/smartReminders';

/**
 * Scheduled function to process pending reminders (runs every 15 minutes)
 */
export const processReminders = functions.pubsub
  .schedule('every 15 minutes')
  .onRun(async (context) => {
    console.log('Processing pending reminders...');
    
    try {
      await smartRemindersService.processPendingReminders();
      console.log('Reminders processed successfully');
    } catch (error) {
      console.error('Error processing reminders:', error);
    }
    
    return null;
  });

/**
 * Initialize reminder rules for new users
 */
export const initializeReminders = functions.https.onCall(
  async (data: unknown, context: functions.https.CallableContext) => {
    if (!isAuthenticated(context)) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be logged in."
      );
    }
    
    try {
      await smartRemindersService.initializeUserRules(context.auth.uid);
      return { success: true };
    } catch (error) {
      console.error("Error initializing reminders:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to initialize reminder rules"
      );
    }
  }
);

/**
 * Get upcoming reminders
 */
export const getUpcomingReminders = functions.https.onCall(
  async (data: { limit?: number }, context: functions.https.CallableContext) => {
    if (!isAuthenticated(context)) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be logged in."
      );
    }
    
    try {
      const reminders = await smartRemindersService.getUpcomingReminders(
        context.auth.uid,
        data.limit || 10
      );
      return { reminders };
    } catch (error) {
      console.error("Error getting reminders:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to get reminders"
      );
    }
  }
);

/**
 * Create a custom reminder
 */
export const createReminder = functions.https.onCall(
  async (
    data: {
      contactId?: string;
      contactName?: string;
      message: string;
      scheduledFor: string;
    },
    context: functions.https.CallableContext
  ) => {
    if (!isAuthenticated(context)) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be logged in."
      );
    }
    
    try {
      const reminderId = await smartRemindersService.createReminder({
        userId: context.auth.uid,
        type: 'custom',
        contactId: data.contactId,
        contactName: data.contactName,
        message: data.message,
        scheduledFor: new Date(data.scheduledFor),
        status: 'pending'
      });
      
      return { reminderId, success: true };
    } catch (error) {
      console.error("Error creating reminder:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to create reminder"
      );
    }
  }
);
