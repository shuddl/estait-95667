#!/bin/bash

# Estait CRM Platform - Deployment Script
# This script automates the deployment process to Firebase

set -e  # Exit on error

echo "🚀 Starting Estait CRM Platform Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    print_error "Firebase CLI is not installed. Please install it first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Step 1: Build Next.js application
print_status "Building Next.js application..."
npm run build
if [ $? -eq 0 ]; then
    print_status "Next.js build completed successfully"
else
    print_error "Next.js build failed"
    exit 1
fi

# Step 2: Build Firebase Functions
print_status "Building Firebase Functions..."
cd functions
npm run build
if [ $? -eq 0 ]; then
    print_status "Functions build completed successfully"
else
    print_error "Functions build failed"
    exit 1
fi
cd ..

# Step 3: Check Firebase authentication
print_status "Checking Firebase authentication..."
firebase projects:list &> /dev/null
if [ $? -ne 0 ]; then
    print_warning "You need to authenticate with Firebase"
    firebase login
fi

# Step 4: Select Firebase project
print_status "Setting Firebase project to estait-1fdbe..."
firebase use estait-1fdbe

# Step 5: Ask for confirmation before deployment
echo ""
echo "======================================"
echo "Ready to deploy to Firebase"
echo "Project: estait-1fdbe"
echo "======================================"
echo ""
read -p "Do you want to proceed with deployment? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Deployment cancelled"
    exit 0
fi

# Step 6: Deploy to Firebase
print_status "Starting Firebase deployment..."

# Deploy Firestore rules
print_status "Deploying Firestore rules..."
firebase deploy --only firestore:rules

# Deploy Storage rules
print_status "Deploying Storage rules..."
firebase deploy --only storage:rules

# Deploy Functions
print_status "Deploying Cloud Functions..."
firebase deploy --only functions

# Deploy Hosting
print_status "Deploying to Firebase Hosting..."
firebase deploy --only hosting

# Step 7: Post-deployment tasks
echo ""
print_status "Deployment completed successfully!"
echo ""
echo "======================================"
echo "🎉 Deployment Summary"
echo "======================================"
echo "✅ Next.js application built"
echo "✅ Firebase Functions built"
echo "✅ Firestore rules deployed"
echo "✅ Storage rules deployed"
echo "✅ Cloud Functions deployed"
echo "✅ Hosting deployed"
echo ""
echo "🌐 Your app is now live at:"
echo "   https://estait-1fdbe.web.app"
echo ""
echo "📊 View deployment details at:"
echo "   https://console.firebase.google.com/project/estait-1fdbe"
echo ""
echo "======================================"
echo ""
print_warning "Next Steps:"
echo "1. Set up environment variables in Firebase Console"
echo "2. Configure Wise Agent OAuth credentials"
echo "3. Set up MLS API keys"
echo "4. Test the production deployment"
echo ""
echo "Refer to DEPLOYMENT_GUIDE.md for detailed instructions"