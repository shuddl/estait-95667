import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { VertexAI } from "@google-cloud/vertexai";
import { encrypt, decrypt } from "./lib/security";
import { corsMiddleware } from "./lib/cors";
import type {
  AIResponse,
  VertexAIRequest,
  CRMType,
  WiseAgentContact,
  WiseAgentTask,
  WiseAgentTokenResponse,
  PropertySearchParams,
  PropertySearchResult,
  ProcessAgentCommandData,
  ProcessAgentCommandResponse,
  WiseAgentAuthResponse,
  OAuthCallbackQuery,
  AuthenticatedContext,
  isAuthenticated
} from "./types";

admin.initializeApp();

// Initialize Vertex AI
const vertexAI = new VertexAI({ 
  project: process.env.GCLOUD_PROJECT || 'estait-1fdbe', 
  location: 'us-central1' 
});
const generativeModel = vertexAI.getGenerativeModel({ 
  model: 'gemini-1.5-flash-001' 
});

// ============================================================================
// 1. CORE AI LOGIC
// ============================================================================

/**
 * Sends a command to the Vertex AI Gemini model and returns a structured response.
 * @param commandText The natural language command from the user.
 * @returns A structured AI response.
 */
async function getAiResponse(commandText: string): Promise<AIResponse> {
  const systemPrompt = `
    You are a professional real estate assistant named "Estait".
    Your task is to understand a user's command and translate it into a specific, structured JSON format.
    The JSON output MUST contain three fields: "action", "parameters", and "responseToUser".

    Here are the possible actions and their required parameters:
    1.  "add_lead":
        - "firstName": The first name of the lead.
        - "lastName": The last name of the lead.
        - "email": The email address of the lead.
        - "phone": The phone number of the lead.
    2.  "create_task":
        - "description": The description of the task.
        - "dueDate": The due date of the task in YYYY-MM-DD format.
    3.  "search_properties":
        - "location": The city or neighborhood to search in.
        - "minBeds": (Optional) The minimum number of bedrooms.
        - "maxPrice": (Optional) The maximum price.
    4.  "unknown":
        - No parameters required. Use this if the command is unclear.

    Based on the user's command, generate the appropriate JSON.
    Example command: "add a new lead John Doe at john.doe@example.com, phone is 555-123-4567"
    Example JSON output:
    {
      "action": "add_lead",
      "parameters": {
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@example.com",
        "phone": "555-123-4567"
      },
      "responseToUser": "I've added John Doe to your contacts."
    }
  `;

  const request: VertexAIRequest = {
    contents: [{ role: 'user', parts: [{ text: commandText }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
  };

  const result = await generativeModel.generateContent(request);
  const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!responseText) {
    throw new Error("Vertex AI returned an empty response.");
  }

  // Clean the response to ensure it's valid JSON
  const cleanedJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleanedJson) as AIResponse;
}

// ============================================================================
// 2. CORE CRM & API LOGIC (INTERNAL HELPERS)
// ============================================================================

/**
 * Retrieves valid, decrypted CRM access tokens from Firestore.
 * @param userId The user's ID.
 * @param crmType The type of CRM (e.g., "wise_agent").
 * @returns The decrypted access token.
 */
async function _getAccessToken(userId: string, crmType: CRMType): Promise<string> {
  const tokenDoc = await admin.firestore()
    .collection("users")
    .doc(userId)
    .collection("credentials")
    .doc(crmType)
    .get();
    
  if (!tokenDoc.exists || !tokenDoc.data()) {
    throw new functions.https.HttpsError(
      "failed-precondition", 
      `CRM ${crmType} is not connected for this user.`
    );
  }
  
  const data = tokenDoc.data();
  if (!data?.accessToken) {
    throw new functions.https.HttpsError(
      "failed-precondition", 
      `No access token found for ${crmType}.`
    );
  }
  
  // TODO: Add token refresh logic here
  return decrypt(data.accessToken);
}

/**
 * Adds a contact to Wise Agent.
 * @param userId The user's ID.
 * @param params The contact details from the AI response.
 */
async function _addWiseAgentContact(userId: string, params: WiseAgentContact): Promise<void> {
  const accessToken = await _getAccessToken(userId, "wise_agent");
  
  // Using axios alternative with fetch
  const response = await fetch("https://api.wiseagent.com/v2/contacts/add_new_contact", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      Method: "add_new_contact",
      AuthToken: accessToken,
      first_name: params.firstName,
      last_name: params.lastName,
      email_address: params.email,
      phone_number: params.phone,
    })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to add contact: ${response.statusText}`);
  }
}

/**
 * Adds a task to Wise Agent.
 * @param userId The user's ID.
 * @param params The task details from the AI response.
 */
async function _addWiseAgentTask(userId: string, params: WiseAgentTask): Promise<void> {
  const accessToken = await _getAccessToken(userId, "wise_agent");
  
  const response = await fetch("https://api.wiseagent.com/v2/tasks/add_new_task", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      Method: "add_new_task",
      AuthToken: accessToken,
      description: params.description,
      due_date: params.dueDate,
    })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to add task: ${response.statusText}`);
  }
}

