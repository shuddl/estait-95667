/**
 * This file contains all the cloud functions for the Estait application.
 *
 * @see https://firebase.google.com/docs/functions/
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as cors from 'cors';
import axios from 'axios';
import { SpeechClient } from '@google-cloud/speech';
import { SessionsClient } from '@google-cloud/dialogflow';

// Initialize Firebase Admin SDK, Speech-to-Text, and Dialogflow clients
admin.initializeApp();
const speechClient = new SpeechClient();
const dialogflowClient = new SessionsClient();

// Initialize CORS handler
const corsHandler = cors({ origin: true });

/**
 * Initiates the Follow Up Boss OAuth 2.0 flow.
 *
 * @param {object} data - The data passed to the function.
 * @param {object} context - The context of the function call.
 * @returns {object} The authorization URL for the Follow Up Boss OAuth 2.0 flow.
 */
export const initiateFollowUpBossOAuth = functions.https.onCall((data, context) => {
  corsHandler(data, context, () => {
    const clientId = functions.config().followupboss.client_id;
    const redirectUri = functions.config().followupboss.redirect_uri;
    const scope = 'people.read'; // Add other scopes as needed
    const state = 'followupboss'; // Use a more secure state in a real app

    const authUrl = `https://app.followupboss.com/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;

    return { authUrl };
  });
});

/**
 * Handles the callback from the Follow Up Boss OAuth 2.0 flow.
 *
 * @param {object} data - The data passed to the function, containing the authorization code.
 * @param {object} context - The context of the function call.
 * @returns {object} A success message if the token exchange is successful.
 */
export const handleFollowUpBossOAuthCallback = functions.https.onCall(async (data, context) => {
  return new Promise((resolve, reject) => {
    corsHandler(data, context, async () => {
      try {
        const { code } = data;
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
        const userId = context.auth.uid;

        // Encrypt tokens before storing
        // For simplicity, we are not encrypting here, but you should in a real app
        await admin.firestore().collection('crm_tokens').doc(`${userId}_followupboss`).set({
          userId,
          crmType: 'followupboss',
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresAt: Date.now() + expires_in * 1000,
        });

        resolve({ success: true });
      } catch (error) {
        console.error('Error handling Follow Up Boss OAuth callback:', error);
        reject(new functions.https.HttpsError('internal', 'Failed to handle OAuth callback.'));
      }
    });
  });
});

/**
 * Initiates the Wise Agent OAuth 2.0 flow.
 *
 * @param {object} data - The data passed to the function.
 * @param {object} context - The context of the function call.
 * @returns {object} The authorization URL for the Wise Agent OAuth 2.0 flow.
 */
export const initiateWiseAgentOAuth = functions.https.onCall((data, context) => {
  corsHandler(data, context, () => {
    const clientId = functions.config().wiseagent.client_id;
    const redirectUri = functions.config().wiseagent.redirect_uri;
    const scope = 'profile contacts'; // Add other scopes as needed
    const state = 'wiseagent'; // Use a more secure state in a real app

    const authUrl = `https://sync.thewiseagent.com/WiseAuth/auth?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;

    return { authUrl };
  });
});

/**
 * Handles the callback from the Wise Agent OAuth 2.0 flow.
 *
 * @param {object} data - The data passed to the function, containing the authorization code.
 * @param {object} context - The context of the function call.
 * @returns {object} A success message if the token exchange is successful.
 */
export const handleWiseAgentOAuthCallback = functions.https.onCall(async (data, context) => {
  return new Promise((resolve, reject) => {
    corsHandler(data, context, async () => {
      try {
        const { code } = data;
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
        const userId = context.auth.uid;

        // Encrypt tokens before storing
        // For simplicity, we are not encrypting here, but you should in a real app
        await admin.firestore().collection('crm_tokens').doc(`${userId}_wiseagent`).set({
          userId,
          crmType: 'wiseagent',
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresAt: new Date(expires_at).getTime(),
        });

        resolve({ success: true });
      } catch (error) {
        console.error('Error handling Wise Agent OAuth callback:', error);
        reject(new functions.https.HttpsError('internal', 'Failed to handle OAuth callback.'));
      }
    });
  });
});

/**
 * Searches for properties using the RealEstateAPI.com.
 *
 * @param {object} data - The data passed to the function, containing the search criteria.
 * @param {object} context - The context of the function call.
 * @returns {object} The search results from the RealEstateAPI.com.
 */
export const searchPropertiesRealEstateAPI = functions.https.onCall(async (data, context) => {
  return new Promise((resolve, reject) => {
    corsHandler(data, context, async () => {
      try {
        const { location, minBeds, maxPrice } = data;
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
        resolve(response.data);
      } catch (error) {
        console.error('Error searching properties:', error);
        reject(new functions.https.HttpsError('internal', 'Failed to search properties.'));
      }
    });
  });
});

/**
 * Gets property details from the RealEstateAPI.com.
 *
 * @param {object} data - The data passed to the function, containing the property ID.
 * @param {object} context - The context of the function call.
 * @returns {object} The property details from the RealEstateAPI.com.
 */
export const getPropertyDetailsRealEstateAPI = functions.https.onCall(async (data, context) => {
  return new Promise((resolve, reject) => {
    corsHandler(data, context, async () => {
      try {
        const { propertyId } = data;
        const apiKey = functions.config().realestateapi.key;
        const response = await axios.get(`https://api.realestateapi.com/v2/properties/${propertyId}/details`, {
          headers: {
            'x-api-key': apiKey,
          },
        });
        resolve(response.data);
      } catch (error) {
        console.error('Error getting property details:', error);
        reject(new functions.https.HttpsError('internal', 'Failed to get property details.'));
      }
    });
  });
});

/**
 * Transcribes audio using the Google Cloud Speech-to-Text API.
 *
 * @param {object} data - The data passed to the function, containing the audio data.
 * @param {object} context - The context of the function call.
 * @returns {object} The transcribed text.
 */
export const transcribeAudio = functions.https.onCall(async (data, context) => {
  return new Promise((resolve, reject) => {
    corsHandler(data, context, async () => {
      try {
        const { audioBytes } = data;
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
          .map(result => result.alternatives[0].transcript)
          .join('\n');
        resolve({ transcription });
      } catch (error) {
        console.error('Error transcribing audio:', error);
        reject(new functions.https.HttpsError('internal', 'Failed to transcribe audio.'));
      }
    });
  });
});

/**
 * Processes agent commands using Dialogflow.
 *
 * @param {object} data - The data passed to the function, containing the command text and session ID.
 * @param {object} context - The context of the function call.
 * @returns {object} The fulfillment text from Dialogflow.
 */
export const processAgentCommand = functions.https.onCall(async (data, context) => {
  return new Promise((resolve, reject) => {
    corsHandler(data, context, async () => {
      try {
        const { commandText, sessionId } = data;
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
        
        // Handle different intents and orchestrate actions
        // ...

        resolve({ fulfillmentText: result.fulfillmentText });
      } catch (error) {
        console.error('Error processing agent command:', error);
        reject(new functions.https.HttpsError('internal', 'Failed to process agent command.'));
      }
    });
  });
});
