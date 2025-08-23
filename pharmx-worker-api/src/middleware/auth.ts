import { createMiddleware } from 'hono/factory'
import type { Env } from '../index'

export const verifyAuth = createMiddleware<{ Bindings: Env; Variables: { userId: string; userEmail?: string } }>(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[Auth] No authorization header or invalid format')
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const token = authHeader.substring(7) // Remove 'Bearer ' prefix
  
  try {
    console.log('[Auth] Validating token:', token.substring(0, 20) + '...')
    
    // Decode JWT token to extract user information
    const parts = token.split('.')
    if (parts.length !== 3) {
      console.log('[Auth] Invalid JWT format')
      return c.json({ error: 'Invalid token format' }, 401)
    }

    // Decode the payload (base64url decode)
    let payload = parts[1]
    // Add padding if needed for base64 decoding
    while (payload.length % 4) {
      payload += '='
    }
    
    const decodedPayload = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    console.log('[Auth] Decoded JWT payload:', { 
      sub: decodedPayload.sub, 
      email: decodedPayload.email,
      exp: decodedPayload.exp 
    })
    
    // Check if token is expired
    if (decodedPayload.exp && Date.now() >= decodedPayload.exp * 1000) {
      console.log('[Auth] Token expired')
      return c.json({ error: 'Token expired' }, 401)
    }
    
    // Extract user ID and email from Google OAuth token
    const userId = decodedPayload.sub || decodedPayload.user_id || decodedPayload.userId
    const userEmail = decodedPayload.email
    
    console.log('[Auth] Token payload:', { 
      sub: decodedPayload.sub, 
      email: decodedPayload.email,
      name: decodedPayload.name,
      exp: decodedPayload.exp 
    })
    
    if (!userId) {
      console.log('[Auth] No user ID found in token')
      return c.json({ error: 'Invalid token - no user ID' }, 401)
    }
    
    console.log('[Auth] Authentication successful for user:', userId)
    
    // Set user information in context
    c.set('userId', userId)
    if (userEmail) {
      c.set('userEmail', userEmail)
    }
    
    await next()
  } catch (error) {
    console.error('[Auth] Token validation error:', error)
    return c.json({ error: 'Invalid token' }, 401)
  }
})