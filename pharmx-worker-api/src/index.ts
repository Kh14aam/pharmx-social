import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authRoutes } from './routes/auth'
import { profileRoutes } from './routes/profile'
import { usersRoutes } from './routes/users'
import { chatsRoutes } from './routes/chats'
import uploadRoutes from './routes/upload'
import diagnosticRoutes from './routes/diagnostic'

// Export Durable Objects
export { MatchmakingQueue } from './durable-objects/MatchmakingQueue'
export { ChatRoom } from './durable-objects/ChatRoom'
export { LobbyDO } from './durable-objects/LobbyDO'

export interface Env {
  DB: D1Database
  SESSIONS: KVNamespace
  AVATARS: R2Bucket
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
}

// Create the main Hono app
const app = new Hono<{ Bindings: Env }>()

// Configure CORS for your frontend
app.use('/*', cors({
  origin: (origin, c) => {
    console.log(`[CORS] Request from origin: ${origin}`)
    const allowedOrigins = [
      'https://chat.pharmx.co.uk',
      'https://pharmx-social.pages.dev',
      'https://pharmx-social.vercel.app',
      'http://localhost:3000',
      'http://localhost:3001'
    ]
    
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) {
      console.log('[CORS] No origin header, allowing request')
      return null
    }
    
    // Check if origin is allowed
    if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      console.log(`[CORS] Allowed origin: ${origin}`)
      return origin
    }
    
    // Log rejected origin but still allow it for now to debug
    console.log(`[CORS] WARNING: Unknown origin ${origin}, allowing for debugging`)
    return origin // Temporarily allow all origins for debugging
  },
  allowHeaders: ['Content-Type', 'Authorization', 'X-Session-ID', 'Accept'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  exposeHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 86400,
  credentials: true,
}))

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT || 'development'
  })
})

// API version prefix
const api = app.basePath('/api/v1')

// Mount route groups
api.route('/auth', authRoutes)
api.route('/profile', profileRoutes)
api.route('/users', usersRoutes)
api.route('/chats', chatsRoutes)
api.route('/upload', uploadRoutes)
api.route('/diagnostic', diagnosticRoutes)

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404)
})

// Error handler
app.onError((err, c) => {
  console.error(`${err}`)
  return c.json({ error: 'Internal Server Error' }, 500)
})

// WebSocket endpoints (handled separately from Hono)
app.get('/match', async (c) => {
  // Forward to MatchmakingQueue Durable Object
  const id = c.env.MATCHMAKING_QUEUE.idFromName('global-queue')
  const queue = c.env.MATCHMAKING_QUEUE.get(id)
  return queue.fetch(c.req.raw)
})

app.get('/room/:roomCode', async (c) => {
  // Forward to ChatRoom Durable Object
  const roomCode = c.req.param('roomCode')
  const id = c.env.CHAT_ROOMS.idFromName(roomCode)
  const room = c.env.CHAT_ROOMS.get(id)
  return room.fetch(c.req.raw)
})

// WebSocket diagnostic endpoint
app.get('/api/v1/ws-test', (c) => {
  return c.json({
    status: 'ok',
    hasLobby: !!c.env.LOBBY,
    wsEndpoint: '/signal/ws',
    wsUrl: 'wss://pharmx-api.kasimhussain333.workers.dev/signal/ws',
    timestamp: new Date().toISOString()
  })
})

// Get TURN credentials endpoint
app.get('/api/v1/turn-credentials', (c) => {
  const iceServers = [
    { urls: ['stun:stun.cloudflare.com:3478'] },
    { urls: ['stun:stun.l.google.com:19302'] },
  ]

  // Add TURN server if credentials are configured
  if (c.env.TURN_USERNAME && c.env.TURN_CREDENTIAL) {
    iceServers.push({
      urls: ['turn:turn.cloudflare.com:3478?transport=udp'],
      username: c.env.TURN_USERNAME,
      credential: c.env.TURN_CREDENTIAL,
    })
  }

  return c.json({ iceServers })
})

// Export default handler with special WebSocket handling
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Check if this is a WebSocket request BEFORE passing to Hono
    const url = new URL(request.url)
    if (url.pathname === '/signal/ws') {
      const upgradeHeader = request.headers.get('Upgrade')
      
      if (upgradeHeader === 'websocket') {
        console.log('[WebSocket] Direct handling WebSocket request to bypass CORS')
        
        if (!env.LOBBY) {
          console.error('[WebSocket] LOBBY Durable Object binding not found!')
          return new Response('WebSocket service not configured', { status: 500 })
        }
        
        // Get the global LobbyDO instance
        const id = env.LOBBY.idFromName('global-lobby')
        const lobby = env.LOBBY.get(id)
        
        // Forward directly to Durable Object, bypassing Hono and CORS
        return lobby.fetch(request)
      }
    }
    
    // For non-WebSocket requests, use Hono app
    return app.fetch(request, env, ctx)
  },
}
