# 🚀 ESTAIT LAUNCH GUIDE - FIREBASE DEPLOYMENT

## ✅ CURRENT STATUS
- **Frontend**: Built and ready in `/out` directory
- **Firebase Functions**: Configured and ready
- **Database**: Firestore rules configured
- **Authentication**: Firebase Auth ready

## 📋 PRE-LAUNCH CHECKLIST

### 1. Firebase Project Setup
```bash
# If you haven't created a Firebase project yet:
firebase login
firebase projects:create estait-production
firebase use estait-production
```

### 2. Enable Required APIs in Google Cloud Console
- [ ] Vertex AI API
- [ ] Cloud Functions API
- [ ] Firestore API
- [ ] Firebase Authentication API

### 3. Configure Firebase Functions Secrets
```bash
# Run the setup script
./scripts/setup-firebase-config.sh

# Or manually set each secret:
firebase functions:config:set stripe.secret_key="sk_live_..."
firebase functions:config:set wise_agent.client_id="..."
firebase functions:config:set realestateapi.key="STOYC-1db8-7e5d-b2ff-92045cf12576"
```

### 4. Update Environment Variables
```bash
# Copy and edit the environment file
cp .env.local.example .env.local
# Edit with your actual Firebase config
```

## 🚀 DEPLOYMENT COMMANDS

### Option 1: One-Command Deploy (Recommended)
```bash
./deploy-firebase.sh
```

### Option 2: Manual Deploy
```bash
# 1. Build the static site
npm run build

# 2. Build Firebase functions
cd functions && npm run build && cd ..

# 3. Deploy everything
firebase deploy
```

## 🔗 POST-DEPLOYMENT

### Your App URLs:
- **Primary**: https://[YOUR-PROJECT].web.app
- **Alternative**: https://[YOUR-PROJECT].firebaseapp.com
- **Functions**: https://us-central1-[YOUR-PROJECT].cloudfunctions.net

### Verify Deployment:
1. Visit your app URL
2. Test the voice interface on landing page
3. Create a test account
4. Access the dashboard
5. Test AI commands

### Configure Custom Domain (Optional):
```bash
firebase hosting:channel:deploy production
firebase hosting:sites:create estait-app
# Follow Firebase instructions to add custom domain
```

## 🛠️ TROUBLESHOOTING

### If Firebase CLI not installed:
```bash
npm install -g firebase-tools
```

### If deployment fails:
```bash
# Check Firebase login
firebase login

# Verify project
firebase use --add

# Check build output exists
ls -la out/
```

### If Functions fail to deploy:
```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

## 📊 MONITORING

### Firebase Console:
https://console.firebase.google.com

### Key Metrics to Monitor:
- Function invocations
- Firestore reads/writes
- Authentication users
- Hosting bandwidth

## 🔐 SECURITY CHECKLIST

- [ ] Change default encryption key in Firebase config
- [ ] Review Firestore security rules
- [ ] Enable App Check for additional security
- [ ] Set up budget alerts in Google Cloud Console
- [ ] Configure CORS properly for production domain

## 🎉 LAUNCH COMPLETE!

Your Estait MVP is now deployed to Firebase with:
- Static frontend on Firebase Hosting
- Backend logic in Firebase Functions
- User data in Firestore
- Authentication via Firebase Auth

## 📝 NEXT STEPS

1. **Test Everything**: Go through all user flows
2. **Monitor Logs**: Check Firebase Functions logs for errors
3. **Set Up Analytics**: Add Google Analytics
4. **Configure CRM OAuth**: Register your app with each CRM provider
5. **Enable Stripe**: Set up real Stripe keys for payments

## 💡 QUICK TIPS

- Use Firebase Emulators for local development
- Monitor costs in Google Cloud Console
- Set up alerts for function errors
- Enable automatic backups for Firestore
- Use Firebase Performance Monitoring

---

**Need Help?**
- Firebase Docs: https://firebase.google.com/docs
- Vertex AI Docs: https://cloud.google.com/vertex-ai/docs
- Support: Create an issue in your repository