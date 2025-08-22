import { Hono } from 'hono'
import { SignJWT, jwtVerify } from 'jose'
import type { Env } from '../index'

export const authRoutes = new Hono<{ Bindings: Env }>()

// Simple rate limiting (in production, use a proper rate limiting library)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(ip: string, limit: number = 5, windowMs: number = 15 * 60 * 1000): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs })
    return true
  }
  
  if (record.count >= limit) {
    return false
  }
  
  record.count++
  return true
}

// Generate PKCE code verifier and challenge
function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

// Login endpoint - redirect to Auth0 with PKCE
authRoutes.get('/login', async (c) => {
  // Rate limiting
  const clientIP = c.req.header('CF-Connecting-IP') || 'unknown'
  if (!checkRateLimit(clientIP)) {
    return c.json({ error: 'Too many requests. Please try again later.' }, 429)
  }

  // Resolve domain and client id from environment
  const issuer = c.env.AUTH0_ISSUER_BASE_URL || ''
  const resolvedDomain = c.env.AUTH0_DOMAIN || (issuer ? issuer.replace(/^https?:\/\//, '').replace(/\/$/, '') : undefined)
  const resolvedClientId = c.env.AUTH0_CLIENT_ID

  const missing: string[] = []
  if (!resolvedDomain) missing.push('AUTH0_DOMAIN | AUTH0_ISSUER_BASE_URL')
  if (!resolvedClientId) missing.push('AUTH0_CLIENT_ID')

  if (missing.length) {
    return c.json({
      error: 'Auth0 is not configured',
      missing,
      hint: 'Set these environment variables as secrets on the Worker'
    }, 500)
  }

  const redirectUri = c.env.AUTH0_REDIRECT_URI || 'https://pharmx-api.kasimhussain333.workers.dev/api/v1/auth/callback'
  
  // Generate PKCE parameters
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)
  const state = crypto.randomUUID()
  
  // Store PKCE verifier and state
  await c.env.SESSIONS.put(`pkce_${state}`, codeVerifier, { expirationTtl: 600 }) // 10 minutes
  
  const authUrl = new URL(`https://${resolvedDomain}/authorize`)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', resolvedClientId as string)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', 'openid profile email')
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('code_challenge', codeChallenge)
  authUrl.searchParams.set('code_challenge_method', 'S256')
  
  return c.redirect(authUrl.toString())
})

// Callback endpoint - handle Auth0 callback with PKCE verification
authRoutes.get('/callback', async (c) => {
  // Rate limiting
  const clientIP = c.req.header('CF-Connecting-IP') || 'unknown'
  if (!checkRateLimit(clientIP)) {
    return c.json({ error: 'Too many requests. Please try again later.' }, 429)
  }

  const code = c.req.query('code')
  const state = c.req.query('state')
  
  if (!code || !state) {
    return c.json({ error: 'Invalid callback parameters' }, 400)
  }
  
  try {
    // Verify PKCE state and get code verifier
    const storedVerifier = await c.env.SESSIONS.get(`pkce_${state}`)
    if (!storedVerifier) {
      return c.json({ error: 'Invalid or expired state parameter' }, 400)
    }
    
    // Clean up PKCE data
    await c.env.SESSIONS.delete(`pkce_${state}`)
    
    const issuer = c.env.AUTH0_ISSUER_BASE_URL || ''
    const resolvedDomain = c.env.AUTH0_DOMAIN || (issuer ? issuer.replace(/^https?:\/\//, '').replace(/\/$/, '') : undefined)
    const resolvedClientId = c.env.AUTH0_CLIENT_ID

    const missing: string[] = []
    if (!resolvedDomain) missing.push('AUTH0_DOMAIN | AUTH0_ISSUER_BASE_URL')
    if (!resolvedClientId) missing.push('AUTH0_CLIENT_ID')
    if (!c.env.AUTH0_CLIENT_SECRET) missing.push('AUTH0_CLIENT_SECRET')

    if (missing.length) {
      return c.json({ error: 'Auth0 is not configured', missing }, 500)
    }

    // Exchange code for tokens with PKCE
    const tokenResponse = await fetch(`https://${resolvedDomain}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: resolvedClientId,
        client_secret: c.env.AUTH0_CLIENT_SECRET,
        code,
        redirect_uri: c.env.AUTH0_REDIRECT_URI || 'https://pharmx-api.kasimhussain333.workers.dev/api/v1/auth/callback',
        code_verifier: storedVerifier,
      }),
    })
    
    const tokens = await tokenResponse.json()
    
    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokens)
      throw new Error('Failed to exchange code for tokens')
    }
    
    // Get user info
    const userResponse = await fetch(`https://${resolvedDomain}/userinfo`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    
    if (!userResponse.ok) {
      throw new Error('Failed to get user info')
    }
    
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

// Refresh token endpoint
authRoutes.post('/refresh', async (c) => {
  const refreshToken = c.req.header('X-Refresh-Token')
  
  if (!refreshToken) {
    return c.json({ error: 'No refresh token provided' }, 400)
  }
  
  try {
    const issuer = c.env.AUTH0_ISSUER_BASE_URL || ''
    const resolvedDomain = c.env.AUTH0_DOMAIN || (issuer ? issuer.replace(/^https?:\/\//, '').replace(/\/$/, '') : undefined)
    const resolvedClientId = c.env.AUTH0_CLIENT_ID
    
    if (!resolvedDomain || !resolvedClientId || !c.env.AUTH0_CLIENT_SECRET) {
      return c.json({ error: 'Auth0 not configured' }, 500)
    }
    
    const tokenResponse = await fetch(`https://${resolvedDomain}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: resolvedClientId,
        client_secret: c.env.AUTH0_CLIENT_SECRET,
        refresh_token: refreshToken,
      }),
    })
    
    const tokens = await tokenResponse.json()
    
    if (!tokenResponse.ok) {
      return c.json({ error: 'Token refresh failed' }, 400)
    }
    
    return c.json({ 
      access_token: tokens.access_token,
      expires_in: tokens.expires_in 
    })
  } catch (error) {
    console.error('Token refresh error:', error)
    return c.json({ error: 'Token refresh failed' }, 500)
  }
})
