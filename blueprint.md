# Estait: The Complete Implementation Blueprint

## 1. Core Vision & Guiding Principles

**Vision:** To provide a unified, mobile-first conversational AI layer that simplifies real estate agent workflows by integrating with existing CRM and MLS systems via natural language.

**Principles:**
-   **Modularity:** Each task will be a single, well-defined component.
-   **Explicitness:** All file names, functions, and data structures will be clearly defined.
-   **Iterative Build:** We will build and validate each component piece by piece.
-   **Security First:** All sensitive data (API keys, tokens) will be handled securely on the server-side.
-   **Mobile-First Design:** All UI will be responsive and optimized for touchscreens.

---

## 2. Current State Analysis

The foundational Next.js project is set up with Firebase, and the initial UI components are in place. However, the core logic is not fully integrated, and the AI is not yet the central nervous system of the application. The immediate goal is to stabilize the build, fully integrate the first CRM (Wise Agent), and empower the AI with Vertex AI.

---

## 3. The Full Implementation Roadmap

This roadmap is divided into phases. Each phase includes my development actions and the specific, step-by-step directions for you to follow to provide the necessary credentials and configurations.

### **Phase 1: Foundation - Vertex AI Core & Wise Agent Integration (Current Phase)**

**Goal:** To establish a stable, intelligent core for the application by fully integrating Vertex AI and the first CRM.

#### **My Development Actions:**
1.  **Stabilize the Build:** Eradicate all remaining TypeScript and build errors to create a stable foundation.
2.  **Re-architect to Vertex AI:** Remove the Dialogflow implementation from `functions/src/index.ts` and replace it with a direct integration to Vertex AI's Gemini model.
3.  **Engineer the System Prompt:** Create a master "system prompt" for Gemini that instructs it on its persona (a professional real estate assistant), its capabilities, and the exact JSON structure it must return for each intent (`action`, `parameters`, `responseToUser`).
4.  **Implement Wise Agent OAuth Flow:** Write the client-side and server-side code to handle the full OAuth 2.0 connection flow for Wise Agent using the credentials you have provided.
5.  **Build Core AI Actions:** Connect the AI's response to the CRM. The `processAgentCommand` function will now be able to:
    *   Parse the JSON from Vertex AI.
    *   Call the internal `_addWiseAgentContact` function when the action is `add_lead`.
    *   Call the internal `_addWiseAgentTask` function when the action is `create_task`.

#### **Your Step-by-Step Directions for Phase 1:**

**1. Set Up Vertex AI:**
   - **Step 1.1:** Navigate to the [Google Cloud Console](https://console.cloud.google.com/) for your project (`estait-1fdbe`).
   - **Step 1.2:** In the search bar, type **"Vertex AI API"** and select it.
   - **Step 1.3:** Click the **"Enable"** button. This grants the project permission to use the AI.

**2. Generate and Set the Encryption Key:**
   - **Step 2.1:** The `ENCRYPTION_KEY` is a secret you create to protect the CRM tokens. It must be a 32-character string.
   - **Step 2.2:** I have generated a secure, random key for you: `f4b3c2a1d0e9f8b7c6d5e4f3a2b1c0d9`.
   - **Step 2.3:** You will need to set this and other secrets in your Firebase environment.

**3. Set Your Firebase Environment Variables:**
   - **Step 3.1:** In your local terminal, run the following command to set the Wise Agent Client ID:
     ```bash
     firebase functions:secrets:set WISE_AGENT_CLIENT_ID
     ```
     When prompted, paste in `29afa25e-cce6-47ac-8375-2da7c361031a`.
   - **Step 3.2:** Run the command for the Client Secret:
     ```bash
     firebase functions:secrets:set WISE_AGENT_CLIENT_SECRET
     ```
     When prompted, paste in `t48/pe1i3uYKlSqwXv70bh91SgGFf9XhE2LKDnimEwI=`.
   - **Step 3.3:** Run the command for the Encryption Key:
     ```bash
     firebase functions:secrets:set ENCRYPTION_KEY
     ```
     When prompted, paste in the key from Step 2.2: `f4b3c2a1d0e9f8b7c6d5e4f3a2b1c0d9`.

---

### **Phase 2: Advanced CRM & MLS Integration**

**Goal:** Expand Estait's reach by integrating more CRMs and connecting to live MLS data.

#### **My Development Actions:**
1.  **Implement Real Geeks Integration:** Using the credentials and API documentation, I will build the full OAuth flow and API interaction logic for Real Geeks, mirroring the Wise Agent implementation.
2.  **Prepare for Follow Up Boss:** I will build the placeholder functions and UI for the Follow Up Boss integration. It will be disabled until the OAuth credentials are provided.
3.  **Integrate RealEstateAPI.com:** I will connect the AI's `search_property` intent to the `_searchProperties` function, which calls the RealEstateAPI.com.
4.  **Enhance Property Cards:** The property cards will be updated to display live data returned from the API.

#### **Your Step-by-Step Directions for Phase 2:**

**1. Obtain Real Geeks Credentials:**
   - **Step 1.1:** From the information you provided, it seems you have the API auth, sandbox access, and site UUID.
   - **Step 1.2:** Please provide me with the **Client ID** and **Client Secret** for the Real Geeks OAuth application. I will need these to build the connection.

**2. Complete Follow Up Boss OAuth Setup:**
   - **Step 2.1:** You mentioned you are missing the OAuth client credentials.
   - **Step 2.2:** Please follow their developer documentation to register your application and obtain a **Client ID** and **Client Secret**. Once you have them, I can complete the integration.

---

### **Phase 3: Generative AI & The "Total Tool"**

**Goal:** Evolve Estait from a command-based tool into a proactive, generative assistant.

#### **My Development Actions:**
1.  **Generative Property Descriptions:**
    -   I will add a new button on the `PropertyDetails` page: **"Generate Description"**.
    -   When clicked, a new Cloud Function will be called that sends all the property data (beds, baths, sqft, features) to Vertex AI.
    -   I will engineer a prompt that instructs Gemini to act as a professional real estate copywriter and generate three distinct, compelling property descriptions (e.g., one luxurious, one family-focused, one concise).
2.  **AI-Powered Client Sharing -> Custom Property Websites:**
    -   I will transform the "Share to Client" button into a powerful generative feature.
    -   When an agent clicks "Share to Client", they will be prompted: "What is the client's name and what are they looking for in a home?"
    -   **My Action:** A new Cloud Function will take this information, the property details, and the agent's profile, and call Vertex AI with a prompt to generate a complete, single-page HTML website for that specific property, personalized for that specific client.
    -   The generated HTML will be stored, and a unique URL will be provided to the agent to share with their client.
3.  **Intuitive Follow-up AI:**
    -   The `processAgentCommand` function will be enhanced. After a successful action, I will make a second call to Vertex AI.
    -   **Prompt:** "The user just added the contact 'John Doe'. Based on best practices for real estate agents, suggest three logical next-step actions."
    -   **AI Response:** The AI will return a JSON object with suggestions like: `["Set a follow-up reminder for John Doe", "Send John Doe an introductory email", "Search for 3-bedroom properties for John Doe"]`.
    -   **My Action:** I will display these suggestions as clickable buttons in the chat interface, allowing the agent to chain commands together seamlessly.

#### **Your Step-by-Step Directions for Phase 3:**

-   For this phase, your primary role will be to provide feedback on the generated content. We will work together to refine the prompts to ensure the AI's output matches the tone and quality required for a professional real estate agent.

This blueprint will be updated as we complete each phase. I am ready to begin the final fixes for Phase 1.
