
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";
import { SpeechClient, protos } from "@google-cloud/speech";
import { VertexAI } from "@google-cloud/vertexai";
import { encrypt, decrypt } from "./lib/security";
import { v4 as uuidv4 } from "uuid";
import { corsMiddleware } from "./lib/cors";

admin.initializeApp();
const speechClient = new SpeechClient();

// Initialize Vertex AI
const vertexAI = new VertexAI({ project: process.env.GCLOUD_PROJECT, location: 'us-central1' });
const generativeModel = vertexAI.getGenerativeModel({ model: 'gemini-1.5-flash-001' });

// ============================================================================
// 1. CORE AI LOGIC
// ============================================================================

/**
 * Sends a command to the Vertex AI Gemini model and returns a structured response.
 * @param commandText The natural language command from the user.
 * @returns A structured AI response.
 */
async function getAiResponse(commandText: string) {
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

    const request = {
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
    return JSON.parse(cleanedJson);
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
async function _getAccessToken(userId: string, crmType: "wise_agent" | "follow_up_boss" | "real_geeks"): Promise<string> {
    const tokenDoc = await admin.firestore().collection("users").doc(userId).collection("credentials").doc(crmType).get();
    if (!tokenDoc.exists || !tokenDoc.data()) {
        throw new functions.https.HttpsError("failed-precondition", `CRM ${crmType} is not connected for this user.`);
    }
    // TODO: Add token refresh logic here
    return decrypt(tokenDoc.data()?.accessToken);
}

/**
 * Adds a contact to Wise Agent.
 * @param userId The user's ID.
 * @param params The contact details from the AI response.
 */
async function _addWiseAgentContact(userId: string, params: any) {
    const accessToken = await _getAccessToken(userId, "wise_agent");
    await axios.post("https://api.wiseagent.com/v2/contacts/add_new_contact", {
        Method: "add_new_contact",
        AuthToken: accessToken,
        first_name: params.firstName,
        last_name: params.lastName,
        email_address: params.email,
        phone_number: params.phone,
    });
}

/**
 * Adds a task to Wise Agent.
 * @param userId The user's ID.
 * @param params The task details from the AI response.
 */
async function _addWiseAgentTask(userId: string, params: any) {
    const accessToken = await _getAccessToken(userId, "wise_agent");
    await axios.post("https://api.wiseagent.com/v2/tasks/add_new_task", {
        Method: "add_new_task",
        AuthToken: accessToken,
        description: params.description,
        due_date: params.dueDate,
    });
}

/**
 * Searches for properties using the RealEstateAPI.com.
 * @param params The search criteria from the AI response.
 */
async function _searchProperties(params: any) {
    const apiKey = functions.config().realestateapi.key; // This should be set as a secret
    const response = await axios.get("https://api.realestateapi.com/v2/properties/search", {
        params: {
            location: params.location,
            beds_min: params.minBeds,
            price_max: params.maxPrice,
        },
        headers: { "x-api-key": apiKey },
    });
    return response.data;
}


// ============================================================================
// 3. EXPORTED ONREQUEST CLOUD FUNCTIONS (HTTP WRAPPERS)
// ============================================================================

/**
 * Main endpoint to process a user's natural language command.
 * This function now acts as a controller, delegating tasks to other functions.
 */
export const processAgentCommand = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "You must be logged in to call this function.");
    }
    const { commandText } = data;
    const userId = context.auth.uid;

    try {
        const aiResponse = await getAiResponse(commandText);
        let actionResult: any;

        switch (aiResponse.action) {
            case "add_lead":
                await _addWiseAgentContact(userId, aiResponse.parameters);
                break;
            case "create_task":
                await _addWiseAgentTask(userId, aiResponse.parameters);
                break;
            case "search_properties":
                actionResult = await _searchProperties(aiResponse.parameters);
                break;
            case "unknown":
                break; // Do nothing, just return the AI's response
            default:
                throw new Error(`Unsupported AI action: ${aiResponse.action}`);
        }

        return {
            responseToUser: aiResponse.responseToUser,
            data: actionResult // e.g., property search results
        };

    } catch (error) {
        console.error("Error processing agent command:", error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError("internal", "An unexpected error occurred while processing your command.");
    }
});


/**
 * Initiates the OAuth 2.0 flow for Wise Agent.
 */
export const wiseAgentAuth = functions.https.onCall((data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "You must be logged in.");
    }
    const clientId = functions.config().wiseagent.client_id; // Should be a secret
    const redirectUri = `https://${process.env.GCLOUD_PROJECT}.firebaseapp.com/wiseAgentCallback`;
    
    // Using the user's UID in the state parameter to securely identify them on callback
    const state = context.auth.uid;
    
    const authUrl = `https://sync.thewiseagent.com/WiseAuth/auth?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=profile%20contacts&state=${state}`;
    
    return { authUrl };
});

/**
 * Handles the OAuth 2.0 callback from Wise Agent.
 */
export const wiseAgentCallback = functions.https.onRequest(async (req, res) => {
    corsMiddleware(req, res, async () => {
        try {
            const { code, state } = req.query;
            if (!code || !state) {
                throw new Error("Missing code or state from OAuth callback.");
            }

            const userId = state as string; // The state is the user's UID
            const clientId = functions.config().wiseagent.client_id;
            const clientSecret = functions.config().wiseagent.client_secret;

            const response = await axios.post("https://sync.thewiseagent.com/WiseAuth/token", {
                client_id: clientId,
                client_secret: clientSecret,
                code,
                grant_type: "authorization_code",
            });

            const { access_token, refresh_token, expires_at } = response.data;

            // Store encrypted tokens securely in a subcollection for the user
            await admin.firestore().collection("users").doc(userId).collection("credentials").doc("wise_agent").set({
                accessToken: encrypt(access_token),
                refreshToken: encrypt(refresh_token),
                expiresAt: new Date(expires_at).getTime(),
            });

            res.send("<html><body><h1>Connection to Wise Agent Successful!</h1><p>You can now close this window.</p></body></html>");
        } catch (error) {
            console.error("Error handling Wise Agent OAuth callback:", error);
            res.status(500).send("Authentication failed. Please try again.");
        }
    });
});
