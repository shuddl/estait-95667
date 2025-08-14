# Estait: Blueprint & Development Roadmap

## 1. Vision

To create an uncommon, ultra-minimalist conversational AI layer for real estate agents. The application will be a black and white, mobile-first interface that prioritizes extreme whitespace, super-thin lines, and ghost-like interactions. The primary user interface will be a chatbot that feels alive and intuitive.

## 2. Design Philosophy

-   **Monochromatic Palette:** The application will use a strict black and white color scheme.
-   **Extreme Whitespace:** All elements will have significant spacing to create a clean, uncluttered feel.
-   **Super Thin Lines:** Borders and dividers will be barely visible (1px, `gray-100/10`) to provide structure without adding visual weight.
-   **Ghost-like Interactions:** Hover and click effects will be subtle and refined, providing feedback without being distracting.
-   **Animated Logo:** The `estait` logo will be animated to add a touch of life to the minimal interface.

## 3. Development Protocol

All development will adhere to the following 5-step protocol. A task is not considered "done" until it passes all five stages:

1.  **Feature Implementation:** Write the code for the feature or fix.
2.  **Strict Type Checking:** The code *must* compile with zero TypeScript errors under the project's `strict: true` configuration.
3.  **Linter Pass:** The code *must* pass `npm run lint` with zero errors or warnings.
4.  **Successful Production Build:** The entire project *must* build successfully via `npm run build`.
5.  **Documentation Update:** This blueprint and any relevant code comments will be updated to reflect the changes.

---

## 4. Execution Plan & Roadmap

### **Phase 1: Eradication of Technical Debt & Build Stabilization (Current Phase)**

-   [ ] **Objective:** Achieve a 100% clean, successful production build.
-   [ ] **Deliverables:**
    -   [x] Create `TECHNICAL_DEBT.md` audit document.
    -   [ ] Fix all TypeScript errors in all files (`.ts` and `.tsx`).
    -   [ ] Fix all linting warnings.
    -   [ ] Run `npx @next/codemod@latest new-link .` successfully.
    -   [ ] Refactor `functions/src/index.ts` to use the correct architectural pattern.
    -   [ ] Achieve a successful `npm run build`.

### **Phase 2: Ultra-Minimalist Redesign**

-   [ ] **Objective:** Transform the application's UI/UX to match the new design philosophy.
-   [ ] **Deliverables:**
    -   [ ] Create a new animated logo component.
    -   [ ] Redesign the homepage (`/`) as a full-screen, chatbot-centric interface.
        -   Implement "ghost typing" effect for example commands.
        -   Implement the all-black, circular send button.
    -   [ ] Add a horizontally-scrolling property card carousel to the homepage.
    -   [ ] Redesign the `login`, `signup`, and `dashboard` pages to be monochromatic and minimalist.
    -   [ ] Apply the new design system (whitespace, thin lines, etc.) globally.

### **Phase 3: Advanced CRM & AI Functionality**

-   [ ] **Objective:** Make the CRM and AI features more powerful and intuitive.
-   [ ] **Deliverables:**
    -   [ ] Enhance the CRM dashboard to display more useful information (e.g., upcoming tasks, recent notes).
    -   [ ] Implement full two-way contact synchronization with connected CRMs.
    -   [ ] Enhance the `processAgentCommand` function to handle more complex, multi-step conversations.
    -   [ ] Add the ability to create and manage tasks in the CRM via the chat interface.

### **Phase 4: Final Polish & Deployment**

-   [ ] **Objective:** Prepare the application for a production launch.
-   [ ] **Deliverables:**
    -   [ ] Implement a comprehensive suite of unit and integration tests.
    -   [ ] Optimize the application's performance.
    -   [ ] Update this blueprint with a final list of all operational features.
    -   [ ] Deploy the application to Firebase Hosting.
