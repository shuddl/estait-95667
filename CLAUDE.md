# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Estait is a mobile-first conversational AI layer for real estate agents that integrates with CRM and MLS systems through natural language. It's built with Next.js 15, Firebase, and TypeScript with strict type safety enabled.

## Development Commands

### Main Application (Next.js)
```bash
# Development server with turbopack
npm run dev

# Production build
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

### Firebase Functions
```bash
cd functions

# Build TypeScript
npm run build

# Build and watch for changes
npm run build:watch

# Run linting
npm run lint

# Start Firebase emulators (functions only)
npm run serve

# Deploy functions to Firebase
npm run deploy

# View function logs
npm run logs
```

### Firebase Deployment
```bash
# Deploy entire project (hosting + functions)
firebase deploy

# Deploy only functions
firebase deploy --only functions

# Deploy only hosting
firebase deploy --only hosting
```

## Architecture Overview

### Frontend Structure
- **Next.js App Router**: Located in `src/app/`
- **Authentication**: Firebase Auth integration in `src/lib/firebase/`
- **Pages**:
  - `/` - Landing page
  - `/login` - User authentication
  - `/signup` - User registration
  - `/dashboard` - Main agent interface with AI chat
  - `/properties/[id]` - Property details view
  - `/properties/search-results` - Property search results

### Backend Architecture
- **Firebase Functions**: TypeScript functions in `functions/src/`
- **Core AI System**: Vertex AI (Gemini) integration for natural language processing
- **CRM Integrations**: OAuth 2.0 flows for Wise Agent, Follow Up Boss, Real Geeks
- **Security**: Token encryption/decryption in `functions/src/lib/security.ts`

### Key Technical Considerations

1. **TypeScript Strict Mode**: Both frontend and functions use `strict: true` in tsconfig
2. **Environment Variables**:
   - Frontend: `.env.local` for Firebase config (NEXT_PUBLIC_*)
   - Functions: Firebase secrets for API keys and OAuth credentials
3. **OAuth Flow**: State parameter contains user UID for secure callback handling
4. **Token Storage**: Encrypted tokens stored in Firestore at `/users/{userId}/credentials/{crm_type}`

### API Integration Pattern

The AI system follows this flow:
1. User sends natural language command to `processAgentCommand` function
2. Command is processed by Vertex AI to determine action and parameters
3. Based on action type, internal functions execute CRM/MLS operations
4. Response is returned to frontend with action results

### Current Dependencies

**Missing/Required Setup**:
- `@google-cloud/vertexai` package needs to be installed in functions
- Vertex AI API must be enabled in Google Cloud Console
- Firebase secrets must be configured for OAuth credentials

### Testing Approach

Currently no test framework is set up. When implementing tests:
- Check for existing test runners before adding new dependencies
- Follow the existing code style and patterns
- Ensure all TypeScript types are explicit

### Security Notes

- Never expose API keys or OAuth credentials in frontend code
- All sensitive operations happen in Firebase Functions
- Token refresh logic needs implementation in `_getAccessToken` function
- CORS is handled via `corsMiddleware` for HTTP functions