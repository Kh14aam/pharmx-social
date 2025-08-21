import { Hono } from 'hono'
import { SignJWT, jwtVerify } from 'jose'
import type { Env } from '../index'

export const authRoutes = new Hono<{ Bindings: Env }>()

// Login endpoint - redirect to Auth0
authRoutes.get('/login', (c) => {
  // Resolve domain and client id from multiple possible variable names
  const issuer = c.env.AUTH0_ISSUER_BASE_URL || c.env.AUTH0_BASE_URL || ''
  const resolvedDomain = c.env.AUTH0_DOMAIN || (issuer ? issuer.replace(/^https?:\/\//, '').replace(/\/$/, '') : undefined)
  const resolvedClientId = c.env.AUTH0_CLIENT_ID || c.env.NEXT_PUBLIC_AUTH0_CLIENT_ID

  const missing: string[] = []
  if (!resolvedDomain) missing.push('AUTH0_DOMAIN | AUTH0_ISSUER_BASE_URL')
  if (!resolvedClientId) missing.push('AUTH0_CLIENT_ID | NEXT_PUBLIC_AUTH0_CLIENT_ID')

  if (missing.length) {
    return c.json({
      error: 'Auth0 is not configured',
      missing,
      hint: 'Set these environment variables on the Worker (Wrangler vars/secrets)'
    }, 500)
  }

  const redirectUri = c.env.AUTH0_REDIRECT_URI || 'https://pharmx-api.kasimhussain333.workers.dev/api/v1/auth/callback'
  const authUrl = new URL(`https://${resolvedDomain}/authorize`)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', resolvedClientId as string)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', 'openid profile email')
  authUrl.searchParams.set('connection', 'google-oauth2') // Force Google OAuth
  authUrl.searchParams.set('state', crypto.randomUUID())
  
  return c.redirect(authUrl.toString())
})

// Callback endpoint - handle Auth0 callback
authRoutes.get('/callback', async (c) => {
  const code = c.req.query('code')
  const state = c.req.query('state')
  
  if (!code) {
    return c.json({ error: 'No authorization code provided' }, 400)
  }
  
  try {
    const issuer = c.env.AUTH0_ISSUER_BASE_URL || c.env.AUTH0_BASE_URL || ''
    const resolvedDomain = c.env.AUTH0_DOMAIN || (issuer ? issuer.replace(/^https?:\/\//, '').replace(/\/$/, '') : undefined)
    const resolvedClientId = c.env.AUTH0_CLIENT_ID || c.env.NEXT_PUBLIC_AUTH0_CLIENT_ID

    const missing: string[] = []
    if (!resolvedDomain) missing.push('AUTH0_DOMAIN | AUTH0_ISSUER_BASE_URL')
    if (!resolvedClientId) missing.push('AUTH0_CLIENT_ID | NEXT_PUBLIC_AUTH0_CLIENT_ID')
    if (!c.env.AUTH0_CLIENT_SECRET) missing.push('AUTH0_CLIENT_SECRET')

    if (missing.length) {
      return c.json({ error: 'Auth0 is not configured', missing }, 500)
    }

    // Exchange code for tokens
    const tokenResponse = await fetch(`https://${resolvedDomain}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: resolvedClientId,
        client_secret: c.env.AUTH0_CLIENT_SECRET,
        code,
        redirect_uri: c.env.AUTH0_REDIRECT_URI || 'https://pharmx-api.kasimhussain333.workers.dev/api/v1/auth/callback',
      }),
    })
    
    const tokens = await tokenResponse.json()
    
    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for tokens')
    }
    
    // Get user info
    const userResponse = await fetch(`https://${resolvedDomain}/userinfo`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    
    const user = await userResponse.json()
    
    // Create session JWT
    const secret = new TextEncoder().encode(c.env.JWT_SECRET)
    const jwt = await new SignJWT({ 
      sub: user.sub,
      email: user.email,
      name: user.name,
      picture: user.picture,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret)
    
    // Store session in KV
    const sessionId = crypto.randomUUID()
    await c.env.SESSIONS.put(sessionId, JSON.stringify({
      userId: user.sub,
      email: user.email,
      name: user.name,
      picture: user.picture,
      createdAt: new Date().toISOString(),
    }), {
      expirationTtl: 86400, // 24 hours
    })
    
    // Redirect to frontend with session token
    const frontendUrl = c.env.FRONTEND_URL || 'https://chat.pharmx.co.uk'
    const redirectUrl = new URL(`${frontendUrl}/auth/callback`)
    redirectUrl.searchParams.set('token', jwt)
    redirectUrl.searchParams.set('session', sessionId)
    
    return c.redirect(redirectUrl.toString())
  } catch (error) {
    console.error('Auth callback error:', error)
    return c.json({ error: 'Authentication failed' }, 500)
  }
})

// Logout endpoint
authRoutes.post('/logout', async (c) => {
  const sessionId = c.req.header('X-Session-ID')
  
  if (sessionId) {
    await c.env.SESSIONS.delete(sessionId)
  }
  
  return c.json({ success: true })
})

// Verify session endpoint
authRoutes.get('/verify', async (c) => {
  const authHeader = c.req.header('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'No token provided' }, 401)
  }
  
  const token = authHeader.slice(7)
  
  try {
    const secret = new TextEncoder().encode(c.env.JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    
    return c.json({ 
      valid: true,
      user: payload 
    })
  } catch (error) {
    return c.json({ error: 'Invalid token' }, 401)
  }
})
