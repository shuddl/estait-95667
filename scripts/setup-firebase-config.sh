#!/bin/bash

# Setup Firebase Functions Configuration
# This script sets up the Firebase Functions configuration for production

echo "Setting up Firebase Functions configuration..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "Firebase CLI is not installed. Please install it first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Function to set config
set_config() {
    local key=$1
    local prompt=$2
    local is_secret=$3
    
    echo -n "$prompt: "
    if [ "$is_secret" = "true" ]; then
        read -s value
        echo
    else
        read value
    fi
    
    if [ ! -z "$value" ]; then
        firebase functions:config:set "$key=$value"
        echo "✓ Set $key"
    else
        echo "✗ Skipped $key (no value provided)"
    fi
}

echo "=== Stripe Configuration ==="
set_config "stripe.secret_key" "Enter Stripe Secret Key (sk_test_...)" true
set_config "stripe.webhook_secret" "Enter Stripe Webhook Secret (whsec_...)" true

echo ""
echo "=== Wise Agent Configuration ==="
set_config "wise_agent.client_id" "Enter Wise Agent Client ID"
set_config "wise_agent.client_secret" "Enter Wise Agent Client Secret" true
set_config "wise_agent.redirect_uri" "Enter Wise Agent Redirect URI"

echo ""
echo "=== Follow Up Boss Configuration ==="
set_config "fub.client_id" "Enter FUB Client ID"
set_config "fub.client_secret" "Enter FUB Client Secret" true
set_config "fub.x_system" "Enter FUB X-System (default: estait)"
set_config "fub.x_system_key" "Enter FUB X-System Key" true
set_config "fub.redirect_uri" "Enter FUB Redirect URI"

echo ""
echo "=== Real Geeks Configuration ==="
set_config "realgeeks.client_id" "Enter Real Geeks Client ID"
set_config "realgeeks.client_secret" "Enter Real Geeks Client Secret" true
set_config "realgeeks.redirect_uri" "Enter Real Geeks Redirect URI"

echo ""
echo "=== Real Estate API Configuration ==="
set_config "realestateapi.key" "Enter RealEstateAPI.com Key" true

echo ""
echo "=== Encryption Configuration ==="
set_config "security.encryption_key" "Enter 32-character encryption key" true

echo ""
echo "=== Email Configuration (Optional) ==="
set_config "email.smtp_host" "Enter SMTP Host (e.g., smtp.gmail.com)"
set_config "email.smtp_port" "Enter SMTP Port (e.g., 587)"
set_config "email.smtp_user" "Enter SMTP Username"
set_config "email.smtp_password" "Enter SMTP Password" true
set_config "email.from" "Enter From Email Address"

echo ""
echo "=== Twilio Configuration (Optional) ==="
set_config "twilio.account_sid" "Enter Twilio Account SID"
set_config "twilio.auth_token" "Enter Twilio Auth Token" true
set_config "twilio.phone_number" "Enter Twilio Phone Number"

echo ""
echo "Configuration setup complete!"
echo ""
echo "To view the current configuration, run:"
echo "  firebase functions:config:get"
echo ""
echo "To deploy the configuration to production, run:"
echo "  firebase deploy --only functions"
echo ""
echo "For local development, download the config:"
echo "  firebase functions:config:get > functions/.runtimeconfig.json"