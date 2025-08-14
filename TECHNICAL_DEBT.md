# Technical Debt Audit

This document outlines all known technical debt, configuration issues, and bugs that are preventing the application from building successfully and being production-ready. Each item must be resolved before proceeding with new feature development.

## 1. Build & Configuration Failures

### 1.1. TypeScript Type-Safety Violations (`strict: true`)
- **Root Cause:** The codebase was not developed with strict type-safety in mind, leading to numerous implicit `any` types and potential `null` or `undefined` errors. My previous fixes failed to address this systemically.
- **Files Affected:**
    - `src/app/dashboard/page.tsx`: Implicit `any` types for state variables (`user`, `chatMessages`, `analytics`), function parameters, and event handlers.
    - `src/app/properties/[id]/page.tsx`: Props (`params`) and state variables (`property`) were not explicitly typed, leading to `any` types and errors on property access.
    - `src/app/properties/search-results/page.tsx`: Similar to the details page, props and state were not typed.
    - `src/app/login/page.tsx` & `src/app/signup/page.tsx`: Event handlers and error objects were not explicitly typed.
    - `functions/src/index.ts`: Multiple parameters and return values from Dialogflow and Google Speech Client were not correctly typed, leading to `any` types and a critical build failure on the `recognize` function's response.
- **Action:** Go through every file and add explicit, correct TypeScript types for all variables, state, props, and function signatures.

### 1.2. Invalid JSON Configuration
- **Root Cause:** The `firestore.indexes.json` file was generated with comments, which is not valid JSON.
- **File Affected:** `firestore.indexes.json`
- **Action:** Remove all comments from the JSON file.

## 2. Deprecations & Best Practices

### 2.1. Deprecated Next.js `legacyBehavior` Link Prop
- **Root Cause:** The application was using an outdated pattern for the Next.js `<Link>` component, which generates warnings and is considered technical debt.
- **Files Affected:** `src/app/page.tsx`, `src/app/login/page.tsx`, `src/app/signup/page.tsx`
- **Action:** Run the `npx @next/codemod@latest new-link .` command to automatically and safely upgrade all instances.

## 3. Architectural Flaws

### 3.1. Incorrect Cloud Function Interaction
- **Root Cause:** My previous implementation in `functions/src/index.ts` incorrectly attempted to call `onRequest` (HTTP-triggered) functions from within the `processAgentCommand` function as if they were standard async functions. This is architecturally incorrect, as `onRequest` functions do not return values but instead send HTTP responses.
- **File Affected:** `functions/src/index.ts`
- **Action:** Refactor the entire file to extract core logic into internal, private `async` functions. The exported `onRequest` functions will act as simple wrappers around this core logic. `processAgentCommand` will call the internal functions directly to get return values.
