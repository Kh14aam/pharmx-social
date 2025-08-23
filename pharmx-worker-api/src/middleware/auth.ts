import { createMiddleware } from 'hono/factory'
import { jwtVerify, createRemoteJWKSet } from 'jose'
import type { Env } from '../index'

export const verifyAuth = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  
  const token = authHeader.slice(7)
  
  try {
    // Get Auth0 domain from environment
    const issuer = c.env.AUTH0_ISSUER_BASE_URL || ''
    const resolvedDomain = c.env.AUTH0_DOMAIN || (issuer ? issuer.replace(/^https?:\/\//, '').replace(/\/$/, '') : undefined)
    
    if (!resolvedDomain) {
      console.error('[Auth] AUTH0_DOMAIN not configured')
      return c.json({ error: 'Auth0 not configured' }, 500)
    }

    // Create JWKS client for RS256 signature validation
    const JWKS = createRemoteJWKSet(
      new URL(`https://${resolvedDomain}/.well-known/jwks.json`)
    )

    // Verify JWT token with proper validation
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://${resolvedDomain}/`,
      audience: c.env.AUTH0_AUDIENCE || 'https://pharmx-api.kasimhussain333.workers.dev',
      algorithms: ['RS256'] // Only allow RS256 algorithm
    })

    // Validate required claims
    if (!payload.sub || !payload.email) {
      console.error('[Auth] Missing required claims in token')
      return c.json({ error: 'Invalid token claims' }, 401)
    }

    // Set user ID and email in context for use in routes
    c.set('userId', payload.sub as string)
    c.set('userEmail', payload.email as string)
    
    await next()
  } catch (error) {
    console.error('[Auth] JWT verification failed:', error)
    
    // Provide specific error messages for different failure types
    if (error instanceof Error) {
      if (error.message.includes('JWT expired')) {
        return c.json({ error: 'Token expired' }, 401)
      }
      if (error.message.includes('JWT signature verification failed')) {
        return c.json({ error: 'Invalid token signature' }, 401)
      }
      if (error.message.includes('JWT audience claim mismatch')) {
        return c.json({ error: 'Invalid token audience' }, 401)
      }
      if (error.message.includes('JWT issuer claim mismatch')) {
        return c.json({ error: 'Invalid token issuer' }, 401)
      }
    }
    
    return c.json({ error: 'Invalid token' }, 401)
  }
})
