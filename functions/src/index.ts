
/**
 * This file contains all the cloud functions for the Estait application.
 *
 * @see https://firebase.google.com/docs/functions/
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";
import { SpeechClient, protos } from "@google-cloud/speech";
import { SessionsClient } from "@google-cloud/dialogflow";
import { encrypt, decrypt } from "./lib/security";
import { v4 as uuidv4 } from "uuid";
import { corsMiddleware } from "./lib/cors";

// Initialize Firebase Admin SDK
admin.initializeApp();
const speechClient = new SpeechClient();
const dialogflowClient = new SessionsClient();

// -----------------------------------------------------------------------------
// INTERNAL HELPER FUNCTIONS (CORE LOGIC)
// -----------------------------------------------------------------------------

async function _addWiseAgentContact(userId: string, contactDetails: { first_name: string, last_name: string, email_address: string, phone_number: string }) {
    const tokenDoc = await admin.firestore().collection("crm_tokens").doc(`${userId}_wiseagent`).get();
    if (!tokenDoc.exists || !tokenDoc.data()) {
        throw new functions.https.HttpsError("failed-precondition", "Wise Agent CRM not connected.");
    }
    const accessToken = decrypt(tokenDoc.data()?.accessToken);

    await axios.post("https://api.wiseagent.com/v2/contacts/add_new_contact", {
        Method: "add_new_contact",
        AuthToken: accessToken,
        ...contactDetails,
    });
}

async function _addWiseAgentTask(userId: string, taskDetails: { description: string, due_date: string }) {
    const tokenDoc = await admin.firestore().collection("crm_tokens").doc(`${userId}_wiseagent`).get();
    if (!tokenDoc.exists || !tokenDoc.data()) {
        throw new functions.https.HttpsError("failed-precondition", "Wise Agent CRM not connected.");
    }
    const accessToken = decrypt(tokenDoc.data()?.accessToken);

    await axios.post("https://api.wiseagent.com/v2/tasks/add_new_task", {
        Method: "add_new_task",
        AuthToken: accessToken,
        ...taskDetails,
    });
}

async function _searchProperties(searchCriteria: { location: string, minBeds: number, maxPrice: number }) {
    const apiKey = functions.config().realestateapi.key;
    const response = await axios.get("https://api.realestateapi.com/v2/properties/search", {
        params: searchCriteria,
        headers: { "x-api-key": apiKey },
    });
    return response.data;
}


// -----------------------------------------------------------------------------
// EXPORTED ONREQUEST CLOUD FUNCTIONS (HTTP WRAPPERS)
// -----------------------------------------------------------------------------

export const initiateFollowUpBossOAuth = functions.https.onRequest((req, res) => {
    corsMiddleware(req, res, () => {
        const clientId = functions.config().followupboss.client_id;
        const redirectUri = functions.config().followupboss.redirect_uri;
        const scope = "people.read";
        const state = `followupboss_${uuidv4()}`;
        const authUrl = `https://app.followupboss.com/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;
        res.json({ authUrl });
    });
});

export const handleFollowUpBossOAuthCallback = functions.https.onRequest(async (req, res) => {
    corsMiddleware(req, res, async () => {
        try {
            const { code, state } = req.query;
            const userId = (state as string).split("_")[1]; // This is a simplified approach for demo

            const clientId = functions.config().followupboss.client_id;
            const clientSecret = functions.config().followupboss.client_secret;
            const redirectUri = functions.config().followupboss.redirect_uri;
    
            const response = await axios.post("https://app.followupboss.com/oauth/token", {
                grant_type: "authorization_code",
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
            });
    
            const { access_token, refresh_token, expires_in } = response.data;
    
            await admin.firestore().collection("crm_tokens").doc(`${userId}_followupboss`).set({
                userId,
                crmType: "followupboss",
                accessToken: encrypt(access_token),
                refreshToken: encrypt(refresh_token),
                expiresAt: Date.now() + expires_in * 1000,
            });
    
            res.send("<html><body><h1>Connection Successful!</h1><p>You can now close this window.</p></body></html>");
        } catch (error) {
            console.error("Error handling Follow Up Boss OAuth callback:", error);
            res.status(500).send("Authentication failed.");
        }
    });
});

export const initiateWiseAgentOAuth = functions.https.onRequest((req, res) => {
    corsMiddleware(req, res, () => {
        const clientId = functions.config().wiseagent.client_id;
        const redirectUri = functions.config().wiseagent.redirect_uri;
        const scope = "profile contacts";
        const state = `wiseagent_${uuidv4()}`;
        const authUrl = `https://sync.thewiseagent.com/WiseAuth/auth?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;
        res.json({ authUrl });
    });
});

export const handleWiseAgentOAuthCallback = functions.https.onRequest(async (req, res) => {
    corsMiddleware(req, res, async () => {
        try {
            const { code, state } = req.query;
            const userId = (state as string).split("_")[1]; // Simplified for demo

            const clientId = functions.config().wiseagent.client_id;
            const clientSecret = functions.config().wiseagent.client_secret;
    
            const response = await axios.post("https://sync.thewiseagent.com/WiseAuth/token", {
                client_id: clientId,
                client_secret: clientSecret,
                code,
                grant_type: "authorization_code",
            });
    
            const { access_token, refresh_token, expires_at } = response.data;
    
            await admin.firestore().collection("crm_tokens").doc(`${userId}_wiseagent`).set({
                userId,
                crmType: "wiseagent",
                accessToken: encrypt(access_token),
                refreshToken: encrypt(refresh_token),
                expiresAt: new Date(expires_at).getTime(),
            });
    
            res.send("<html><body><h1>Connection Successful!</h1><p>You can now close this window.</p></body></html>");
        } catch (error) {
            console.error("Error handling Wise Agent OAuth callback:", error);
            res.status(500).send("Authentication failed.");
        }
    });
});


export const searchPropertiesRealEstateAPI = functions.https.onRequest(async (req, res) => {
    corsMiddleware(req, res, async () => {
        try {
            const properties = await _searchProperties(req.body.data);
            res.json(properties);
        } catch (error) {
            console.error("Error searching properties:", error);
            res.status(500).send("Failed to search properties.");
        }
    });
});

export const transcribeAudio = functions.https.onRequest(async (req, res) => {
    corsMiddleware(req, res, async () => {
        try {
            const { audioBytes } = req.body.data;
            const audio = { content: audioBytes };
            const config: protos.google.cloud.speech.v1.IRecognitionConfig = {
                encoding: "LINEAR16",
                sampleRateHertz: 16000,
                languageCode: "en-US",
            };
            const request: protos.google.cloud.speech.v1.IRecognizeRequest = { audio, config };
            
            const [response] = await speechClient.recognize(request);
            const transcription = response.results
                ?.map((result: protos.google.cloud.speech.v1.ISpeechRecognitionResult) => result.alternatives?.[0].transcript)
                .join("\n");
            res.json({ transcription });
        } catch (error) {
            console.error("Error transcribing audio:", error);
            res.status(500).send("Failed to transcribe audio.");
        }
    });
});

export const getWiseAgentContacts = functions.https.onRequest(async (req, res) => {
    corsMiddleware(req, res, async () => {
        try {
            const userId = req.body.data.auth.uid;
            const tokenDoc = await admin.firestore().collection("crm_tokens").doc(`${userId}_wiseagent`).get();
            if (!tokenDoc.exists || !tokenDoc.data()) {
                res.status(400).send("Wise Agent CRM not connected.");
                return;
            }
            const accessToken = decrypt(tokenDoc.data()?.accessToken);

            const response = await axios.post("https://api.wiseagent.com/v2/contacts/get_contacts", {
                Method: "get_contacts",
                AuthToken: accessToken,
                limit: 5,
            });

            res.json(response.data);
        } catch (error) {
            console.error("Error getting Wise Agent contacts:", error);
            res.status(500).send("Failed to get Wise Agent contacts.");
        }
    });
});


export const processAgentCommand = functions.https.onRequest(async (req, res) => {
    corsMiddleware(req, res, async () => {
        try {
            const { commandText, sessionId, auth } = req.body.data;
            const projectId = functions.config().dialogflow.project_id;
            const sessionPath = dialogflowClient.projectAgentSessionPath(projectId, sessionId);
    
            const request = {
                session: sessionPath,
                queryInput: { text: { text: commandText, languageCode: "en-US" } },
            };
    
            const [response] = await dialogflowClient.detectIntent(request);
            const result = response.queryResult;

            if (!result || !result.intent || !result.parameters || !result.parameters.fields) {
                throw new Error("Invalid Dialogflow result");
            }

            const intentName = result.intent.displayName;
            const parameters = result.parameters.fields;
            let fulfillmentText = result.fulfillmentText || "I'm sorry, I couldn't process that.";

            switch (intentName) {
                case "add_lead_intent":
                    const contact_details = {
                        first_name: parameters.first_name.stringValue || "",
                        last_name: parameters.last_name.stringValue || "",
                        email_address: parameters.email_address.stringValue || "",
                        phone_number: parameters.phone_number.stringValue || "",
                    };
                    await _addWiseAgentContact(auth.uid, contact_details);
                    fulfillmentText = `I've added ${contact_details.first_name} ${contact_details.last_name} to your Wise Agent contacts.`;
                    break;
                
                case "create_task_intent":
                    const task_details = {
                        description: parameters.description.stringValue || "",
                        due_date: parameters.due_date.stringValue || "",
                    };
                    await _addWiseAgentTask(auth.uid, task_details);
                    fulfillmentText = `I've created a new task in Wise Agent: "${task_details.description}".`;
                    break;

                case "search_property_intent":
                    const search_criteria = {
                        location: parameters.location.stringValue || "",
                        minBeds: parameters.minBeds.numberValue || 0,
                        maxPrice: parameters.maxPrice.numberValue || 0,
                    };
                    const propertiesResult = await _searchProperties(search_criteria);
                    if (propertiesResult.properties && propertiesResult.properties.length > 0) {
                        fulfillmentText = `I found ${propertiesResult.properties.length} properties matching your criteria in ${search_criteria.location}.`;
                    } else {
                        fulfillmentText = `I couldn't find any properties matching your criteria in ${search_criteria.location}.`;
                    }
                    break;
            }

            res.json({ fulfillmentText });
        } catch (error) {
            console.error("Error processing agent command:", error);
            res.status(500).send("Failed to process agent command.");
        }
    });
});
