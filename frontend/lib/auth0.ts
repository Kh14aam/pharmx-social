// Auth0 configuration for Cloudflare Pages
// Note: Auth0 SDK doesn't fully support edge runtime yet
// This is a placeholder configuration

export const auth0Config = {
  baseURL: process.env.AUTH0_BASE_URL || 'https://chat.pharmx.co.uk',
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL || '',
  clientID: process.env.AUTH0_CLIENT_ID || '',
  clientSecret: process.env.AUTH0_CLIENT_SECRET || '',
  secret: process.env.AUTH0_SECRET || '',
  authorizationParams: {
    scope: 'openid profile email',
    audience: process.env.AUTH0_AUDIENCE,
  },
  routes: {
    callback: '/api/auth/callback',
    postLogoutRedirect: '/',
  },
  session: {
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  },
}
