#!/bin/bash

echo "🚀 Starting Estait deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}Error: Firebase CLI is not installed${NC}"
    echo "Install it with: npm install -g firebase-tools"
    exit 1
fi

# Build the Next.js application
echo -e "${YELLOW}Building Next.js application...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed!${NC}"
    exit 1
fi

# Export static files for Firebase Hosting
echo -e "${YELLOW}Exporting static files...${NC}"
npx next export
if [ $? -ne 0 ]; then
    echo -e "${RED}Export failed!${NC}"
    exit 1
fi

# Build Firebase Functions
echo -e "${YELLOW}Building Firebase Functions...${NC}"
cd functions
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}Functions build failed!${NC}"
    exit 1
fi
cd ..

# Deploy to Firebase
echo -e "${YELLOW}Deploying to Firebase...${NC}"
firebase deploy

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo ""
    echo "Your app is now live at:"
    echo "https://estait-95667.web.app"
    echo ""
    echo "Firebase Console:"
    echo "https://console.firebase.google.com/project/estait-95667"
else
    echo -e "${RED}Deployment failed!${NC}"
    exit 1
fi