Estait: Comprehensive Product Requirements Document & Gemini Agent Master Instruction Set

1. Overall Vision & Core Principles for Gemini Agent

Estait Vision: To provide a unified, mobile-first conversational AI layer that simplifies real estate agent workflows by integrating with existing CRM and MLS systems via natural language.
Core Principles for Gemini Agent Interaction:
Modularity: Each prompt should focus on a single, well-defined task (e.g., "create a specific function," "design a specific UI component").
Explicitness: Be as precise as possible about file names, directory structures, function signatures, data structures, and UI elements.
Iterative Build: We will build Estait piece by piece, validating each component before moving to the next.
Security First: Emphasize secure practices (server-side token handling, environment variables, Firestore security rules).
Error Handling & Logging: Always request robust error handling and detailed logging.
Mobile-First Design: Ensure all UI components are responsive and optimized for mobile devices.
2. Project Setup & Foundational Structure

This is the very first step in Firebase Studio.
Phase Goal: Initialize the Firebase Studio workspace with the correct technology stack for Estait. Firebase Services Involved: Firebase Studio, Implicitly Firebase Hosting (for the web app).
Instructions for Gemini Agent (Initial Firebase Studio Workspace Creation):
Select "Next.js" Template.
Configure the Template Options as follows:
Language: TypeScript
Use a src/ dir?: Yes
Use ESLint?: Yes
Use App Router?: Yes
Use Tailwind?: Yes
Expected Output: A new Next.js project structure within Firebase Studio with src/app directory, tailwind.config.ts , tsconfig.json , eslint.config.js , etc.
Key Considerations: This sets the stage. Ensure the workspace loads correctly.
3. Core Application Structure & User Management

