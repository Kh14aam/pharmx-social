# Setup Google OAuth environment variables for PharmX Worker API
# This replaces the old Auth0 configuration with direct Google OAuth

Write-Host "Setting up Google OAuth environment variables for PharmX Worker API" -ForegroundColor Green
Write-Host ""

# Replace these with your actual Google OAuth values
$GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID"      # From Google Cloud Console
$GOOGLE_CLIENT_SECRET = "YOUR_GOOGLE_CLIENT_SECRET"  # From Google Cloud Console
$FRONTEND_URL = "https://chat.pharmx.co.uk"      # Your frontend URL

Write-Host "Setting Google OAuth Client ID..." -ForegroundColor Yellow
wrangler secret put GOOGLE_CLIENT_ID
Write-Host "Enter: $GOOGLE_CLIENT_ID" -ForegroundColor Cyan

Write-Host "Setting Google OAuth Client Secret..." -ForegroundColor Yellow
wrangler secret put GOOGLE_CLIENT_SECRET
Write-Host "Enter: $GOOGLE_CLIENT_SECRET" -ForegroundColor Cyan

Write-Host "Setting Frontend URL..." -ForegroundColor Yellow
wrangler secret put FRONTEND_URL
Write-Host "Enter: $FRONTEND_URL" -ForegroundColor Cyan

Write-Host "Setting Google OAuth Redirect URI..." -ForegroundColor Yellow
Write-Host "IMPORTANT: This should be your worker's /oauth/callback endpoint, NOT Auth0!" -ForegroundColor Red
$GOOGLE_REDIRECT_URI = "https://pharmx-api.kasimhussain333.workers.dev/oauth/callback"
wrangler secret put GOOGLE_REDIRECT_URI
Write-Host "Enter: $GOOGLE_REDIRECT_URI" -ForegroundColor Cyan

Write-Host ""
Write-Host "Setup complete! Your Google OAuth configuration has been added to the Worker." -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Ensure your Google Cloud Console OAuth 2.0 client has this redirect URI: $GOOGLE_REDIRECT_URI"
Write-Host "2. Deploy your worker: wrangler deploy"
Write-Host "3. Test the login flow from your frontend"
Write-Host ""
Write-Host "The OAuth flow will now be:" -ForegroundColor Cyan
Write-Host "Frontend -> Worker /login -> Google OAuth -> Worker /oauth/callback -> Frontend /auth/callback"