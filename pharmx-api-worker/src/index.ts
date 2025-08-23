import { Hono } from 'hono'
import { cors } from 'hono/cors'

// Environment interface
export interface Env {
  // OAuth Configuration
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  GOOGLE_REDIRECT_URI: string
  
  // Application Settings
  JWT_SECRET: string
  FRONTEND_URL: string
  ENVIRONMENT: string
}

// Create the main Hono app
const app = new Hono<{ Bindings: Env }>()

// Configure CORS
app.use('*', cors({
  origin: [
    'https://chat.pharmx.co.uk',
    'https://www.chat.pharmx.co.uk',
    'http://localhost:3000',
    'http://localhost:3001'
  ],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}))

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT || 'development',
    message: 'PharmX Social API is running',
    version: '2.0.0'
  })
})

// API version prefix
const api = app.basePath('/api/v1')

// OAuth code exchange endpoint
api.post('/oauth/google/exchange', async (c) => {
  try {
    const env = c.env
    const clientId = env.GOOGLE_CLIENT_ID
    const clientSecret = env.GOOGLE_CLIENT_SECRET
    const redirectUri = env.GOOGLE_REDIRECT_URI

    if (!clientId || !clientSecret || !redirectUri) {
      return c.json({ error: 'Google OAuth not configured' }, 500)
    }

    const body = await c.req.json<{ code?: string }>().catch(() => ({} as { code?: string }))
    const code = body.code
    if (!code) {
      return c.json({ error: 'missing_code' }, 400)
    }

    // Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = await tokenRes.json<any>()
    if (!tokenRes.ok || tokenData.error) {
      console.error('Token exchange failed:', tokenData)
      return c.json({ error: 'token_exchange_failed', details: tokenData }, 400)
    }

    const idToken: string | undefined = tokenData.id_token
    if (!idToken) {
      return c.json({ error: 'missing_id_token' }, 400)
    }

    // Decode ID token (base64url) without Node Buffer
    const parts = idToken.split('.')
    if (parts.length !== 3) {
      return c.json({ error: 'invalid_id_token' }, 400)
    }
    const base64Url = parts[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    const payload = JSON.parse(jsonPayload)

    const user = {
      sub: payload.sub as string | undefined,
      email: payload.email as string | undefined,
      name: (payload.name || payload.given_name || payload.email) as string | undefined,
      picture: payload.picture as string | undefined,
      email_verified: payload.email_verified as boolean | undefined,
    }

    // Generate JWT token for the user
    const jwtToken = await generateJWT(user, env.JWT_SECRET)

    return c.json({ 
      user, 
      tokens: tokenData,
      jwt: jwtToken,
      message: 'Authentication successful'
    })
  } catch (err) {
    console.error('OAuth exchange error:', err)
    return c.json({ error: 'server_error' }, 500)
  }
})

// Test endpoint
api.get('/test', (c) => {
  return c.json({ 
    message: 'API is working',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT || 'development'
  })
})

// 404 handler
app.notFound((c) => {
  return c.json({ 
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
    available_endpoints: [
      '/health',
      '/api/v1/test',
      '/api/v1/oauth/google/exchange'
    ]
  }, 404)
})

// Error handler
app.onError((err, c) => {
  console.error(`Error: ${err}`)
  return c.json({ 
    error: 'Internal Server Error',
    message: 'Something went wrong on our end',
    timestamp: new Date().toISOString()
  }, 500)
})

// Helper function to generate JWT
async function generateJWT(user: any, secret: string): Promise<string> {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  }
  
  const payload = {
    sub: user.sub,
    email: user.email,
    name: user.name,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
  }
  
  const encodedHeader = btoa(JSON.stringify(header))
  const encodedPayload = btoa(JSON.stringify(payload))
  
  const data = `${encodedHeader}.${encodedPayload}`
  const signature = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  ).then(key => crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data)))
  
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
  
  return `${data}.${encodedSignature}`
}

// Export default handler
export default app
