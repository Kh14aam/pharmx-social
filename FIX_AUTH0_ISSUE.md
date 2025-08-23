# Fix Auth0 Issue - Complete Guide

## Problem
You're getting an Auth0 error page when clicking "Continue with Google" instead of being redirected to your onboarding screen. This happens because your application is still trying to authenticate through Auth0 instead of using direct Google OAuth.

## Root Cause
The `GOOGLE_REDIRECT_URI` environment variable in your Cloudflare Worker is likely still pointing to an Auth0 domain instead of your worker's OAuth callback endpoint.

## Solution
Replace the Auth0 authentication flow with direct Google OAuth through your Cloudflare Worker.

## Step-by-Step Fix

### 1. Update Your Cloudflare Worker
Your worker has been updated with:
- A new `/oauth/callback` endpoint that handles Google OAuth redirects
- Proper redirect flow to your frontend callback page

### 2. Set Up Google OAuth Environment Variables

#### Option A: Use the Setup Script (Recommended)
```bash
cd pharmx-worker-api
./setup-google-oauth.sh
```

#### Option B: Manual Setup
```bash
cd pharmx-worker-api

# Set Google OAuth Client ID
wrangler secret put GOOGLE_CLIENT_ID
# Enter your Google OAuth Client ID from Google Cloud Console

# Set Google OAuth Client Secret
wrangler secret put GOOGLE_CLIENT_SECRET
# Enter your Google OAuth Client Secret from Google Cloud Console

# Set Frontend URL
wrangler secret put FRONTEND_URL
# Enter: https://chat.pharmx.co.uk

# Set Google OAuth Redirect URI (CRITICAL!)
wrangler secret put GOOGLE_REDIRECT_URI
# Enter: https://pharmx-api.kasimhussain333.workers.dev/oauth/callback
```

### 3. Configure Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" > "Credentials"
3. Find your OAuth 2.0 Client ID
4. Add this redirect URI: `https://pharmx-api.kasimhussain333.workers.dev/oauth/callback`
5. **Remove any Auth0-related redirect URIs**

### 4. Deploy Your Worker
```bash
cd pharmx-worker-api
wrangler deploy
```

### 5. Test the Flow
1. Go to your frontend: `https://chat.pharmx.co.uk`
2. Click "Find a Voice" → "Continue with Google"
3. You should now be redirected to Google OAuth (not Auth0)
4. After Google authentication, you should be redirected to your onboarding screen

## How the New Flow Works

```
1. User clicks "Continue with Google"
   ↓
2. Frontend redirects to: https://pharmx-api.kasimhussain333.workers.dev/login
   ↓
3. Worker redirects to Google OAuth consent screen
   ↓
4. Google redirects back to: https://pharmx-api.kasimhussain333.workers.dev/oauth/callback
   ↓
5. Worker redirects to: https://chat.pharmx.co.uk/auth/callback?code=...
   ↓
6. Frontend exchanges code for tokens and redirects to onboarding
```

## Important Notes

- **Never set `GOOGLE_REDIRECT_URI` to an Auth0 domain**
- The redirect URI should always point to your worker's `/oauth/callback` endpoint
- Make sure your Google Cloud Console OAuth client has the correct redirect URI
- Your frontend callback page (`/auth/callback`) is already properly configured

## Troubleshooting

### Still seeing Auth0 errors?
1. Check that `GOOGLE_REDIRECT_URI` is set correctly in your worker
2. Verify the redirect URI in Google Cloud Console
3. Clear your browser cache and cookies
4. Check worker logs: `wrangler tail`

### Getting redirect errors?
1. Ensure `FRONTEND_URL` is set correctly in your worker
2. Verify your frontend callback page is accessible
3. Check that the worker is deployed and running

## Files Modified
- `pharmx-worker-api/src/index.ts` - Added OAuth callback endpoint
- `pharmx-worker-api/setup-google-oauth.sh` - Setup script for Linux/Mac
- `pharmx-worker-api/setup-google-oauth.ps1` - Setup script for Windows
- `FIX_AUTH0_ISSUE.md` - This guide

After following these steps, your authentication should work properly without any Auth0 involvement!