/**
 * Searches for properties using the RealEstateAPI.com.
 * @param params The search criteria from the AI response.
 */
async function _searchProperties(params: PropertySearchParams): Promise<PropertySearchResult> {
  const apiKey = process.env.REALESTATEAPI_KEY || functions.config().realestateapi?.key;
  
  if (!apiKey) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "RealEstateAPI key is not configured."
    );
  }
  
  const url = new URL("https://api.realestateapi.com/v2/properties/search");
  url.searchParams.append("location", params.location);
  
  if (params.minBeds) {
    url.searchParams.append("beds_min", params.minBeds.toString());
  }
  if (params.maxPrice) {
    url.searchParams.append("price_max", params.maxPrice.toString());
  }
  
  const response = await fetch(url.toString(), {
    headers: { "x-api-key": apiKey },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to search properties: ${response.statusText}`);
  }
  
  return await response.json() as PropertySearchResult;
}

// ============================================================================
// 3. EXPORTED ONREQUEST CLOUD FUNCTIONS (HTTP WRAPPERS)
// ============================================================================

/**
 * Main endpoint to process a user's natural language command.
 * This function now acts as a controller, delegating tasks to other functions.
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
    
    const { commandText } = data;
    const userId = context.auth.uid;

    try {
      const aiResponse = await getAiResponse(commandText);
      let actionResult: any = undefined;

      switch (aiResponse.action) {
        case "add_lead":
          await _addWiseAgentContact(userId, aiResponse.parameters as WiseAgentContact);
          break;
          
        case "create_task":
          await _addWiseAgentTask(userId, aiResponse.parameters as WiseAgentTask);
          break;
          
        case "search_properties":
          actionResult = await _searchProperties(aiResponse.parameters as PropertySearchParams);
          break;
          
        case "unknown":
          // Do nothing, just return the AI's response
          break;
          
        default:
          throw new Error(`Unsupported AI action: ${aiResponse.action}`);
      }

      return {
        responseToUser: aiResponse.responseToUser,
        data: actionResult
      };

    } catch (error) {
      console.error("Error processing agent command:", error);
      
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      
      throw new functions.https.HttpsError(
        "internal", 
        "An unexpected error occurred while processing your command."
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

        const userId = state; // The state is the user's UID
        const clientId = process.env.WISE_AGENT_CLIENT_ID || 
                        functions.config().wiseagent?.client_id;
        const clientSecret = process.env.WISE_AGENT_CLIENT_SECRET || 
                            functions.config().wiseagent?.client_secret;

        if (!clientId || !clientSecret) {
          throw new Error("Wise Agent credentials are not configured.");
        }

        const response = await fetch("https://sync.thewiseagent.com/WiseAuth/token", {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            grant_type: "authorization_code",
          })
        });

        if (!response.ok) {
          throw new Error(`Token exchange failed: ${response.statusText}`);
        }

        const tokenData = await response.json() as WiseAgentTokenResponse;
        const { access_token, refresh_token, expires_at } = tokenData;

        // Store encrypted tokens securely in a subcollection for the user
        await admin.firestore()
          .collection("users")
          .doc(userId)
          .collection("credentials")
          .doc("wise_agent")
          .set({
            accessToken: encrypt(access_token),
            refreshToken: encrypt(refresh_token),
            expiresAt: new Date(expires_at).getTime(),
          });

        res.send(`
          <html>
            <body style="background: black; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
              <div style="text-align: center;">
                <h1>Connection to Wise Agent Successful!</h1>
                <p>You can now close this window.</p>
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
                <h1>Authentication Failed</h1>
                <p>Please try again.</p>
              </div>
            </body>
          </html>
        `);
      }
    });
  }
);