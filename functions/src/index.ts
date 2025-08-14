import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { encrypt, decrypt } from "./lib/security";
import { corsMiddleware } from "./lib/cors";
import { processNaturalLanguage, AIAction } from "./vertexai";
import {
  CRMType,
  WiseAgentTokenResponse,
  PropertySearchResult,
  ProcessAgentCommandData,
  ProcessAgentCommandResponse,
  WiseAgentAuthResponse,
  OAuthCallbackQuery,
  isAuthenticated
} from "./types";

admin.initializeApp();

// ============================================================================
// CORE CRM & API LOGIC (INTERNAL HELPERS)
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
 * Adds a contact to Wise Agent.
 * @param userId The user's ID.
 * @param params The contact details from the AI response.
 */
async function _addWiseAgentContact(userId: string, params: any): Promise<void> {
  const accessToken = await _getAccessToken(userId, "wise_agent");
  
  const response = await fetch("https://api.wiseagent.com/v2/contacts/add_new_contact", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      Method: "add_new_contact",
      AuthToken: accessToken,
      first_name: params.firstName || params.first_name,
      last_name: params.lastName || params.last_name,
      email_address: params.email,
      phone_number: params.phone,
      notes: params.notes,
      source: params.source || 'Estait AI'
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
async function _addWiseAgentTask(userId: string, params: any): Promise<void> {
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
      priority: params.priority || 'medium',
      contact_id: params.contactId
    })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to add task: ${response.statusText}`);
  }
}

/**
 * Updates a contact in Wise Agent.
 * @param userId The user's ID.
 * @param params The contact update details.
 */
async function _updateWiseAgentContact(userId: string, params: any): Promise<void> {
  const accessToken = await _getAccessToken(userId, "wise_agent");
  
  const updateData: any = {
    Method: "update_contact",
    AuthToken: accessToken
  };

  // Map parameters to Wise Agent fields
  if (params.contactId) updateData.contact_id = params.contactId;
  if (params.firstName) updateData.first_name = params.firstName;
  if (params.lastName) updateData.last_name = params.lastName;
  if (params.email) updateData.email_address = params.email;
  if (params.phone) updateData.phone_number = params.phone;
  if (params.notes) updateData.notes = params.notes;

  const response = await fetch("https://api.wiseagent.com/v2/contacts/update_contact", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(updateData)
  });
  
  if (!response.ok) {
    throw new Error(`Failed to update contact: ${response.statusText}`);
  }
}

/**
 * Get contacts from Wise Agent.
 * @param userId The user's ID.
 * @param params Filter parameters.
 */
async function _getWiseAgentContacts(userId: string, params: any): Promise<any[]> {
  const accessToken = await _getAccessToken(userId, "wise_agent");
  
  const queryData: any = {
    Method: "get_contacts",
    AuthToken: accessToken
  };

  // Add filter parameters if provided
  if (params.filter === 'recent') {
    queryData.limit = 10;
    queryData.sort = 'created_desc';
  } else if (params.filter === 'today') {
    const today = new Date().toISOString().split('T')[0];
    queryData.created_after = today;
  } else if (params.searchTerm) {
    queryData.search = params.searchTerm;
  }

  const response = await fetch("https://api.wiseagent.com/v2/contacts/get_contacts", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(queryData)
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get contacts: ${response.statusText}`);
  }

  const data = await response.json();
  return data.contacts || [];
}

/**
 * Searches for properties using the RealEstateAPI.com.
 * @param params The search criteria from the AI response.
 */
async function _searchProperties(params: any): Promise<PropertySearchResult> {
  const apiKey = process.env.REALESTATEAPI_KEY || functions.config().realestateapi?.key;
  
  if (!apiKey) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "RealEstateAPI key is not configured."
    );
  }
  
  const url = new URL("https://api.realestateapi.com/v2/properties/search");
  url.searchParams.append("location", params.location);
  
  if (params.minBeds) url.searchParams.append("beds_min", params.minBeds.toString());
  if (params.maxBeds) url.searchParams.append("beds_max", params.maxBeds.toString());
  if (params.minPrice) url.searchParams.append("price_min", params.minPrice.toString());
  if (params.maxPrice) url.searchParams.append("price_max", params.maxPrice.toString());
  if (params.propertyType) url.searchParams.append("property_type", params.propertyType);
  if (params.minSqft) url.searchParams.append("sqft_min", params.minSqft.toString());
  
  const response = await fetch(url.toString(), {
    headers: { "x-api-key": apiKey },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to search properties: ${response.statusText}`);
  }
  
  return await response.json() as PropertySearchResult;
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
      // Check CRM connection status
      const crmConnected = await _isCRMConnected(userId, "wise_agent");
      
      // Get user metadata for context
      const userDoc = await admin.firestore().collection("users").doc(userId).get();
      const userData = userDoc.data() || {};
      
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
          if (!crmConnected) {
            throw new functions.https.HttpsError(
              "failed-precondition",
              "Please connect your CRM first to add contacts."
            );
          }
          await _addWiseAgentContact(userId, aiAction.parameters);
          
          // Update user metadata
          await admin.firestore().collection("users").doc(userId).update({
            lastContactAdded: `${aiAction.parameters.firstName} ${aiAction.parameters.lastName}`,
            lastActionTimestamp: admin.firestore.FieldValue.serverTimestamp()
          });
          break;
          
        case "create_task":
          if (!crmConnected) {
            throw new functions.https.HttpsError(
              "failed-precondition",
              "Please connect your CRM first to create tasks."
            );
          }
          await _addWiseAgentTask(userId, aiAction.parameters);
          break;
          
        case "search_property":
          actionResult = await _searchProperties(aiAction.parameters);
          
          // Update user metadata
          await admin.firestore().collection("users").doc(userId).update({
            lastPropertySearch: aiAction.parameters.location,
            lastActionTimestamp: admin.firestore.FieldValue.serverTimestamp()
          });
          break;
          
        case "update_contact":
          if (!crmConnected) {
            throw new functions.https.HttpsError(
              "failed-precondition",
              "Please connect your CRM first to update contacts."
            );
          }
          await _updateWiseAgentContact(userId, aiAction.parameters);
          break;
          
        case "get_contacts":
          if (!crmConnected) {
            throw new functions.https.HttpsError(
              "failed-precondition",
              "Please connect your CRM first to view contacts."
            );
          }
          actionResult = await _getWiseAgentContacts(userId, aiAction.parameters);
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
            connectedAt: admin.firestore.FieldValue.serverTimestamp()
          });

        // Update user document
        await admin.firestore()
          .collection("users")
          .doc(userId)
          .update({
            crmConnected: true,
            crmType: 'wise_agent',
            crmConnectedAt: admin.firestore.FieldValue.serverTimestamp()
          });

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