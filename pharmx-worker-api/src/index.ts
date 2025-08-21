import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authRoutes } from './routes/auth'
import { profileRoutes } from './routes/profile'
import { usersRoutes } from './routes/users'
import { chatsRoutes } from './routes/chats'

// Define the environment bindings
export interface Env {
  DB: D1Database
  SESSIONS: KVNamespace
  AUTH0_DOMAIN: string
  AUTH0_CLIENT_ID: string
  AUTH0_CLIENT_SECRET: string
  AUTH0_REDIRECT_URI: string
  JWT_SECRET: string
  FRONTEND_URL: string
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

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404)
})

// Error handler
app.onError((err, c) => {
  console.error(`${err}`)
  return c.json({ error: 'Internal Server Error' }, 500)
})

export default app
