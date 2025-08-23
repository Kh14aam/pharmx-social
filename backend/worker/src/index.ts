import { Hono } from 'hono'
import { cors } from 'hono/cors'

// Durable Object imports (required for export)
export { ChatRoom } from './durable-objects/ChatRoom'
export { MatchmakingQueue } from './durable-objects/MatchmakingQueue'
export { LobbyDO } from './durable-objects/LobbyDO'

export interface Env {
	// This ensures `wrangler secret put` populates the environment
	[key: string]: any;

	// OAuth Configuration
	GOOGLE_CLIENT_ID: string
	GOOGLE_CLIENT_SECRET: string
	GOOGLE_REDIRECT_URI: string
	
	// Application Settings
	JWT_SECRET: string
	FRONTEND_URL: string
	ENVIRONMENT: string
	
	// Durable Objects (required by wrangler.toml)
	CHAT_ROOMS: DurableObjectNamespace
	MATCHMAKING_QUEUE: DurableObjectNamespace
	LOBBY: DurableObjectNamespace
}

const app = new Hono<{ Bindings: Env }>()

// Configure CORS for API routes
app.use('/api/*', cors({
	origin: (origin) => {
		const allowedOrigins = [
			'https://chat.pharmx.co.uk',
			'http://localhost:3000'
		];
		if (allowedOrigins.includes(origin)) {
			return origin;
		}
		// Allow worker URL for development/testing
		return 'https://pharmx-api-worker.kasimhussain333.workers.dev';
	},
	allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	allowHeaders: ['Content-Type', 'Authorization'],
	credentials: true,
}))

const api = app.basePath('/api/v1')

// Health check endpoint
api.get('/health', (c) => {
	return c.json({ 
		status: 'healthy', 
		timestamp: new Date().toISOString(),
		environment: c.env.ENVIRONMENT || 'production'
	})
})

// OAuth exchange endpoint for frontend
api.post('/oauth/google/exchange', async (c) => {
	const { code } = await c.req.json()
	
	if (!code) {
		return c.json({ error: 'Authorization code missing' }, 400)
	}
	
	try {
		// Exchange code for tokens
		const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				client_id: c.env.GOOGLE_CLIENT_ID,
				client_secret: c.env.GOOGLE_CLIENT_SECRET,
				redirect_uri: c.env.GOOGLE_REDIRECT_URI,
				grant_type: 'authorization_code',
				code: code,
			}),
		})
		
		const tokens = await tokenResponse.json() as any
		
		if (!tokenResponse.ok) {
			console.error('Token exchange failed:', tokens)
			return c.json({ error: 'Failed to exchange authorization code' }, 400)
		}
		
		// Get user info
		const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
			headers: { Authorization: `Bearer ${tokens.access_token}` },
		})
		
		const userInfo = await userResponse.json() as any
		
		if (!userResponse.ok) {
			console.error('User info failed:', userInfo)
			return c.json({ error: 'Failed to get user information' }, 400)
		}
		
		// Create JWT token
		const jwt = await createJWT({
			sub: userInfo.id,
			email: userInfo.email,
			name: userInfo.name,
			picture: userInfo.picture,
		}, c.env.JWT_SECRET)
		
		return c.json({
			success: true,
			token: jwt,
			user: {
				id: userInfo.id,
				email: userInfo.email,
				name: userInfo.name,
				picture: userInfo.picture,
			}
		})
	} catch (error) {
		console.error('OAuth exchange error:', error)
		return c.json({ error: 'Authentication failed' }, 500)
	}
})

// JWT helper functions
async function createJWT(payload: any, secret: string): Promise<string> {
	const header = { alg: 'HS256', typ: 'JWT' }
	const now = Math.floor(Date.now() / 1000)
	
	const jwtPayload = {
		...payload,
		iat: now,
		exp: now + (24 * 60 * 60), // 24 hours
	}
	
	const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
	const encodedPayload = btoa(JSON.stringify(jwtPayload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
	
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	)
	
	const signature = await crypto.subtle.sign(
		'HMAC',
		key,
		new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
	)
	
	const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
		.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
	
	return `${encodedHeader}.${encodedPayload}.${encodedSignature}`
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		return app.fetch(request, env, ctx);
	},
}; 