import { createMiddleware } from 'hono/factory'
import { jwtVerify } from 'jose'
import type { Env } from '../index'

export const verifyAuth = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  
  const token = authHeader.slice(7)
  
  try {
    const secret = new TextEncoder().encode(c.env.JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    
    // Set user ID in context for use in routes
    c.set('userId', payload.sub as string)
    c.set('userEmail', payload.email as string)
    
    await next()
  } catch (error) {
    return c.json({ error: 'Invalid token' }, 401)
  }
})
