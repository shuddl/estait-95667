#!/bin/bash

# Firebase Secrets Setup Script for Estait Production Deployment
# This script sets up all required Firebase secrets for OAuth and API integrations

echo "Setting up Firebase Secrets for Estait Production..."
echo "=============================================="
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if Firebase CLI is installed
if ! command_exists firebase; then
    echo "Error: Firebase CLI is not installed."
    echo "Please install it with: npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in to Firebase
firebase projects:list >/dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Please login to Firebase first:"
    firebase login
fi

echo "Current Firebase project:"
firebase use

echo ""
echo "This script will set up the following secrets:"
echo "1. Wise Agent OAuth credentials"
echo "2. Follow Up Boss OAuth credentials"
echo "3. Real Geeks OAuth credentials"
echo "4. Real Estate API key"
echo "5. Vertex AI configuration"
echo ""

read -p "Do you want to continue? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Setup cancelled."
    exit 0
fi

echo ""
echo "Setting up Wise Agent credentials..."
echo "-----------------------------------"
read -p "Enter Wise Agent Client ID: " WISE_AGENT_CLIENT_ID
read -s -p "Enter Wise Agent Client Secret: " WISE_AGENT_CLIENT_SECRET
echo ""

if [ ! -z "$WISE_AGENT_CLIENT_ID" ] && [ ! -z "$WISE_AGENT_CLIENT_SECRET" ]; then
    echo "$WISE_AGENT_CLIENT_ID" | firebase functions:secrets:set WISE_AGENT_CLIENT_ID
    echo "$WISE_AGENT_CLIENT_SECRET" | firebase functions:secrets:set WISE_AGENT_CLIENT_SECRET
    echo "✅ Wise Agent credentials configured"
else
    echo "⚠️  Skipping Wise Agent configuration (empty values)"
fi

echo ""
echo "Setting up Follow Up Boss credentials..."
echo "----------------------------------------"
read -p "Enter Follow Up Boss Client ID: " FOLLOWUPBOSS_CLIENT_ID
read -s -p "Enter Follow Up Boss Client Secret: " FOLLOWUPBOSS_CLIENT_SECRET
echo ""

if [ ! -z "$FOLLOWUPBOSS_CLIENT_ID" ] && [ ! -z "$FOLLOWUPBOSS_CLIENT_SECRET" ]; then
    echo "$FOLLOWUPBOSS_CLIENT_ID" | firebase functions:secrets:set FOLLOWUPBOSS_CLIENT_ID
    echo "$FOLLOWUPBOSS_CLIENT_SECRET" | firebase functions:secrets:set FOLLOWUPBOSS_CLIENT_SECRET
    echo "✅ Follow Up Boss credentials configured"
else
    echo "⚠️  Skipping Follow Up Boss configuration (empty values)"
fi

echo ""
echo "Setting up Real Geeks credentials..."
echo "------------------------------------"
read -p "Enter Real Geeks Client ID: " REALGEEKS_CLIENT_ID
read -s -p "Enter Real Geeks Client Secret: " REALGEEKS_CLIENT_SECRET
echo ""

if [ ! -z "$REALGEEKS_CLIENT_ID" ] && [ ! -z "$REALGEEKS_CLIENT_SECRET" ]; then
    echo "$REALGEEKS_CLIENT_ID" | firebase functions:secrets:set REALGEEKS_CLIENT_ID
    echo "$REALGEEKS_CLIENT_SECRET" | firebase functions:secrets:set REALGEEKS_CLIENT_SECRET
    echo "✅ Real Geeks credentials configured"
else
    echo "⚠️  Skipping Real Geeks configuration (empty values)"
fi

echo ""
echo "Setting up Real Estate API key..."
echo "---------------------------------"
read -s -p "Enter RealEstateAPI.com API Key: " REALESTATEAPI_KEY
echo ""

if [ ! -z "$REALESTATEAPI_KEY" ]; then
    echo "$REALESTATEAPI_KEY" | firebase functions:secrets:set REALESTATEAPI_KEY
    echo "✅ Real Estate API key configured"
else
    echo "⚠️  Skipping Real Estate API configuration (empty value)"
fi

echo ""
echo "Setting up encryption key..."
echo "----------------------------"
echo "Generating secure encryption key..."
ENCRYPTION_KEY=$(openssl rand -base64 32)
echo "$ENCRYPTION_KEY" | firebase functions:secrets:set ENCRYPTION_KEY
echo "✅ Encryption key generated and stored"

echo ""
echo "Granting secret access to functions..."
echo "--------------------------------------"

# Grant access to all secrets for functions
firebase functions:secrets:access WISE_AGENT_CLIENT_ID
firebase functions:secrets:access WISE_AGENT_CLIENT_SECRET
firebase functions:secrets:access FOLLOWUPBOSS_CLIENT_ID
firebase functions:secrets:access FOLLOWUPBOSS_CLIENT_SECRET
firebase functions:secrets:access REALGEEKS_CLIENT_ID
firebase functions:secrets:access REALGEEKS_CLIENT_SECRET
firebase functions:secrets:access REALESTATEAPI_KEY
firebase functions:secrets:access ENCRYPTION_KEY

echo ""
echo "=============================================="
echo "✅ Firebase Secrets setup complete!"
echo ""
echo "To view configured secrets, run:"
echo "  firebase functions:secrets:list"
echo ""
echo "To update a secret, run:"
echo "  firebase functions:secrets:set SECRET_NAME"
echo ""
echo "Next steps:"
echo "1. Enable Vertex AI API in Google Cloud Console"
echo "2. Configure OAuth redirect URIs with each CRM provider:"
echo "   - Wise Agent: https://YOUR_PROJECT.firebaseapp.com/wiseAgentCallback"
echo "   - Follow Up Boss: https://YOUR_PROJECT.firebaseapp.com/followUpBossCallback"
echo "   - Real Geeks: https://YOUR_PROJECT.firebaseapp.com/realGeeksCallback"
echo "3. Deploy functions: firebase deploy --only functions"
echo "4. Deploy hosting: firebase deploy --only hosting"
echo ""