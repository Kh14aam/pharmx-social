import { Hono } from 'hono'
import { SignJWT, jwtVerify } from 'jose'
import type { Env } from '../index'

export const authRoutes = new Hono<{ Bindings: Env }>()

// Login endpoint - redirect to Auth0
authRoutes.get('/login', (c) => {
  const authUrl = new URL(`https://${c.env.AUTH0_DOMAIN}/authorize`)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', c.env.AUTH0_CLIENT_ID)
  authUrl.searchParams.set('redirect_uri', c.env.AUTH0_REDIRECT_URI)
  authUrl.searchParams.set('scope', 'openid profile email')
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
    // Exchange code for tokens
    const tokenResponse = await fetch(`https://${c.env.AUTH0_DOMAIN}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: c.env.AUTH0_CLIENT_ID,
        client_secret: c.env.AUTH0_CLIENT_SECRET,
        code,
        redirect_uri: c.env.AUTH0_REDIRECT_URI,
      }),
    })
    
    const tokens = await tokenResponse.json()
    
    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for tokens')
    }
    
    // Get user info
    const userResponse = await fetch(`https://${c.env.AUTH0_DOMAIN}/userinfo`, {
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
    const redirectUrl = new URL(c.env.FRONTEND_URL)
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
