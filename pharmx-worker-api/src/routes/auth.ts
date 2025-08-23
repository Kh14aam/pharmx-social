import { Hono } from 'hono'
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

// Verify Auth0 token endpoint
authRoutes.get('/verify', async (c) => {
  const authHeader = c.req.header('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'No token provided' }, 401)
  }
  
  const token = authHeader.slice(7)
  
  try {
    // Verify Auth0 access token by calling Auth0's userinfo endpoint
    const issuer = c.env.AUTH0_ISSUER_BASE_URL || ''
    const resolvedDomain = c.env.AUTH0_DOMAIN || (issuer ? issuer.replace(/^https?:\/\//, '').replace(/\/$/, '') : undefined)
    
    if (!resolvedDomain) {
      return c.json({ error: 'Auth0 not configured' }, 500)
    }
    
    const userResponse = await fetch(`https://${resolvedDomain}/userinfo`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    
    if (!userResponse.ok) {
      return c.json({ error: 'Invalid token' }, 401)
    }
    
    const user = await userResponse.json()
    
    return c.json({ 
      valid: true,
      user: user 
    })
  } catch (error) {
    return c.json({ error: 'Invalid token' }, 401)
  }
})

// Logout endpoint
authRoutes.post('/logout', async (c) => {
  // For Auth0, logout is handled on the frontend
  return c.json({ success: true })
})
