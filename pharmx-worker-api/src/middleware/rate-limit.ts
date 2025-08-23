import { createMiddleware } from 'hono/factory'
import type { Env } from '../index'

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  message?: string
  statusCode?: number
}

export const createRateLimit = (config: RateLimitConfig) => {
  return createMiddleware<{ Bindings: Env }>(async (c, next) => {
    const ip = c.req.header('CF-Connecting-IP') || 
               c.req.header('X-Forwarded-For') || 
               c.req.header('X-Real-IP') || 
               'unknown'
    
    const key = `rate_limit:${ip}:${c.req.path}`
    const now = Date.now()
    const windowStart = Math.floor(now / config.windowMs) * config.windowMs
    
    try {
      // Get current rate limit data
      const currentData = await c.env.SESSIONS.get(key)
      let rateLimitData: { count: number; resetTime: number }
      
      if (currentData) {
        rateLimitData = JSON.parse(currentData)
        
        // If window has passed, reset
        if (now >= rateLimitData.resetTime) {
          rateLimitData = { count: 1, resetTime: windowStart + config.windowMs }
        } else {
          rateLimitData.count++
        }
      } else {
        rateLimitData = { count: 1, resetTime: windowStart + config.windowMs }
      }
      
      // Check if limit exceeded
      if (rateLimitData.count > config.maxRequests) {
        const retryAfter = Math.ceil((rateLimitData.resetTime - now) / 1000)
        
        return c.json({
          error: config.message || 'Rate limit exceeded',
          retryAfter,
          limit: config.maxRequests,
          windowMs: config.windowMs
        }, config.statusCode || 429)
      }
      
      // Store updated rate limit data
      await c.env.SESSIONS.put(key, JSON.stringify(rateLimitData), {
        expirationTtl: Math.ceil(config.windowMs / 1000) + 60 // Add 1 minute buffer
      })
      
      // Add rate limit headers
      c.header('X-RateLimit-Limit', config.maxRequests.toString())
      c.header('X-RateLimit-Remaining', Math.max(0, config.maxRequests - rateLimitData.count).toString())
      c.header('X-RateLimit-Reset', rateLimitData.resetTime.toString())
      
      await next()
    } catch (error) {
      console.error('Rate limiting error:', error)
      // Continue without rate limiting if there's an error
      await next()
    }
  })
}

// Predefined rate limit configurations
export const strictRateLimit = createRateLimit({
  windowMs: 60000, // 1 minute
  maxRequests: 30,
  message: 'Too many requests. Please try again later.',
  statusCode: 429
})

export const moderateRateLimit = createRateLimit({
  windowMs: 60000, // 1 minute
  maxRequests: 100,
  message: 'Rate limit exceeded. Please slow down.',
  statusCode: 429
})

export const lenientRateLimit = createRateLimit({
  windowMs: 60000, // 1 minute
  maxRequests: 300,
  message: 'Too many requests.',
  statusCode: 429
})

// Special rate limits for specific endpoints
export const authRateLimit = createRateLimit({
  windowMs: 300000, // 5 minutes
  maxRequests: 10,
  message: 'Too many authentication attempts. Please try again later.',
  statusCode: 429
})

export const uploadRateLimit = createRateLimit({
  windowMs: 60000, // 1 minute
  maxRequests: 5,
  message: 'Too many upload attempts. Please wait before uploading again.',
  statusCode: 429
}) 