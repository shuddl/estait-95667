# Estait CRM Platform - Production Deployment Guide

## Prerequisites
- Firebase CLI installed and authenticated
- Google Cloud Project with Vertex AI enabled
- Wise Agent API credentials
- RealEstateAPI.com or similar MLS API credentials

## Step 1: Environment Variables Setup

### Local Development (.env.local)
```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=estait-1fdbe.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=estait-1fdbe
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=estait-1fdbe.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Wise Agent OAuth (Production)
WISEAGENT_CLIENT_ID=your_production_client_id
WISEAGENT_CLIENT_SECRET=your_production_client_secret
WISEAGENT_REDIRECT_URI=https://estait-1fdbe.web.app/api/crm/callback/wiseagent

# MLS API (RealEstateAPI.com)
REALESTATE_API_KEY=your_api_key
```

### Firebase Functions Configuration
```bash
# Generate a secure encryption key
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Set Firebase Functions config
firebase functions:config:set \
  wiseagent.client_id="YOUR_WISEAGENT_CLIENT_ID" \
  wiseagent.client_secret="YOUR_WISEAGENT_CLIENT_SECRET" \
  wiseagent.redirect_uri="https://estait-1fdbe.web.app/api/crm/callback/wiseagent" \
  encryption.key="$ENCRYPTION_KEY" \
  realestate.api_key="YOUR_REALESTATE_API_KEY"
```

## Step 2: Build the Application

```bash
# Build Next.js application
npm run build

# Build Firebase Functions
cd functions
npm run build
cd ..
```

## Step 3: Deploy to Firebase

```bash
# Deploy everything (hosting, functions, firestore rules, storage rules)
firebase deploy

# Or deploy separately:
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
```

## Step 4: Post-Deployment Configuration

### 1. Enable Vertex AI API
- Go to [Google Cloud Console](https://console.cloud.google.com)
- Select your project (estait-1fdbe)
- Enable "Vertex AI API"
- Enable "Cloud Functions API"

### 2. Configure Wise Agent OAuth
- Log into your Wise Agent developer account
- Add production redirect URI: `https://estait-1fdbe.web.app/api/crm/callback/wiseagent`
- Update OAuth application settings for production

### 3. Configure MLS API Access
- Set up production API keys with RealEstateAPI.com
- Configure rate limits and allowed domains

### 4. Set up Firestore Security Rules
Ensure your Firestore rules are properly configured:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // CRM tokens are private to each user
    match /crm_tokens/{document} {
      allow read, write: if request.auth != null && 
        (document.matches('.*_' + request.auth.uid) || 
         document.matches(request.auth.uid + '_.*'));
    }
    
    // Conversations are private to each user
    match /conversations/{conversationId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
  }
}
```

## Step 5: Monitoring & Analytics

### Enable Firebase Analytics
- Analytics is automatically enabled with the Firebase config
- Custom events are already implemented for:
  - CRM connections
  - Property searches
  - Command processing

### Set up Error Monitoring
```bash
# Enable Cloud Logging for functions
firebase functions:log
```

### Performance Monitoring
- Firebase Performance Monitoring is included
- Monitor via Firebase Console > Performance

## Step 6: Testing Production Deployment

### 1. Test Authentication Flow
- Sign up with a new account
- Verify email functionality
- Test login/logout

### 2. Test CRM Integration
- Connect Wise Agent account
- Verify OAuth flow completes
- Test contact synchronization

### 3. Test AI Assistant
- Send test queries:
  - "Add John Smith 555-1234 as a lead"
  - "Search for 3 bedroom homes in Austin under 500k"
  - "Create a follow-up task for tomorrow"

### 4. Test Property Search
- Verify MLS API integration
- Test search filters
- Check property details pages

## Troubleshooting

### Firebase Authentication Issues
```bash
firebase login --reauth
firebase use estait-1fdbe
```

### Function Deployment Errors
```bash
# Check function logs
firebase functions:log

# Test functions locally
cd functions
npm run serve
```

### Build Errors
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

## Security Checklist

- [ ] All API keys are in environment variables (not in code)
- [ ] Firestore security rules are restrictive
- [ ] HTTPS is enforced on all endpoints
- [ ] OAuth tokens are encrypted in database
- [ ] Rate limiting is configured on API endpoints
- [ ] CORS is properly configured
- [ ] Input validation on all user inputs
- [ ] XSS protection headers are set

## Production URLs

- **Main Application**: https://estait-1fdbe.web.app
- **Firebase Console**: https://console.firebase.google.com/project/estait-1fdbe
- **Google Cloud Console**: https://console.cloud.google.com/home/dashboard?project=estait-1fdbe

## Support & Maintenance

### Regular Tasks
1. Monitor Firebase usage and costs
2. Update dependencies monthly
3. Review security logs
4. Backup Firestore data
5. Monitor API rate limits

### Scaling Considerations
- Upgrade Firebase plan if needed (currently on Spark/free plan)
- Consider Cloud Run for Next.js if traffic increases
- Implement caching for MLS data
- Add CDN for static assets

## Contact

For production issues or questions about deployment, ensure you have:
1. Access to Firebase Console
2. Google Cloud Project owner permissions
3. Wise Agent developer account
4. MLS API production credentials