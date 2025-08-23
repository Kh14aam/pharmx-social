# Setup Auth0 environment variables for PharmX Worker API
# Replace the placeholders with your actual Auth0 values

Write-Host "Setting up Auth0 environment variables for PharmX Worker API" -ForegroundColor Green
Write-Host ""

# Replace these with your actual Auth0 values
$AUTH0_DOMAIN = "YOUR_TENANT.auth0.com"  # e.g., dev-abc123.auth0.com
$AUTH0_CLIENT_ID = "YOUR_CLIENT_ID"      # From your Auth0 application settings
$AUTH0_CLIENT_SECRET = "YOUR_CLIENT_SECRET"  # From your Auth0 application settings
$JWT_SECRET = "YOUR_RANDOM_SECRET_HERE"  # Generate a random string (at least 32 chars)

# Set public environment variables
Write-Host "Setting public environment variables..." -ForegroundColor Yellow
wrangler deploy --var AUTH0_DOMAIN:$AUTH0_DOMAIN --var AUTH0_CLIENT_ID:$AUTH0_CLIENT_ID --var AUTH0_REDIRECT_URI:https://pharmx-api.kasimhussain333.workers.dev/api/v1/auth/callback --var FRONTEND_URL:https://chat.pharmx.co.uk

# Set secrets (these will prompt you for values)
Write-Host ""
Write-Host "Setting secrets (you'll be prompted for values)..." -ForegroundColor Yellow
Write-Host "Enter your Auth0 Client Secret when prompted:"
wrangler secret put AUTH0_CLIENT_SECRET

Write-Host ""
Write-Host "Enter a random JWT secret (at least 32 characters) when prompted:"
wrangler secret put JWT_SECRET

Write-Host ""
Write-Host "Setup complete! Your Auth0 configuration has been added to the Worker." -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Ensure your Auth0 application has these URLs configured:"
Write-Host "   - Allowed Callback URL: https://pharmx-api.kasimhussain333.workers.dev/api/v1/auth/callback"
Write-Host "   - Allowed Web Origins: https://chat.pharmx.co.uk"
Write-Host "   - Allowed Logout URLs: https://chat.pharmx.co.uk"
Write-Host "2. Test the login at: https://pharmx-api.kasimhussain333.workers.dev/api/v1/auth/login"
