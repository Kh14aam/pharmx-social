# Auth0 Setup for PharmX Worker API

## Required Environment Variables

You need to set the following environment variables for your Cloudflare Worker:

### Step 1: Get Your Auth0 Credentials

1. Log in to your Auth0 Dashboard: https://manage.auth0.com
2. Go to Applications > Your App (or create a new Regular Web Application)
3. Copy these values:
   - **Domain**: Found in Settings tab (e.g., `dev-abc123.auth0.com`)
   - **Client ID**: Found in Settings tab
   - **Client Secret**: Found in Settings tab

### Step 2: Configure Auth0 Application URLs

In your Auth0 application settings, add these URLs:

- **Allowed Callback URLs**: 
  ```
  https://pharmx-api.kasimhussain333.workers.dev/api/v1/auth/callback
  ```
- **Allowed Web Origins**: 
  ```
  https://chat.pharmx.co.uk
  ```
- **Allowed Logout URLs**: 
  ```
  https://chat.pharmx.co.uk
  ```

### Step 3: Set Worker Environment Variables

Run these commands in the `pharmx-worker-api` directory:

#### Option A: Using Wrangler CLI (Recommended)

```powershell
# Set public variables (replace with your actual values)
wrangler secret put AUTH0_DOMAIN
# Enter: your-tenant.auth0.com

wrangler secret put AUTH0_CLIENT_ID
# Enter: your-client-id-from-auth0

wrangler secret put AUTH0_CLIENT_SECRET
# Enter: your-client-secret-from-auth0

wrangler secret put JWT_SECRET
# Enter: any-random-32-character-string-you-generate

# Set non-secret variables during deployment
wrangler deploy --var FRONTEND_URL:https://chat.pharmx.co.uk --var AUTH0_REDIRECT_URI:https://pharmx-api.kasimhussain333.workers.dev/api/v1/auth/callback
```

#### Option B: Using Cloudflare Dashboard

1. Go to https://dash.cloudflare.com
2. Navigate to Workers & Pages > pharmx-api > Settings > Environment Variables
3. Add these variables:

**Regular Variables:**
- `FRONTEND_URL` = `https://chat.pharmx.co.uk`
- `AUTH0_REDIRECT_URI` = `https://pharmx-api.kasimhussain333.workers.dev/api/v1/auth/callback`

**Encrypted Variables (Secrets):**
- `AUTH0_DOMAIN` = Your Auth0 domain (e.g., `dev-abc123.auth0.com`)
- `AUTH0_CLIENT_ID` = Your Auth0 Client ID
- `AUTH0_CLIENT_SECRET` = Your Auth0 Client Secret
- `JWT_SECRET` = A random 32+ character string

### Step 4: Generate a JWT Secret

If you need to generate a random JWT secret, you can use:

```powershell
# PowerShell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
```

Or use an online generator: https://randomkeygen.com/

### Step 5: Test the Configuration

After setting all variables, test your authentication:

```powershell
# Check if Auth0 is configured
curl https://pharmx-api.kasimhussain333.workers.dev/api/v1/auth/login

# This should redirect to Auth0 login page (you'll see HTML response)
# Or if there's still an error, it will show which variables are missing
```

### Step 6: Test Full Authentication Flow

1. Open your browser and go to: https://chat.pharmx.co.uk/login
2. Click "Continue with Google"
3. You should be redirected to Auth0 for authentication
4. After successful login, you'll be redirected back to the app

## Troubleshooting

If authentication isn't working:

1. Check Worker logs in Cloudflare Dashboard
2. Verify all environment variables are set:
   ```powershell
   wrangler secret list
   ```
3. Ensure Auth0 application type is "Regular Web Application"
4. Check that Google social connection is enabled in Auth0
5. Verify callback URLs match exactly (no trailing slashes)

## Need Help?

If you're still having issues, check:
- Worker logs: https://dash.cloudflare.com (Workers & Pages > pharmx-api > Logs)
- Auth0 logs: https://manage.auth0.com (Monitoring > Logs)
