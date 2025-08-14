
/**
 * This file contains all the cloud functions for the Estait application.
 *
 * @see https://firebase.google.com/docs/functions/
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';
import { SpeechClient } from '@google-cloud/speech';
import { SessionsClient } from '@google-cloud/dialogflow';
import { encrypt, decrypt } from './lib/security';
import { v4 as uuidv4 } from 'uuid';
import { corsMiddleware } from './lib/cors';

// Initialize Firebase Admin SDK, Speech-to-Text, and Dialogflow clients
admin.initializeApp();
const speechClient = new SpeechClient();
const dialogflowClient = new SessionsClient();

/**
 * Initiates the Follow Up Boss OAuth 2.0 flow.
 */
export const initiateFollowUpBossOAuth = functions.https.onRequest((req, res) => {
    corsMiddleware(req, res, () => {
        try {
            const clientId = functions.config().followupboss.client_id;
            const redirectUri = functions.config().followupboss.redirect_uri;
            const scope = 'people.read'; // Add other scopes as needed
            const state = `followupboss_${uuidv4()}`;

            const authUrl = `https://app.followupboss.com/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;
            
            res.json({ authUrl });
        } catch (error) {
            console.error('Error initiating Follow Up Boss OAuth:', error);
            res.status(500).send('Failed to initiate Follow Up Boss OAuth.');
        }
    });
});

/**
 * Handles the callback from the Follow Up Boss OAuth 2.0 flow.
 */
export const handleFollowUpBossOAuthCallback = functions.https.onRequest(async (req, res) => {
    corsMiddleware(req, res, async () => {
        try {
            const { code } = req.body.data;
            const clientId = functions.config().followupboss.client_id;
            const clientSecret = functions.config().followupboss.client_secret;
            const redirectUri = functions.config().followupboss.redirect_uri;
    
            const response = await axios.post('https://app.followupboss.com/oauth/token', {
                grant_type: 'authorization_code',
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
            });
    
            const { access_token, refresh_token, expires_in } = response.data;
            const userId = req.body.data.auth.uid;
    
            await admin.firestore().collection('crm_tokens').doc(`${userId}_followupboss`).set({
                userId,
                crmType: 'followupboss',
                accessToken: encrypt(access_token),
                refreshToken: encrypt(refresh_token),
                expiresAt: Date.now() + expires_in * 1000,
            });
    
            res.json({ success: true });
        } catch (error) {
            console.error('Error handling Follow Up Boss OAuth callback:', error);
            res.status(500).send('Failed to handle Follow Up Boss OAuth callback.');
        }
    });
});

/**
 * Initiates the Wise Agent OAuth 2.0 flow.
 */
export const initiateWiseAgentOAuth = functions.https.onRequest((req, res) => {
    corsMiddleware(req, res, () => {
        try {
            const clientId = functions.config().wiseagent.client_id;
            const redirectUri = functions.config().wiseagent.redirect_uri;
            const scope = 'profile contacts'; // Add other scopes as needed
            const state = `wiseagent_${uuidv4()}`;

            const authUrl = `https://sync.thewiseagent.com/WiseAuth/auth?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;

            res.json({ authUrl });
        } catch(error) {
            console.error('Error initiating Wise Agent OAuth:', error);
            res.status(500).send('Failed to initiate Wise Agent OAuth.');
        }
    });
});

/**
 * Handles the callback from the Wise Agent OAuth 2.0 flow.
 */
export const handleWiseAgentOAuthCallback = functions.https.onRequest(async (req, res) => {
    corsMiddleware(req, res, async () => {
        try {
            const { code } = req.body.data;
            const clientId = functions.config().wiseagent.client_id;
            const clientSecret = functions.config().wiseagent.client_secret;
            const redirectUri = functions.config().wiseagent.redirect_uri;
    
            const response = await axios.post('https://sync.thewiseagent.com/WiseAuth/token', {
                client_id: clientId,
                client_secret: clientSecret,
                code,
                grant_type: 'authorization_code',
            });
    
            const { access_token, refresh_token, expires_at } = response.data;
            const userId = req.body.data.auth.uid;
    
            await admin.firestore().collection('crm_tokens').doc(`${userId}_wiseagent`).set({
                userId,
                crmType: 'wiseagent',
                accessToken: encrypt(access_token),
                refreshToken: encrypt(refresh_token),
                expiresAt: new Date(expires_at).getTime(),
            });
    
            res.json({ success: true });
        } catch (error) {
            console.error('Error handling Wise Agent OAuth callback:', error);
            res.status(500).send('Failed to handle Wise Agent OAuth callback.');
        }
    });
});

