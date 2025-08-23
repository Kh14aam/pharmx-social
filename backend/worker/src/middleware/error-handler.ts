import { createMiddleware } from 'hono/factory'
import type { Env } from '../index'

interface ErrorDetails {
  message: string
  stack?: string
  code?: string
  status?: number
  timestamp: string
  path: string
  method: string
  userId?: string
  userAgent?: string
  ip?: string
}

export const errorHandler = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  try {
    await next()
  } catch (error) {
    console.error('Unhandled error:', error)
    
    const errorDetails: ErrorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      stack: error instanceof Error ? error.stack : undefined,
      code: error instanceof Error ? (error as any).code : undefined,
      status: (error as any)?.status || 500,
      timestamp: new Date().toISOString(),
      path: c.req.path,
      method: c.req.method,
      userId: c.get('userId'),
      userAgent: c.req.header('User-Agent'),
      ip: c.req.header('CF-Connecting-IP') || 
          c.req.header('X-Forwarded-For') || 
          c.req.header('X-Real-IP')
    }
    
    // Log error details for monitoring
    console.error('Error details:', JSON.stringify(errorDetails, null, 2))
    
    // Store error in KV for monitoring (if available)
    try {
      if (c.env.SESSIONS) {
        const errorKey = `error:${Date.now()}:${c.req.path}`
        await c.env.SESSIONS.put(errorKey, JSON.stringify(errorDetails), {
          expirationTtl: 86400 // 24 hours
        })
      }
    } catch (storageError) {
      console.error('Failed to store error details:', storageError)
    }
    
    // Determine appropriate error response
    let statusCode = 500
    let errorMessage = 'Internal server error'
    let errorCode = 'INTERNAL_ERROR'
    
    if (error instanceof Error) {
      // Handle specific error types
      if (error.message.includes('not found') || error.message.includes('Not Found')) {
        statusCode = 404
        errorMessage = 'Resource not found'
        errorCode = 'NOT_FOUND'
      } else if (error.message.includes('unauthorized') || error.message.includes('Unauthorized')) {
        statusCode = 401
        errorMessage = 'Unauthorized access'
        errorCode = 'UNAUTHORIZED'
      } else if (error.message.includes('forbidden') || error.message.includes('Forbidden')) {
        statusCode = 403
        errorMessage = 'Access forbidden'
        errorCode = 'FORBIDDEN'
      } else if (error.message.includes('validation') || error.message.includes('Validation')) {
        statusCode = 400
        errorMessage = 'Validation error'
        errorCode = 'VALIDATION_ERROR'
      } else if (error.message.includes('rate limit') || error.message.includes('Rate limit')) {
        statusCode = 429
        errorMessage = 'Rate limit exceeded'
        errorCode = 'RATE_LIMIT_EXCEEDED'
      } else if (error.message.includes('timeout') || error.message.includes('Timeout')) {
        statusCode = 408
        errorMessage = 'Request timeout'
        errorCode = 'TIMEOUT'
      }
    }
    
    // Check if it's a database error
    if (error instanceof Error && error.message.includes('database')) {
      statusCode = 503
      errorMessage = 'Database service unavailable'
      errorCode = 'DATABASE_ERROR'
    }
    
    // Check if it's a WebRTC/WebSocket error
    if (error instanceof Error && (
      error.message.includes('WebRTC') || 
      error.message.includes('WebSocket') ||
      error.message.includes('ICE')
    )) {
      statusCode = 503
      errorMessage = 'Voice service temporarily unavailable'
      errorCode = 'VOICE_SERVICE_ERROR'
    }
    
    // Return appropriate error response
    return c.json({
      error: {
        code: errorCode,
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
        timestamp: errorDetails.timestamp,
        requestId: crypto.randomUUID()
      }
    }, statusCode)
  }
})

// Specific error handlers for different scenarios
export const handleDatabaseError = (error: any): { status: number; message: string; code: string } => {
  if (error.message.includes('UNIQUE constraint failed')) {
    return { status: 409, message: 'Resource already exists', code: 'DUPLICATE_RESOURCE' }
  }
  
  if (error.message.includes('FOREIGN KEY constraint failed')) {
    return { status: 400, message: 'Invalid reference', code: 'INVALID_REFERENCE' }
  }
  
  if (error.message.includes('NOT NULL constraint failed')) {
    return { status: 400, message: 'Required field missing', code: 'MISSING_REQUIRED_FIELD' }
  }
  
  if (error.message.includes('CHECK constraint failed')) {
    return { status: 400, message: 'Invalid data value', code: 'INVALID_DATA_VALUE' }
  }
  
  return { status: 500, message: 'Database error', code: 'DATABASE_ERROR' }
}

export const handleWebRTCError = (error: any): { status: number; message: string; code: string } => {
  if (error.message.includes('ICE connection failed')) {
    return { status: 503, message: 'Connection failed - please try again', code: 'ICE_CONNECTION_FAILED' }
  }
  
  if (error.message.includes('Media stream error')) {
    return { status: 400, message: 'Microphone access required', code: 'MEDIA_ACCESS_ERROR' }
  }
  
  if (error.message.includes('Peer connection failed')) {
    return { status: 503, message: 'Call setup failed - please try again', code: 'PEER_CONNECTION_FAILED' }
  }
  
  return { status: 503, message: 'Voice service error', code: 'VOICE_SERVICE_ERROR' }
}

export const handleAuthError = (error: any): { status: number; message: string; code: string } => {
  if (error.message.includes('JWT expired')) {
    return { status: 401, message: 'Token expired - please login again', code: 'TOKEN_EXPIRED' }
  }
  
  if (error.message.includes('Invalid signature')) {
    return { status: 401, message: 'Invalid token', code: 'INVALID_TOKEN' }
  }
  
  if (error.message.includes('Missing audience')) {
    return { status: 401, message: 'Invalid token audience', code: 'INVALID_TOKEN_AUDIENCE' }
  }
  
  if (error.message.includes('Missing issuer')) {
    return { status: 401, message: 'Invalid token issuer', code: 'INVALID_TOKEN_ISSUER' }
  }
  
  return { status: 401, message: 'Authentication failed', code: 'AUTHENTICATION_FAILED' }
}

// Recovery strategies for different error types
export const attemptRecovery = async (error: any, context: any): Promise<boolean> => {
  try {
    // Database connection recovery
    if (error.message.includes('database') && context.env?.DB) {
      // Try to ping the database
      await context.env.DB.prepare('SELECT 1').first()
      return true
    }
    
    // WebSocket connection recovery
    if (error.message.includes('WebSocket') && context.webSocket) {
      if (context.webSocket.readyState === WebSocket.CLOSED) {
        // Attempt to reconnect
        return false // Let the client handle reconnection
      }
    }
    
    // Rate limit recovery - wait and retry
    if (error.message.includes('rate limit')) {
      await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
      return true
    }
    
    return false
  } catch (recoveryError) {
    console.error('Recovery attempt failed:', recoveryError)
    return false
  }
} 