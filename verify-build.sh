#!/bin/bash

# Build Verification Script for Estait Platform
# This script verifies that all components build successfully

echo "================================================"
echo "Estait Build Verification Script"
echo "================================================"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track overall success
OVERALL_SUCCESS=true

# Function to check command success
check_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
        OVERALL_SUCCESS=false
    fi
}

# 1. Check Next.js Build
echo "1. Verifying Next.js application build..."
echo "----------------------------------------"
npm run build > /tmp/nextjs-build.log 2>&1
check_status $? "Next.js build"

# 2. Check Next.js Type Checking
echo ""
echo "2. Running TypeScript type check..."
echo "----------------------------------------"
npx tsc --noEmit > /tmp/typecheck.log 2>&1
check_status $? "TypeScript type checking"

# 3. Check Linting
echo ""
echo "3. Running ESLint..."
echo "----------------------------------------"
npm run lint > /tmp/lint.log 2>&1
check_status $? "ESLint validation"

# 4. Check Firebase Functions Build
echo ""
echo "4. Verifying Firebase Functions build..."
echo "----------------------------------------"
cd /home/user/estait-95667/functions
npm run build > /tmp/functions-build.log 2>&1
FUNCTIONS_BUILD_STATUS=$?
cd /home/user/estait-95667
check_status $FUNCTIONS_BUILD_STATUS "Firebase Functions build"

# 5. Check Firebase Functions Linting
echo ""
echo "5. Running Firebase Functions linting..."
echo "----------------------------------------"
cd /home/user/estait-95667/functions
npm run lint > /tmp/functions-lint.log 2>&1
FUNCTIONS_LINT_STATUS=$?
cd /home/user/estait-95667
check_status $FUNCTIONS_LINT_STATUS "Firebase Functions linting"

# 6. Check JSON Configuration Files
echo ""
echo "6. Validating JSON configuration files..."
echo "----------------------------------------"
python3 -m json.tool firestore.indexes.json > /dev/null 2>&1
check_status $? "firestore.indexes.json validation"

python3 -m json.tool firebase.json > /dev/null 2>&1
check_status $? "firebase.json validation"

python3 -m json.tool tsconfig.json > /dev/null 2>&1
check_status $? "tsconfig.json validation"

# Final Report
echo ""
echo "================================================"
if [ "$OVERALL_SUCCESS" = true ]; then
    echo -e "${GREEN}BUILD VERIFICATION SUCCESSFUL!${NC}"
    echo "All checks passed. The application is ready for deployment."
else
    echo -e "${RED}BUILD VERIFICATION FAILED!${NC}"
    echo "Please check the log files in /tmp/ for details:"
    echo "  - /tmp/nextjs-build.log"
    echo "  - /tmp/typecheck.log"
    echo "  - /tmp/lint.log"
    echo "  - /tmp/functions-build.log"
    echo "  - /tmp/functions-lint.log"
fi
echo "================================================"

# Exit with appropriate status code
if [ "$OVERALL_SUCCESS" = true ]; then
    exit 0
else
    exit 1
fi