/**
 * Adds a new contact to Wise Agent.
 */
export const addWiseAgentContact = functions.https.onRequest(async (req, res) => {
    corsMiddleware(req, res, async () => {
        try {
            const { contact_details } = req.body.data;
            const userId = req.body.data.auth.uid;

            const tokenDoc = await admin.firestore().collection('crm_tokens').doc(`${userId}_wiseagent`).get();
            if (!tokenDoc.exists || !tokenDoc.data()) {
                res.status(400).send('Wise Agent CRM not connected.');
                return;
            }
            const accessToken = decrypt(tokenDoc.data()?.accessToken);

            await axios.post('https://api.wiseagent.com/v2/contacts/add_new_contact', {
                Method: 'add_new_contact',
                AuthToken: accessToken,
                ...contact_details
            });

            res.json({ success: true });
        } catch (error) {
            console.error('Error adding Wise Agent contact:', error);
            res.status(500).send('Failed to add Wise Agent contact.');
        }
    });
});

/**
 * Adds a new task to Wise Agent.
 */
export const addWiseAgentTask = functions.https.onRequest(async (req, res) => {
    corsMiddleware(req, res, async () => {
        try {
            const { task_details } = req.body.data;
            const userId = req.body.data.auth.uid;

            const tokenDoc = await admin.firestore().collection('crm_tokens').doc(`${userId}_wiseagent`).get();
            if (!tokenDoc.exists || !tokenDoc.data()) {
                res.status(400).send('Wise Agent CRM not connected.');
                return;
            }
            const accessToken = decrypt(tokenDoc.data()?.accessToken);

            await axios.post('https://api.wiseagent.com/v2/tasks/add_new_task', {
                Method: 'add_new_task',
                AuthToken: accessToken,
                ...task_details
            });

            res.json({ success: true });
        } catch (error) {
            console.error('Error adding Wise Agent task:', error);
            res.status(500).send('Failed to add Wise Agent task.');
        }
    });
});

/**
 * Searches for properties using the RealEstateAPI.com.
 */
export const searchPropertiesRealEstateAPI = functions.https.onRequest(async (req, res) => {
    corsMiddleware(req, res, async () => {
        try {
            const { location, minBeds, maxPrice } = req.body.data;
            const apiKey = functions.config().realestateapi.key;
            const response = await axios.get('https://api.realestateapi.com/v2/properties/search', {
                params: {
                    location,
                    minBeds,
                    maxPrice,
                },
                headers: {
                    'x-api-key': apiKey,
                },
            });
            res.json(response.data);
        } catch (error) {
            console.error('Error searching properties:', error);
            res.status(500).send('Failed to search properties.');
        }
    });
});

/**
 * Gets property details from the RealEstateAPI.com.
 */
export const getPropertyDetailsRealEstateAPI = functions.https.onRequest(async (req, res) => {
    corsMiddleware(req, res, async () => {
        try {
            const { propertyId } = req.body.data;
            const apiKey = functions.config().realestateapi.key;
            const response = await axios.get(`https://api.realestateapi.com/v2/properties/${propertyId}/details`, {
                headers: {
                    'x-api-key': apiKey,
                },
            });
            res.json(response.data);
        } catch (error) {
            console.error('Error getting property details:', error);
            res.status(500).send('Failed to get property details.');
        }
    });
});

/**
 * Transcribes audio using the Google Cloud Speech-to-Text API.
 */
