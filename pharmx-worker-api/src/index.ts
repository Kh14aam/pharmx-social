import { Hono } from 'hono'
import { cors } from 'hono/cors'

// Import route handlers
import profileRoutes from './routes/profile'
import { default as usersRoutes } from './routes/users'
import { default as uploadRoutes } from './routes/upload'
import { default as chatsRoutes } from './routes/chats'

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
  // Google OAuth
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  GOOGLE_REDIRECT_URI?: string
  // Application settings
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

// Google OAuth: Redirect to Google consent
app.get('/login', (c) => {
  const env = (c.env as unknown) as Env
  const clientId = env.GOOGLE_CLIENT_ID
  const redirectUri = env.GOOGLE_REDIRECT_URI

  if (!clientId || !redirectUri) {
    return c.json({ error: 'Google OAuth not configured' }, 500)
  }

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', 'openid email profile')
  authUrl.searchParams.set('access_type', 'offline')
  // Optional UX improvements
  authUrl.searchParams.set('prompt', 'consent')

  return c.redirect(authUrl.toString(), 302)
})

// OAuth callback endpoint - Google will redirect here after user consents
app.get('/auth/callback', async (c) => {
  const env = (c.env as unknown) as Env
  const code = c.req.query('code')
  const error = c.req.query('error')
  
  if (error) {
    // Redirect to frontend with error
    const frontendUrl = env.FRONTEND_URL || 'https://chat.pharmx.co.uk'
    return c.redirect(`${frontendUrl}/auth/callback?error=${error}`, 302)
  }
  
  if (!code) {
    // Redirect to frontend with error
    const frontendUrl = env.FRONTEND_URL || 'https://chat.pharmx.co.uk'
    return c.redirect(`${frontendUrl}/auth/callback?error=missing_code`, 302)
  }
  
  // Redirect to frontend callback with the authorization code
  const frontendUrl = env.FRONTEND_URL || 'https://chat.pharmx.co.uk'
  return c.redirect(`${frontendUrl}/auth/callback?code=${code}`, 302)
})

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

// Mount route handlers
api.route('/profile', profileRoutes)
api.route('/users', usersRoutes)
api.route('/upload', uploadRoutes)
api.route('/chats', chatsRoutes)

// Voice/WebSocket matching endpoint
api.get('/match', async (c) => {
  const upgradeHeader = c.req.header('Upgrade')
  if (upgradeHeader !== 'websocket') {
    return c.text('Expected Upgrade: websocket', 426)
  }

  // Get or create Lobby Durable Object
  const lobbyId = c.env.LOBBY.idFromName('global-lobby')
  const lobby = c.env.LOBBY.get(lobbyId)
  
  return lobby.fetch(c.req.raw)
})

// OAuth code exchange endpoint
api.post('/oauth/google/exchange', async (c) => {
  try {
    const env = (c.env as unknown) as Env
    const clientId = env.GOOGLE_CLIENT_ID
    const clientSecret = env.GOOGLE_CLIENT_SECRET
    const redirectUri = env.GOOGLE_REDIRECT_URI

    if (!clientId || !clientSecret || !redirectUri) {
      return c.json({ error: 'Google OAuth not configured' }, 500)
    }

    const body = await c.req.json<{ code?: string }>().catch(() => ({} as { code?: string }))
    const code = body.code
    if (!code) {
      return c.json({ error: 'missing_code' }, 400)
    }

    // Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = await tokenRes.json<any>()
    if (!tokenRes.ok || tokenData.error) {
      return c.json({ error: 'token_exchange_failed', details: tokenData }, 400)
    }

    const idToken: string | undefined = tokenData.id_token
    if (!idToken) {
      return c.json({ error: 'missing_id_token' }, 400)
    }

    // Decode ID token (base64url) without Node Buffer
    const parts = idToken.split('.')
    if (parts.length !== 3) {
      return c.json({ error: 'invalid_id_token' }, 400)
    }
    const base64Url = parts[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    const payload = JSON.parse(jsonPayload)

    const user = {
      sub: payload.sub as string | undefined,
      email: payload.email as string | undefined,
      name: (payload.name || payload.given_name || payload.email) as string | undefined,
      picture: payload.picture as string | undefined,
      email_verified: payload.email_verified as boolean | undefined,
    }

    return c.json({ user, tokens: tokenData })
  } catch (err) {
    console.error('OAuth exchange error:', err)
    return c.json({ error: 'server_error' }, 500)
  }
})

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