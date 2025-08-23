import { Hono } from 'hono'
import { cors } from 'hono/cors'

// Export Durable Objects
export { MatchmakingQueue } from './durable-objects/MatchmakingQueue'
export { ChatRoom } from './durable-objects/ChatRoom'
export { LobbyDO } from './durable-objects/LobbyDO'

export interface Env {
  DB: D1Database
  SESSIONS: KVNamespace
  AVATAR_STORAGE: R2Bucket
  MATCHMAKING_QUEUE: DurableObjectNamespace
  CHAT_ROOMS: DurableObjectNamespace
  LOBBY: DurableObjectNamespace
  AUTH0_DOMAIN?: string
  AUTH0_CLIENT_ID?: string
  AUTH0_CLIENT_SECRET?: string
  AUTH0_ISSUER_BASE_URL?: string
  AUTH0_BASE_URL?: string
  AUTH0_AUDIENCE?: string
  NEXT_PUBLIC_AUTH0_CLIENT_ID?: string
  JWT_SECRET: string
  FRONTEND_URL?: string
  TURN_USERNAME?: string
  TURN_CREDENTIAL?: string
  ENVIRONMENT?: string
  // Performance configuration
  MAX_CONCURRENT_CALLS?: string
  MAX_QUEUE_SIZE?: string
  MAX_CONNECTIONS_PER_ROOM?: string
  CALL_TIMEOUT_SECONDS?: string
  QUEUE_TIMEOUT_MS?: string
  RATE_LIMIT_WINDOW_MS?: string
  RATE_LIMIT_MAX_REQUESTS?: string
}

// Create the main Hono app
const app = new Hono()

// Configure CORS
app.use('/*', cors({
  origin: ['https://chat.pharmx.co.uk', 'http://localhost:3000'],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}))

// Basic health check
app.get('/health', (c) => {
  return c.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'PharmX Social API is running'
  })
})

// API version prefix
const api = app.basePath('/api/v1')

// Basic routes (we'll add the complex ones back gradually)
api.get('/test', (c) => {
  return c.json({ message: 'API is working' })
})

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404)
})

// Error handler
app.onError((err, c) => {
  console.error(`Error: ${err}`)
  return c.json({ error: 'Internal Server Error' }, 500)
})

// Export default handler
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // For now, just use the basic Hono app
    return app.fetch(request, env, ctx)
  },
} 