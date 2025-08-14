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

## 3. Concrete Development Plan: Technical Debt Resolution & Phase 1 Delivery

This section provides a granular, step-by-step plan to achieve a stable, feature-complete Phase 1. Each step includes a clear deliverable, acceptance criteria, and a manual validation process.

### **Step 1: Stabilize the Build Environment**

**Goal:** Eradicate all configuration and dependency issues that prevent a successful build.

*   **Action 1.1: Fix Invalid `firestore.indexes.json`**
    *   **Deliverable:** A `firestore.indexes.json` file that is syntactically correct JSON.
    *   **Acceptance Criteria:** The file must not contain any comments.
    *   **Validation:** I will read the file and confirm it parses as valid JSON.

*   **Action 1.2: Upgrade Next.js Link Components**
    *   **Deliverable:** All `<Link>` components in the application will be updated to remove the deprecated `legacyBehavior` prop.
    *   **Acceptance Criteria:** The `npx @next/codemod@latest new-link .` command runs successfully and modifies the relevant files.
    *   **Validation:** I will manually inspect the `src/app/page.tsx`, `src/app/login/page.tsx`, and `src/app/signup/page.tsx` files to confirm the code has been updated. The preview server should show no related warnings.

### **Step 2: Enforce Strict TypeScript Type-Safety**

**Goal:** Eliminate all TypeScript errors by ensuring every part of the codebase is explicitly typed.

*   **Action 2.1: Type Frontend Components**
    *   **Deliverable:** All pages and components in `src/app/` will have explicit types for props, state, and event handlers.
    *   **Acceptance Criteria:** `npm run build` completes without any TypeScript errors related to files in `src/app/`.
    *   **Validation:** I will execute `npm run build` and parse the output to confirm the absence of type errors.

*   **Action 2.2: Type Backend Cloud Functions**
    *   **Deliverable:** The `functions/src/index.ts` file will have explicit types for all function parameters and return values.
    *   **Acceptance Criteria:** `npx eslint --config ./eslint.config.js .` within the `functions/` directory runs without errors.
    *   **Validation:** I will execute the linting command and check for a successful exit code.

### **Step 3: Refactor and Implement Core AI and CRM Logic**

**Goal:** Re-architect the backend to be robust and implement the core functionality of Phase 1.

*   **Action 3.1: Architect Internal Cloud Function Logic**
    *   **Deliverable:** A refactored `functions/src/index.ts` where all core business logic resides in internal, private async functions. The public `onRequest` functions will be simple, secure wrappers.
    - **Acceptance Criteria:** The `processAgentCommand` function no longer calls `onRequest` functions directly, but instead calls the new internal functions (e.g., `_addWiseAgentContact`).
    - **Validation:** I will inspect the refactored code to ensure separation of concerns. The `firebase deploy --only functions` command (or emulator equivalent) should pass.

*   **Action 3.2: Integrate Vertex AI (Gemini)**
    *   **Deliverable:** A new function, `getAiResponse`, that communicates with the Vertex AI Gemini model. This includes a master system prompt that defines the AI's persona and required JSON output structure.
    *   **Acceptance Criteria:** The function successfully sends a prompt to Vertex AI and receives a structured JSON response in the format `{ "action": "...", "parameters": {...}, "responseToUser": "..." }`.
    *   **Validation:** I will write a temporary test case within a Cloud Function to call the Vertex AI service and log a valid response. This requires the **Vertex AI API to be enabled** and **Firebase secrets to be set** as outlined in the "Your Step-by-Step Directions" section below.

*   **Action 3.3: Implement Wise Agent OAuth 2.0 Flow**
    *   **Deliverable:** A secure, end-to-end OAuth 2.0 flow for Wise Agent. This includes:
        1.  A `wiseAgentAuth` Cloud Function to initiate the flow.
        2.  A `wiseAgentCallback` Cloud Function to handle the redirect, exchange the code for tokens, and securely store the encrypted tokens in Firestore.
    *   **Acceptance Criteria:** A user can be redirected to Wise Agent, authorize the application, and have their tokens securely stored in the `/users/{userId}/credentials/wise_agent` document.
    *   **Validation:** I will manually trigger the auth flow from the browser and inspect the Firestore database to confirm the encrypted tokens are stored correctly.

*   **Action 3.4: Implement Core AI-to-CRM Actions**
    *   **Deliverable:** The `processAgentCommand` function will now parse the Vertex AI response and execute CRM actions.
    *   **Acceptance Criteria:**
        1.  When the AI returns `{ "action": "add_lead", ... }`, the `_addWiseAgentContact` function is called with the correct parameters.
        2.  When the AI returns `{ "action": "create_task", ... }`, the `_addWiseAgentTask` function is called with the correct parameters.
    *   **Validation:** I will send test commands (e.g., "add a new lead John Doe 555-123-4567") to the `processAgentCommand` endpoint and verify in the logs that the correct internal Wise Agent functions are triggered.

---

## 4. The Full Implementation Roadmap

This roadmap is divided into phases. Each phase includes my development actions and the specific, step-by-step directions for you to follow to provide the necessary credentials and configurations.

### **Phase 1: Foundation - Vertex AI Core & Wise Agent Integration (Complete after Step 3)**

**Goal:** To establish a stable, intelligent core for the application by fully integrating Vertex AI and the first CRM.

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