Phase Goal: Establish the basic Estait web application, implement user authentication, and define the global color scheme. Firebase Services Involved: Firebase Authentication, Cloud Firestore (for user profiles), Firebase Hosting.
Detailed Requirements:
App Name: "Estait"
UI: Clean, modern, mobile-first, optimized for touchscreens.
Branding Colors:
Primary: Asparagus green ( #98BF64 )
Secondary: Light parchment ( #F5EBCD )
Accents/Interactive: Marigold ( #FFB833 )
Authentication: Email/password sign-up and login.
Post-Login Redirect: To a simple dashboard or home screen.
User Profile Storage: Basic user data (e.g., UID, email) in Firestore.
Instructions for Gemini Agent (Prompt Sequence):
Prompt 1 (App Setup & Authentication):
Create a mobile-first web application for real estate agents named "Estait" using the current Next.js (TypeScript, App Router, src dir, ESLint, Tailwind) setup.
The app should have a clean, modern UI designed for touchscreens, optimized for smartphones.
Implement a robust user authentication system using Firebase Authentication with email/password sign-up and login pages.
After successful login, users should be redirected to a new "dashboard" page (`/dashboard`).
Define the global color palette using Tailwind CSS: primary color Asparagus green (#98BF64), secondary Light parchment (#F5EBCD), and accent/interactive Marigold (#FFB833). Apply these colors subtly throughout the initial UI.
Store a basic user profile (Firebase UID, email) in a Cloud Firestore collection named `users` upon successful sign-up.
 Expand 
Prompt 2 (Basic Dashboard):
Create a simple placeholder dashboard page at `/dashboard`. It should prominently display a welcome message, e.g., "Welcome, [User Email]!". Ensure this page is protected by Firebase Authentication, meaning only logged-in users can access it.
Expected Output:
src/app/layout.tsx : Global layout with basic styling, FirebaseApp initialization.
src/app/signup/page.tsx : Sign-up UI using Firebase Auth.
src/app/login/page.tsx : Login UI using Firebase Auth.
src/app/dashboard/page.tsx : Protected dashboard UI.
src/lib/firebase/firebase.ts : Firebase client-side SDK initialization.
src/lib/firebase/auth.ts : Functions for sign-up, login, logout.
src/lib/firebase/firestore.ts : Functions for user profile creation in Firestore.
Updated tailwind.config.ts with custom colors.
Key Considerations:
Verify authentication flow works (sign-up, login, logout).
Check Firestore for new user documents after sign-up.
Ensure dashboard protection.
4. CRM Integration (Wise Agent & Follow Up Boss)

Phase Goal: Enable secure OAuth 2.0 integration with Wise Agent and Follow Up Boss, handling token management server-side. Firebase Services Involved: Firebase Authentication, Cloud Functions for Firebase, Cloud Firestore.
Detailed Requirements:
UI: "Connect CRM" section on dashboard with options for "Connect Follow Up Boss" and "Connect Wise Agent."
OAuth Flow: Initiate OAuth from client, handle redirection to CRM for authorization.
Server-Side Token Exchange: Crucially, the exchange of authorization code for access/refresh tokens MUST occur in a secure Firebase Cloud Function.
Token Storage: Encrypted access_token and refresh_token stored in Cloud Firestore, linked to the users collection or a dedicated crm_integrations collection. Tokens must be retrievable only by Cloud Functions.
Onboarding UI Feedback: Clear messages during connection process (e.g., "Redirecting...", "Connecting...", "Success!", "Error!").
Error Handling: Robust error handling for OAuth failures, API calls, and secure logging to Cloud Logging.
Instructions for Gemini Agent (Prompt Sequence):
Prompt 3 (CRM Selection UI):
On the `/dashboard` page, add a "Connect CRM" section. This section should prominently display two buttons: one for "Connect Follow Up Boss" and another for "Connect Wise Agent".
When either button is clicked, show a temporary loading spinner or message like "Initiating connection..." below the button.
Prompt 4 (Firebase Utils for CRM):
Create a new TypeScript utility file at `src/lib/firebase/crmApiUtils.ts`. This file will contain functions for making secure API calls to CRM services.
Specifically, include an asynchronous function `makeCrmApiCall(crmName: string, endpoint: string, method: string, data?: any)` that takes the CRM name, API endpoint, HTTP method, and optional data. This function will internally call a new Firebase Cloud Function to perform the actual secure API request.
Also, create another utility file `src/lib/firebase/tokenManagement.ts` with functions to securely store and retrieve encrypted CRM tokens in Cloud Firestore. Ensure these functions are designed to be used primarily by Cloud Functions.
 Expand 
Prompt 5 (Follow Up Boss OAuth Function - Phase 1: Initiation):
Create a new Firebase Cloud Function (HTTPS callable) named `initiateFollowUpBossOAuth`.
This function should be triggered by the client-side `Connect Follow Up Boss` button.
It should construct the correct Follow Up Boss OAuth authorization URL (you can use a placeholder for `client_id`, `redirect_uri`, `scope`, and `state` parameters, and specify that these should be environment variables later).
The function should return this authorization URL to the client.
 Expand 
Prompt 6 (Follow Up Boss OAuth Function - Phase 2: Callback & Token Exchange):
Create another Firebase Cloud Function (HTTPS callable) named `handleFollowUpBossOAuthCallback`. This function will receive the authorization code after the user grants access to Follow Up Boss.
This function MUST securely exchange the authorization code for an `access_token` and `refresh_token` with the Follow Up Boss OAuth token endpoint.
After successful token exchange, encrypt these tokens and store them securely in a Cloud Firestore collection named `crm_tokens` under a document ID corresponding to the authenticated Estait user's UID. Each document in `crm_tokens` should have fields like `userId`, `crmType` (e.g., 'followupboss'), `accessToken`, `refreshToken`, `expiresAt`.
Ensure proper error handling, logging to Cloud Logging for success and failure, and that client secrets are stored as environment variables.
 Expand 
Prompt 7 (Wise Agent OAuth Function - Phase 1: Initiation):
Create a new Firebase Cloud Function (HTTPS callable) named `initiateWiseAgentOAuth`.
This function should be triggered by the client-side `Connect Wise Agent` button.
It should construct the Wise Agent OAuth authorization URL. Use placeholder environment variables for `client_id`, `redirect_uri`, `scope`, and `state`.
The function should return this authorization URL to the client.
 Expand 
Prompt 8 (Wise Agent OAuth Function - Phase 2: Callback & Token Exchange):
Create another Firebase Cloud Function (HTTPS callable) named `handleWiseAgentOAuthCallback`. This function will receive the authorization code after the user grants access to Wise Agent.
This function MUST securely exchange the authorization code for an `access_token` and `refresh_token` with the Wise Agent OAuth token endpoint.
After successful token exchange, encrypt these tokens and store them securely in the `crm_tokens` Cloud Firestore collection, under a document ID corresponding to the authenticated Estait user's UID. Use fields like `userId`, `crmType` ('wiseagent'), `accessToken`, `refreshToken`, `expiresAt`.
Ensure proper error handling, logging to Cloud Logging for success and failure, and that client secrets are stored as environment variables.
 Expand 
Prompt 9 (Client-Side OAuth Flow Orchestration):
Update the client-side `Connect Follow Up Boss` and `Connect Wise Agent` buttons on the `/dashboard` page.
When clicked, they should:
1. Call the respective `initiateCrmOAuth` Cloud Function to get the authorization URL.
2. Redirect the user's browser to this URL.
3. After the redirect back to Estait, handle the received authorization code by calling the respective `handleCrmOAuthCallback` Cloud Function.
4. Provide real-time UI feedback (loading states, success/error messages using the accent color). Use Cloud Firestore listeners to update the UI based on the `crm_tokens` status for the current user.
 Expand 
Expected Output:
src/app/dashboard/page.tsx : Updated with CRM connection buttons and UI feedback logic.
src/lib/firebase/crmApiUtils.ts : Utility functions.
src/lib/firebase/tokenManagement.ts : Utility functions for token storage/retrieval (used by Cloud Functions).
firebase/functions/src/index.ts (or similar):
initiateFollowUpBossOAuth (HTTPS Callable Cloud Function).
handleFollowUpBossOAuthCallback (HTTPS Callable Cloud Function).
initiateWiseAgentOAuth (HTTPS Callable Cloud Function).
handleWiseAgentOAuthCallback (HTTPS Callable Cloud Function).
Firestore security rules for crm_tokens collection allowing read/write only by the associated user's UID (for UI feedback) and specifically by Cloud Functions (for secure token storage).
Key Considerations:
Environment Variables: You'll need to manually set up the CLIENT_ID , CLIENT_SECRET , REDIRECT_URI for both CRMs in your Firebase Functions environment after they are generated.
Encryption: The agent might generate a basic storage. You should ensure the encryption method for tokens in Firestore is robust.
Testing: Thoroughly test the OAuth flow for both CRMs. This is critical.
5. Wise Agent API Documentation Integration (Detailed)

This section explicitly uses the provided Wise Agent API documentation to instruct the Gemini agent.
Provided Wise Agent Documentation Snippet Analysis:
Base URL: Not explicitly provided, but typically https://api.wiseagent.com/ or similar. (You'd substitute your real base URL here).
Authentication: Assumed to be via the stored OAuth tokens.
API Calls for Lead/Contact & Task Management: The snippets define add_new_contact and add_new_task .
Detailed Requirements:
Add Contact Function: A Cloud Function endpoint to add a new contact to Wise Agent based on chat input.
Add Task Function: A Cloud Function endpoint to add a new task to Wise Agent.
Secure API Calls: All calls to Wise Agent API must be made from Cloud Functions using the stored OAuth access_token .
Instructions for Gemini Agent (Prompt Sequence):
Prompt 10 (Wise Agent - Add New Contact Function):
Create a new Firebase Cloud Function (HTTPS Callable) named `addWiseAgentContact`.
This function will receive `contact_details` (an object containing fields like `first_name`, `last_name`, `email_address`, `phone_number`, etc., as per Wise Agent documentation).
Within this function:
1. Retrieve the authenticated user's Wise Agent `access_token` from the `crm_tokens` Firestore collection. Ensure secure retrieval.
2. Make an HTTP POST request to the Wise Agent API endpoint for adding new contacts (assume `/v2/contacts/add_new_contact` for now, but allow for configuration as an environment variable).
3. The request body should be a JSON object mapping the `contact_details` to the Wise Agent API's expected format. Ensure `Method` is 'add_new_contact', `AuthToken` is the retrieved access token, and all other provided contact fields are included.
4. Handle success and failure responses from the Wise Agent API. Log the outcome to Cloud Logging.
5. Return a success/failure message to the client.
 Expand 
Reference from your provided Wise Agent Docs:
"Method": "add_new_contact",
"AuthToken": "xxxxxx",
"first_name": "xxxxxx",
"last_name": "xxxxxx",
"email_address": "xxxxxx",
"phone_number": "xxxxxx",
"mobile_phone": "xxxxxx",
"work_phone": "xxxxxx",
"fax_number": "xxxxxx",
"mailing_address_1": "xxxxxx",
"mailing_address_2": "xxxxxx",
"city": "xxxxxx",
"state": "xxxxxx",
"zip_code": "xxxxxx",
"source": "xxxxxx",
"category": "xxxxxx",
"send_to_wiseagent": "xxxxxx",
"website": "xxxxxx",
"birth_date": "xxxxxx",
"property_address_1": "xxxxxx",
"property_address_2": "xxxxxx",
"property_city": "xxxxxx",
"property_state": "xxxxxx",
"property_zip_code": "xxxxxx",
"referred_by": "xxxxxx",
"street_number": "xxxxxx",
"street_name": "xxxxxx",
"unit_number": "xxxxxx",
"direction": "xxxxxx",
"notes": "xxxxxx",
"lead_score": "xxxxxx",
"next_call_date": "xxxxxx",
"type": "xxxxxx",
"email_signature": "xxxxxx",
"agent_email_signature": "xxxxxx",
"property_street_number": "xxxxxx",
"property_street_name": "xxxxxx",
"property_unit_number": "xxxxxx",
"property_direction": "xxxxxx"
 Expand 
Prompt 11 (Wise Agent - Add New Task Function):
Create a new Firebase Cloud Function (HTTPS Callable) named `addWiseAgentTask`.
This function will receive `task_details` (an object containing fields like `contact_id`, `description`, `due_date`, `time`, `category`, `status`, etc., as per Wise Agent documentation).
Within this function:
1. Retrieve the authenticated user's Wise Agent `access_token` from the `crm_tokens` Firestore collection.
2. Make an HTTP POST request to the Wise Agent API endpoint for adding new tasks (assume `/v2/tasks/add_new_task` for now, but allow for configuration as an environment variable).
3. The request body should be a JSON object mapping the `task_details` to the Wise Agent API's expected format. Ensure `Method` is 'add_new_task', `AuthToken` is the retrieved access token, and all other provided task fields are included.
4. Handle success and failure responses from the Wise Agent API. Log the outcome to Cloud Logging.
5. Return a success/failure message to the client.
 Expand 
Reference from your provided Wise Agent Docs:
"Method": "add_new_task",
"AuthToken": "xxxxxx",
"contact_id": "xxxxxx",
"contact_name": "xxxxxx",
"category": "xxxxxx",
"description": "xxxxxx",
"due_date": "xxxxxx",
"time": "xxxxxx",
"status": "xxxxxx",
"priority": "xxxxxx",
"percentage_complete": "xxxxxx",
"repeat_interval": "xxxxxx",
"next_due_date": "xxxxxx",
"assigned_to": "xxxxxx"
 Expand 
Expected Output:
firebase/functions/src/index.ts : New Cloud Functions addWiseAgentContact and addWiseAgentTask .
Code within these functions correctly making HTTP POST requests to the Wise Agent API, handling authentication, and parsing responses.
Key Considerations:
You will need to ensure the actual API base URLs are correctly configured in your Cloud Functions (likely as environment variables).
The agent might need slight nudges if the API structure isn't perfectly clear from the prompt. Be ready to refine the generated function bodies.
6. RealEstateAPI.com Integration (Conceptual)

Phase Goal: Implement a secure integration to fetch property data from realestateapi.com . Firebase Services Involved: Cloud Functions for Firebase, Cloud Storage for Firebase, Cloud Firestore.
Detailed Requirements:
Secure API Calls: All calls to realestateapi.com must be from a Firebase Cloud Function. API key stored as an environment variable.
Property Search: Function to query properties based on location, beds, baths, price, etc.
Image Storage/Optimization: Optionally cache property images in Cloud Storage for faster delivery.
Data Mapping: Map realestateapi.com response to Estait's internal Property data model.
Instructions for Gemini Agent (Prompt Sequence):
Prompt 12 (RealEstateAPI.com Search Function):
Create a new Firebase Cloud Function (HTTPS Callable) named `searchPropertiesRealEstateAPI`.
This function will receive `search_criteria` (an object with fields like `location`, `minBeds`, `maxPrice`, etc.).
Within this function:
1. Make an HTTP GET request to the `realestateapi.com` search endpoint (e.g., `https://api.realestateapi.com/v2/properties/search`).
2. Authenticate using an API key stored as an environment variable (`REAL_ESTATE_API_KEY`).
3. Map `search_criteria` to the API's query parameters.
4. Parse the JSON response. Extract key property details like `id`, `address`, `beds`, `baths`, `sqFt`, `price`, `thumbnailUrl`, `allImageUrls`, and `description`.
5. Return an array of these structured property objects to the client.
6. Implement robust error handling (e.g., API errors, network issues) and detailed logging to Cloud Logging.
 Expand 
Prompt 13 (RealEstateAPI.com Property Detail Function):
Create a new Firebase Cloud Function (HTTPS Callable) named `getPropertyDetailsRealEstateAPI`.
This function will receive a `propertyId`.
Within this function:
1. Make an HTTP GET request to the `realestateapi.com` property details endpoint (e.g., `https://api.realestateapi.com/v2/properties/{propertyId}/details`).
2. Authenticate using the `REAL_ESTATE_API_KEY` environment variable.
3. Extract comprehensive details, including all image URLs.
4. Return the detailed property object.
5. Implement robust error handling and detailed logging.
 Expand 
Expected Output:
firebase/functions/src/index.ts : New Cloud Functions searchPropertiesRealEstateAPI and getPropertyDetailsRealEstateAPI .
Code within these functions correctly making HTTP GET requests, handling authentication, and parsing responses.
Key Considerations:
API Key: Remember to set REAL_ESTATE_API_KEY in your Cloud Functions environment after generation.
Response Parsing: You may need to guide the agent on the exact JSON path for fields if the initial attempt isn't perfect.
7. Natural Language Processing (NLP) Layer

Phase Goal: Process agent text/voice commands to identify intent and extract entities, then orchestrate actions with CRMs and MLS. Firebase Services Involved: Firebase Cloud Functions, Google Cloud's Dialogflow, Google Cloud's Vertex AI (optional for complex GenAI tasks).
Detailed Requirements:
Input: Text (from chat input or transcribed voice).
Intent Recognition: Use Dialogflow to identify user intent (e.g., add_lead , search_property , create_task ).
Entity Extraction: Extract key data points (e.g., lead name, property criteria, task details).
Orchestration: Call appropriate Firebase Cloud Functions based on intent (e.g., addWiseAgentContact , searchPropertiesRealEstateAPI ).
Response Generation: Generate conversational text responses back to the user.
Voice Transcription: Integrate Google Cloud Speech-to-Text for voice input.
Instructions for Gemini Agent (Prompt Sequence):
Prompt 14 (Voice Transcription Cloud Function):
Create a new Firebase Cloud Function (HTTPS Callable) named `transcribeAudio`.
This function will receive raw audio data (e.g., as a base64 encoded string or similar).
It should use the Google Cloud Speech-to-Text API to transcribe the audio into text.
Return the transcribed text to the client. Implement robust error handling and logging for transcription failures.
 Expand 
Prompt 15 (Main NLP Orchestration Cloud Function):
Create the core Firebase Cloud Function (HTTPS Callable) named `processAgentCommand`.
This function will receive a `command_text` string (either typed or transcribed).
Within this function:
1. Integrate with a Google Cloud Dialogflow agent (specify `projectId` and `agentId` as environment variables). Send the `command_text` to Dialogflow for intent and entity detection.
2. Based on the detected Dialogflow intent:
    *   If `add_lead_intent`: Call `addWiseAgentContact` (or relevant Follow Up Boss function, if detected as active CRM) with extracted lead details.
    *   If `search_property_intent`: Call `searchPropertiesRealEstateAPI` with extracted property criteria.
    *   If `create_task_intent`: Call `addWiseAgentTask` (or relevant Follow Up Boss function) with extracted task details.
    *   For other intents, provide a generic text response.
3. Return a conversational text response to the client based on the action taken or a generated response from Dialogflow.
4. Implement comprehensive error handling and logging for Dialogflow interaction, sub-function calls, and response generation.
 Expand 
Prompt 16 (Client-Side Chat Integration with NLP):
On the dashboard, refine the chat input and microphone functionality.
When text is entered (typed or from `transcribeAudio` output), send it to the `processAgentCommand` Cloud Function.
Display the user's input in a distinct chat bubble.
Display the response from `processAgentCommand` in Estait's own chat bubble.
Implement scrolling to keep the latest messages in view.
 Expand 
Expected Output:
firebase/functions/src/index.ts : New Cloud Functions transcribeAudio and processAgentCommand .
src/app/dashboard/page.tsx : Updated with full chat UI logic, integration with new Cloud Functions.
Key Considerations:
Dialogflow Agent: You'll need to create and train a Dialogflow agent separately in the Google Cloud Console with your desired intents and entities. Firebase Studio won't do this.
Environment Variables: Set up Dialogflow projectId and agentId in your Cloud Functions.
8. Data Models & Firestore Usage

Phase Goal: Define the primary data structures for Estait's internal data and ensure secure, efficient storage. Firebase Services Involved: Cloud Firestore.
Detailed Requirements:
User Profiles: (Already handled in Section 3)
CRM Tokens: (Already handled in Section 4)
Conversation History: Store agent commands and Estait's responses for context.
Saved Searches: Allow agents to save property search criteria.
Estait-Specific Tasks/Notes: For items not yet synced to a CRM.
Instructions for Gemini Agent (Prompt Sequence):
Prompt 17 (Firestore Data Models & Security Rules):
Define and implement the following Cloud Firestore collections and their initial security rules:
1.  `users`: (already exists, ensure it remains secure, users can only read/write their own profile data).
2.  `crm_tokens`: (already exists, ensure secure read/write by Cloud Functions and read-only by authenticated user for UI display).
3.  `conversations`: Store chat messages. Each document should represent a user's conversation session, containing an array of message objects (e.g., `{ sender: 'user' | 'estait', text: string, timestamp: Timestamp }`). Security rules: only the owner can read/write their own conversations.
4.  `saved_searches`: Store property search criteria saved by agents. Each document should contain `userId`, `name`, `criteria` (object, e.g., `{ location: 'Austin', minBeds: 3 }`). Security rules: owner can read/write.
5.  `local_tasks`: Store tasks that are specific to Estait or awaiting CRM sync. Each document should contain `userId`, `description`, `dueDate`, `status`. Security rules: owner can read/write.

Ensure all these collections have security rules that restrict access to the authenticated user's own data.
 Expand 
Prompt 18 (Firestore Integration for Conversation History):
Update the `processAgentCommand` Cloud Function and the client-side chat UI.
After processing each user command and generating Estait's response, append both the user's message and Estait's response to the current user's conversation history in the `conversations` Firestore collection.
The client-side chat UI should also listen in real-time to the `conversations` collection to display past messages in the chat window, enabling context.
 Expand 
Expected Output:
Updated Firestore security rules ( firestore.rules ).
New conversations , saved_searches , local_tasks collections schema.
processAgentCommand updated to write to conversations .
Client-side chat UI updated to read/write to conversations .
Key Considerations:
Firestore security rules are paramount. Double-check them manually.
9. User Interface & Experience Refinements

Phase Goal: Enhance the app's visual appeal and usability for key workflows. Firebase Services Involved: Firebase Hosting (for serving the optimized UI).
Detailed Requirements:
Property Display: Rich, interactive display of search results and property details (swipeable photos).
Onboarding Flow: Polished, animated transitions, clear progress indicators.
Error Messages: User-friendly, actionable error messages with Estait branding.
Loading States: Consistent loading indicators for all async operations.
Instructions for Gemini Agent (Prompt Sequence):
Prompt 19 (Property Search Results Display):
Create a new page/component at `/properties/search-results` to display the results from `searchPropertiesRealEstateAPI`.
This page should show a grid or list of property cards, each displaying:
- A prominent image (from `thumbnailUrl`).
- Address, price, beds/baths/sqFt.
- Use the accent color (`#FFB833`) for price.
Each card should be tappable, leading to a detailed property view.
 Expand 
Prompt 20 (Detailed Property View with Swipeable Gallery):
Create a new page/component at `/properties/[id]` to display detailed property information when a property card is tapped.
This page should feature a prominent, swipeable high-resolution photo gallery at the top (using `allImageUrls`).
Below the gallery, display comprehensive property details: full address, beds/baths, square footage, lot size, year built, description, and key features.
Include a clear "Share to Client" button using the accent color.
 Expand 
Prompt 21 (Loading & Error States Everywhere):
Review all client-side interactions that involve calls to Cloud Functions or external APIs (e.g., authentication, CRM connection, NLP commands, property search).
For each interaction, implement a visible loading indicator (spinner or skeleton screen) while the operation is in progress.
Also, display user-friendly error messages using the accent color (`#FFB833`) if an operation fails. These error messages should be clear and suggest a next step where possible.
 Expand 
Expected Output:
New React/Next.js components for property search results and detail view.
Enhanced UI for all interactive elements with loading and error states.
10. Monitoring & Optimization

Phase Goal: Integrate tools for performance monitoring, crash reporting, and user analytics. Firebase Services Involved: Firebase Crashlytics, Firebase Performance Monitoring, Google Analytics for Firebase.
Instructions for Gemini Agent (Prompt Sequence):
Prompt 22 (Integrate Analytics & Monitoring SDKs):
Integrate Firebase Crashlytics, Firebase Performance Monitoring, and Google Analytics for Firebase into the Estait application.
Ensure the necessary SDKs are initialized according to Firebase's recommendations for a Next.js web application.
Provide guidance on how to enable these services in the Firebase console and how to view collected data.
 Expand 
Prompt 23 (Basic Custom Analytics Events):
Add tracking for a few key custom events to Google Analytics for Firebase:
- `crm_connected`: Triggered when an agent successfully connects a CRM.
- `command_processed`: Triggered after a user's command is successfully processed by the NLP.
- `property_searched`: Triggered when a property search is performed.
- `lead_added`: Triggered when a lead is successfully added to a CRM.
- `task_created`: Triggered when a task is successfully created in a CRM.
 Expand 
Expected Output:
Updated src/app/layout.tsx or similar for SDK initialization.
Code snippets for custom analytics events in relevant client-side components and Cloud Functions.
Key Considerations:
You'll need to enable these services in your Firebase project console.
11. Final Polish & Deployment Preparation

Phase Goal: Ensure the app is ready for deployment and basic ongoing development. Firebase Services Involved: Firebase Hosting, Firebase Extensions (optional, for future).
Instructions for Gemini Agent (Prompt Sequence):
Prompt 24 (Deployment Configuration):
Configure the Next.js application for deployment to Firebase Hosting.
Generate the necessary `firebase.json` and `.firebaserc` files to support deploying the Next.js build output.
Provide instructions on how to build the application for production and deploy it to Firebase Hosting.
 Expand 
Prompt 25 (Code Comments & Readme):
Add inline code comments to all newly generated or modified files, especially in Cloud Functions and complex UI components, explaining the logic and purpose of different sections.
Generate a basic `README.md` file at the project root, including:
- Project title (Estait).
- A brief description of Estait.
- Setup instructions (Firebase project setup, API keys, `npm install`, `npm run dev`).
- Basic deployment instructions.
 Expand 
Expected Output:
firebase.json , .firebaserc files.
Code comments throughout the project.
README.md file.