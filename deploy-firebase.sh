#!/bin/bash

# Estait Firebase Deployment Script
# This script builds and deploys the entire application to Firebase

set -e

echo "🚀 Starting Estait deployment to Firebase..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed. Installing..."
    npm install -g firebase-tools
fi

# Build the Next.js static site
echo "📦 Building Next.js static site..."
npm run build

# Build Firebase Functions
echo "🔧 Building Firebase Functions..."
cd functions
npm install
npm run build
cd ..

# Deploy to Firebase
echo "☁️ Deploying to Firebase..."

# Deploy Firestore rules
echo "  - Deploying Firestore rules..."
firebase deploy --only firestore:rules

# Deploy Firebase Functions
echo "  - Deploying Firebase Functions..."
firebase deploy --only functions

# Deploy hosting
echo "  - Deploying static site to Firebase Hosting..."
firebase deploy --only hosting

echo "✅ Deployment complete!"
echo ""
echo "🔗 Your app is now live at:"
echo "   https://estait-demo.web.app"
echo "   https://estait-demo.firebaseapp.com"
echo ""
echo "📊 View Firebase Console:"
echo "   https://console.firebase.google.com/project/estait-demo"
echo ""
echo "⚙️ Next steps:"
echo "1. Configure environment variables in Firebase Console"
echo "2. Set up OAuth apps with CRM providers"
echo "3. Enable Vertex AI API in Google Cloud Console"
echo "4. Configure custom domain (optional)"