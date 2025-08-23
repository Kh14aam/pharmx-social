#!/bin/bash

# Setup Google OAuth environment variables for PharmX Worker API
# This replaces the old Auth0 configuration with direct Google OAuth

echo -e "\033[32mSetting up Google OAuth environment variables for PharmX Worker API\033[0m"
echo ""

# Replace these with your actual Google OAuth values
GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"      # From Google Cloud Console
GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET"  # From Google Cloud Console
FRONTEND_URL="https://chat.pharmx.co.uk"      # Your frontend URL

echo -e "\033[33mSetting Google OAuth Client ID...\033[0m"
echo "Enter: $GOOGLE_CLIENT_ID"
wrangler secret put GOOGLE_CLIENT_ID

echo -e "\033[33mSetting Google OAuth Client Secret...\033[0m"
echo "Enter: $GOOGLE_CLIENT_SECRET"
wrangler secret put GOOGLE_CLIENT_SECRET

echo -e "\033[33mSetting Frontend URL...\033[0m"
echo "Enter: $FRONTEND_URL"
wrangler secret put FRONTEND_URL

echo -e "\033[33mSetting Google OAuth Redirect URI...\033[0m"
echo -e "\033[31mIMPORTANT: This should be your worker's /oauth/callback endpoint, NOT Auth0!\033[0m"
GOOGLE_REDIRECT_URI="https://pharmx-api.kasimhussain333.workers.dev/oauth/callback"
echo "Enter: $GOOGLE_REDIRECT_URI"
wrangler secret put GOOGLE_REDIRECT_URI

echo ""
echo -e "\033[32mSetup complete! Your Google OAuth configuration has been added to the Worker.\033[0m"
echo ""
echo -e "\033[33mNext steps:\033[0m"
echo "1. Ensure your Google Cloud Console OAuth 2.0 client has this redirect URI: $GOOGLE_REDIRECT_URI"
echo "2. Deploy your worker: wrangler deploy"
echo "3. Test the login flow from your frontend"
echo ""
echo -e "\033[36mThe OAuth flow will now be:\033[0m"
echo "Frontend -> Worker /login -> Google OAuth -> Worker /oauth/callback -> Frontend /auth/callback"