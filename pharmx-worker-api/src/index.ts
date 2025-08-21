import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authRoutes } from './routes/auth'
import { profileRoutes } from './routes/profile'
import { usersRoutes } from './routes/users'
import { chatsRoutes } from './routes/chats'
import uploadRoutes from './routes/upload'

// Export Durable Objects
export { MatchmakingQueue } from './durable-objects/MatchmakingQueue'
export { ChatRoom } from './durable-objects/ChatRoom'

export interface Env {
  DB: D1Database
  SESSIONS: KVNamespace
  AVATARS: R2Bucket
  MATCHMAKING_QUEUE: DurableObjectNamespace
  CHAT_ROOMS: DurableObjectNamespace
  AUTH0_DOMAIN: string
  AUTH0_CLIENT_ID: string
  AUTH0_CLIENT_SECRET: string
  JWT_SECRET: string
  FRONTEND_URL: string
  TURN_USERNAME?: string
  TURN_CREDENTIAL?: string
  ENVIRONMENT?: string
}

// Create the main Hono app
const app = new Hono<{ Bindings: Env }>()

// Configure CORS for your frontend
app.use('/*', cors({
  origin: (origin) => {
    const allowedOrigins = [
      'https://chat.pharmx.co.uk',
      'https://pharmx-social.pages.dev',
      'http://localhost:3000' // for local development
    ]
    return allowedOrigins.includes(origin) ? origin : allowedOrigins[0]
  },
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
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

export default {
  fetch: app.fetch,
}
