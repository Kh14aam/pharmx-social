import { Hono } from 'hono'
import type { Env } from '../index'

const app = new Hono<{ Bindings: Env }>()

// Basic health check
app.get('/', async (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: c.env.ENVIRONMENT || 'development'
  })
})

// Detailed health check
app.get('/detailed', async (c) => {
  const startTime = Date.now()
  const healthChecks: Record<string, any> = {}
  
  try {
    // Database health check
    const dbStart = Date.now()
    try {
      await c.env.DB.prepare('SELECT 1 as health').first()
      healthChecks.database = {
        status: 'healthy',
        responseTime: Date.now() - dbStart,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      healthChecks.database = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - dbStart,
        timestamp: new Date().toISOString()
      }
    }
    
    // R2 Storage health check
    const r2Start = Date.now()
    try {
      if (c.env.AVATAR_STORAGE) {
        // Try to list objects (limited to 1 for performance)
        await c.env.AVATAR_STORAGE.list({ maxKeys: 1 })
        healthChecks.storage = {
          status: 'healthy',
          responseTime: Date.now() - r2Start,
          timestamp: new Date().toISOString()
        }
      } else {
        healthChecks.storage = {
          status: 'not_configured',
          responseTime: Date.now() - r2Start,
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      healthChecks.storage = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - r2Start,
        timestamp: new Date().toISOString()
      }
    }
    
    // KV Storage health check
    const kvStart = Date.now()
    try {
      if (c.env.SESSIONS) {
        // Try to get a non-existent key (should be fast)
        await c.env.SESSIONS.get('health_check_test')
        healthChecks.kv = {
          status: 'healthy',
          responseTime: Date.now() - kvStart,
          timestamp: new Date().toISOString()
        }
      } else {
        healthChecks.kv = {
          status: 'not_configured',
          responseTime: Date.now() - kvStart,
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      healthChecks.kv = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - kvStart,
        timestamp: new Date().toISOString()
      }
    }
    
    // Overall status
    const overallStatus = Object.values(healthChecks).every(
      (check: any) => check.status === 'healthy' || check.status === 'not_configured'
    ) ? 'healthy' : 'degraded'
    
    return c.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      checks: healthChecks,
      version: '1.0.0',
      environment: c.env.ENVIRONMENT || 'development'
    })
    
  } catch (error) {
    return c.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
      checks: healthChecks,
      version: '1.0.0',
      environment: c.env.ENVIRONMENT || 'development'
    }, 500)
  }
})

// Performance metrics
app.get('/metrics', async (c) => {
  try {
    const metrics: Record<string, any> = {}
    
    // Database metrics
    try {
      const userCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first()
      const chatCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM chats WHERE status = "active"').first()
      const messageCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM messages').first()
      const callCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM calls WHERE status = "completed"').first()
      
      metrics.database = {
        users: userCount?.count || 0,
        activeChats: chatCount?.count || 0,
        messages: messageCount?.count || 0,
        completedCalls: callCount?.count || 0
      }
    } catch (error) {
      metrics.database = { error: 'Failed to fetch database metrics' }
    }
    
    // System metrics
    metrics.system = {
      uptime: process.uptime ? Math.floor(process.uptime()) : 'unknown',
      memory: process.memoryUsage ? process.memoryUsage() : 'unknown',
      timestamp: new Date().toISOString()
    }
    
    // Environment info
    metrics.environment = {
      nodeVersion: process.version || 'unknown',
      platform: process.platform || 'unknown',
      arch: process.arch || 'unknown',
      environment: c.env.ENVIRONMENT || 'development'
    }
    
    return c.json(metrics)
    
  } catch (error) {
    return c.json({
      error: 'Failed to fetch metrics',
      timestamp: new Date().toISOString()
    }, 500)
  }
})

// Readiness check for load balancers
app.get('/ready', async (c) => {
  try {
    // Quick database check
    await c.env.DB.prepare('SELECT 1').first()
    
    return c.json({
      status: 'ready',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return c.json({
      status: 'not_ready',
      error: 'Database unavailable',
      timestamp: new Date().toISOString()
    }, 503)
  }
})

// Liveness check for Kubernetes
app.get('/live', async (c) => {
  return c.json({
    status: 'alive',
    timestamp: new Date().toISOString()
  })
})

// Application info
app.get('/info', async (c) => {
  return c.json({
    name: 'PharmX Social API',
    version: '1.0.0',
    description: 'Voice chat and social networking API',
    features: [
      'Voice calling with WebRTC',
      'Real-time messaging',
      'User matching and discovery',
      'Profile management',
      'Authentication with Auth0'
    ],
    technology: {
      runtime: 'Cloudflare Workers',
      framework: 'Hono',
      database: 'Cloudflare D1 (SQLite)',
      storage: 'Cloudflare R2',
      realtime: 'Durable Objects + WebSockets',
      auth: 'Auth0 + JWT'
    },
    environment: c.env.ENVIRONMENT || 'development',
    timestamp: new Date().toISOString()
  })
})

export default app 