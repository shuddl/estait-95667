# Estait Production Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying Estait to production with all OAuth integrations and real estate API connections fully configured.

## Prerequisites

1. **Google Cloud Project Setup**
   - Create a Google Cloud Project
   - Enable billing
   - Enable required APIs:
     - Firebase Authentication
     - Cloud Firestore
     - Cloud Functions
     - Vertex AI API
     - Secret Manager API

2. **Firebase Project Setup**
   ```bash
   firebase login
   firebase init
   firebase use --add
   ```

3. **Node.js Environment**
   - Node.js v22.x installed
   - npm or yarn package manager

## OAuth Credentials Setup

### 1. Wise Agent CRM
1. Go to [Wise Agent Developer Portal](https://sync.thewiseagent.com)
2. Create a new OAuth application
3. Set redirect URI: `https://YOUR_PROJECT.firebaseapp.com/wiseAgentCallback`
4. Note the Client ID and Client Secret

### 2. Follow Up Boss CRM
1. Go to [Follow Up Boss API Settings](https://app.followupboss.com/settings/api)
2. Create a new OAuth application
3. Set redirect URI: `https://YOUR_PROJECT.firebaseapp.com/followUpBossCallback`
4. Note the Client ID and Client Secret

### 3. Real Geeks CRM
1. Go to [Real Geeks Developer Console](https://app.realgeeks.com/developer)
2. Register your application
3. Set redirect URI: `https://YOUR_PROJECT.firebaseapp.com/realGeeksCallback`
4. Note the Client ID and Client Secret

### 4. Real Estate API
1. Sign up at [RealEstateAPI.com](https://realestateapi.com)
2. Subscribe to a plan
3. Get your API key from the dashboard

## Environment Configuration

### 1. Firebase Secrets (Production)
Run the setup script:
```bash
./setup-firebase-secrets.sh
```

Or manually set secrets:
```bash
# Wise Agent
firebase functions:secrets:set WISE_AGENT_CLIENT_ID
firebase functions:secrets:set WISE_AGENT_CLIENT_SECRET

# Follow Up Boss
firebase functions:secrets:set FOLLOWUPBOSS_CLIENT_ID
firebase functions:secrets:set FOLLOWUPBOSS_CLIENT_SECRET

# Real Geeks
firebase functions:secrets:set REALGEEKS_CLIENT_ID
firebase functions:secrets:set REALGEEKS_CLIENT_SECRET

# Real Estate API
firebase functions:secrets:set REALESTATEAPI_KEY

# Encryption Key (generate a secure key)
firebase functions:secrets:set ENCRYPTION_KEY
```

### 2. Frontend Environment (.env.local)
Create `.env.local` in the root directory:
```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Function URLs (after deployment)
NEXT_PUBLIC_FUNCTIONS_URL=https://us-central1-your_project.cloudfunctions.net
```

## Vertex AI Setup

1. **Enable Vertex AI API**
   ```bash
   gcloud services enable aiplatform.googleapis.com
   ```

2. **Grant Service Account Permissions**
   ```bash
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:YOUR_PROJECT_ID@appspot.gserviceaccount.com" \
     --role="roles/aiplatform.user"
   ```

3. **Configure Location**
   - Default location is set to `us-central1` in the code
   - Update in `functions/src/vertexai.ts` if different region needed

## Build and Deployment

### 1. Install Dependencies
```bash
# Frontend
npm install

# Functions
cd functions
npm install
cd ..
```

### 2. Build Projects
```bash
# Build Next.js frontend
npm run build

# Build Firebase functions
cd functions
npm run build
cd ..
```

### 3. Run Tests
```bash
# Frontend tests
npm test

# Function tests
cd functions
npm test
cd ..
```

### 4. Deploy to Firebase

**Deploy everything:**
```bash
firebase deploy
```

**Or deploy individually:**
```bash
# Deploy hosting only
firebase deploy --only hosting

# Deploy functions only
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:processAgentCommand
```

### 5. Verify Deployment
```bash
# Check function logs
firebase functions:log

# Check hosting URL
firebase hosting:sites
```

## Security Configuration

### 1. Firestore Security Rules
Update `firestore.rules`:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Credentials subcollection
      match /credentials/{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      // Searches subcollection
      match /searches/{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // Conversation history
    match /conversations/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Error logs (write only for functions)
    match /errors/{document=**} {
      allow read: if request.auth != null && request.auth.token.admin == true;
      allow write: if false; // Only functions can write
    }
  }
}
```

### 2. CORS Configuration
Update `firebase.json`:
```json
{
  "hosting": {
    "headers": [
      {
        "source": "**",
        "headers": [
          {
            "key": "X-Frame-Options",
            "value": "SAMEORIGIN"
          },
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          },
          {
            "key": "X-XSS-Protection",
            "value": "1; mode=block"
          }
        ]
      }
    ]
  }
}
```

## Post-Deployment Tasks

### 1. Test OAuth Flows
1. Login to the application
2. Navigate to Settings
3. Connect each CRM:
   - Click "Connect Wise Agent"
   - Complete OAuth flow
   - Verify successful connection
   - Repeat for other CRMs

### 2. Test Core Features
- **Add Contact**: "Add John Doe, john@example.com, looking for 3 bed homes"
- **Search Properties**: "Find 3 bedroom homes in Austin under 500k"
- **Create Task**: "Remind me to call the Johnsons tomorrow"
- **View Contacts**: "Show me my recent contacts"

### 3. Monitor Performance
```bash
# View function metrics
firebase functions:log --only processAgentCommand

# Check Vertex AI usage
gcloud ai models list --region=us-central1

# Monitor Firestore usage
firebase firestore:indexes
```

## Troubleshooting

### Common Issues

1. **OAuth Callback Errors**
   - Verify redirect URIs match exactly
   - Check Firebase hosting is deployed
   - Ensure secrets are properly set

2. **Vertex AI Errors**
   - Confirm API is enabled
   - Check service account permissions
   - Verify project ID in code

3. **Token Refresh Failures**
   - Check encryption key is set
   - Verify refresh token is stored
   - Check token expiry logic

4. **CORS Issues**
   - Update allowed origins in `cors.ts`
   - Check Firebase hosting configuration
   - Verify function URLs in frontend

### Debug Commands
```bash
# Check secret values (names only)
firebase functions:secrets:list

# View function configuration
firebase functions:config:get

# Test function locally
cd functions
npm run shell
> processAgentCommand({commandText: "test"}, {auth: {uid: "test-user"}})

# Check Firestore data
firebase firestore:delete --all-collections
```

## Maintenance

### Regular Tasks
1. **Weekly**
   - Check error logs
   - Review API usage and costs
   - Monitor user engagement metrics

2. **Monthly**
   - Update dependencies
   - Review and rotate API keys
   - Backup Firestore data

3. **Quarterly**
   - Security audit
   - Performance optimization
   - Feature usage analysis

### Updating Dependencies
```bash
# Check for updates
npm outdated
cd functions && npm outdated

# Update safely
npm update
cd functions && npm update

# Test after updates
npm test
npm run build
```

## Cost Optimization

### Monitoring Costs
1. Set up billing alerts in Google Cloud Console
2. Monitor usage:
   - Vertex AI API calls
   - Firestore reads/writes
   - Cloud Functions invocations
   - Firebase Authentication users

### Optimization Tips
1. Implement caching for property searches
2. Batch Firestore operations
3. Use Cloud Scheduler for periodic tasks
4. Enable Cloud CDN for static assets

## Support

### Resources
- [Firebase Documentation](https://firebase.google.com/docs)
- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
- [Next.js Documentation](https://nextjs.org/docs)

### Getting Help
1. Check function logs: `firebase functions:log`
2. Review error collection in Firestore
3. Enable debug mode in development
4. Contact support with:
   - Error messages
   - Function logs
   - Steps to reproduce

## Production Checklist

- [ ] All OAuth credentials configured
- [ ] Firebase secrets set
- [ ] Vertex AI API enabled
- [ ] Environment variables configured
- [ ] Security rules deployed
- [ ] CORS properly configured
- [ ] All functions deployed successfully
- [ ] Frontend deployed and accessible
- [ ] OAuth flows tested for all CRMs
- [ ] Core features tested
- [ ] Monitoring set up
- [ ] Backup strategy in place
- [ ] Documentation updated
- [ ] Team access configured
- [ ] SSL certificate active

## Version History

- v1.0.0 - Initial production release with three CRM integrations
- OAuth 2.0 authentication for all CRMs
- Vertex AI integration for natural language processing
- Real estate MLS property search
- Automatic token refresh
- Comprehensive error handling