export const transcribeAudio = functions.https.onRequest(async (req, res) => {
    corsMiddleware(req, res, async () => {
        try {
            const { audioBytes } = req.body.data;
            const audio = {
                content: audioBytes,
            };
            const config = {
                encoding: 'LINEAR16',
                sampleRateHertz: 16000,
                languageCode: 'en-US',
            };
            const request = {
                audio: audio,
                config: config,
            };
    
            const [response] = await speechClient.recognize(request);
            const transcription = response.results
                ?.map(result => result.alternatives?.[0].transcript)
                .join('\n');
            res.json({ transcription });
        } catch (error) {
            console.error('Error transcribing audio:', error);
            res.status(500).send('Failed to transcribe audio.');
        }
    });
});

/**
 * Gets recent contacts from Wise Agent.
 */
export const getWiseAgentContacts = functions.https.onRequest(async (req, res) => {
    corsMiddleware(req, res, async () => {
        try {
            const userId = req.body.data.auth.uid;

            const tokenDoc = await admin.firestore().collection('crm_tokens').doc(`${userId}_wiseagent`).get();
            if (!tokenDoc.exists || !tokenDoc.data()) {
                res.status(400).send('Wise Agent CRM not connected.');
                return;
            }
            const accessToken = decrypt(tokenDoc.data()?.accessToken);

            const response = await axios.post('https://api.wiseagent.com/v2/contacts/get_contacts', {
                Method: 'get_contacts',
                AuthToken: accessToken,
                limit: 5
            });

            res.json(response.data);
        } catch (error) {
            console.error('Error getting Wise Agent contacts:', error);
            res.status(500).send('Failed to get Wise Agent contacts.');
        }
    });
});


/**
 * Processes agent commands using Dialogflow.
 */
export const processAgentCommand = functions.https.onRequest(async (req, res) => {
    corsMiddleware(req, res, async () => {
        try {
            const { commandText, sessionId } = req.body.data;
            const projectId = functions.config().dialogflow.project_id;
            const sessionPath = dialogflowClient.projectAgentSessionPath(projectId, sessionId);
    
            const request = {
                session: sessionPath,
                queryInput: {
                    text: {
                        text: commandText,
                        languageCode: 'en-US',
                    },
                },
            };
    
            const [response] = await dialogflowClient.detectIntent(request);
            const result = response.queryResult;
            const intentName = result.intent.displayName;
            const parameters = result.parameters.fields;

            let fulfillmentText = result.fulfillmentText;

            switch (intentName) {
                case 'add_lead_intent':
                    const contact_details = {
                        first_name: parameters.first_name.stringValue,
                        last_name: parameters.last_name.stringValue,
                        email_address: parameters.email_address.stringValue,
                        phone_number: parameters.phone_number.stringValue,
                    };
                    await addWiseAgentContact({ body: { data: { contact_details, auth: req.body.data.auth } } } as any, res);
                    fulfillmentText = `I've added ${contact_details.first_name} ${contact_details.last_name} to your Wise Agent contacts.`;
                    break;
                
                case 'create_task_intent':
                    const task_details = {
                        description: parameters.description.stringValue,
                        due_date: parameters.due_date.stringValue,
                    };
                    await addWiseAgentTask({ body: { data: { task_details, auth: req.body.data.auth } } } as any, res);
                    fulfillmentText = `I've created a new task in Wise Agent: "${task_details.description}".`;
                    break;

                case 'search_property_intent':
                    const search_criteria = {
                        location: parameters.location.stringValue,
                        minBeds: parameters.minBeds.numberValue,
                        maxPrice: parameters.maxPrice.numberValue,
                    };
                    const properties = await searchPropertiesRealEstateAPI({ body: { data: search_criteria } } as any, res);
                    if (properties.properties && properties.properties.length > 0) {
                        fulfillmentText = `I found ${properties.properties.length} properties matching your criteria in ${search_criteria.location}. You can view them on the property search page.`;
                    } else {
                        fulfillmentText = `I couldn't find any properties matching your criteria in ${search_criteria.location}.`;
                    }
                    break;
            }

            res.json({ fulfillmentText });
        } catch (error) {
            console.error('Error processing agent command:', error);
            res.status(500).send('Failed to process agent command.');
        }
    });
});
