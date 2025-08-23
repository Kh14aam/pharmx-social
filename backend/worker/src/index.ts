import { Hono } from 'hono'
import { cors } from 'hono/cors'

// Durable Object imports (required for export)
import { ChatRoom } from './durable-objects/ChatRoom'
import { MatchmakingQueue } from './durable-objects/MatchmakingQueue'
import { LobbyDO } from './durable-objects/LobbyDO'

export interface Env {
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

	// Static assets binding
	ASSETS: Fetcher
}

const app = new Hono()

// CORS configuration
app.use('*', cors({
	origin: ['https://chat.pharmx.co.uk', 'https://pharmx-api.kasimhussain333.workers.dev', 'http://localhost:3000'],
	allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	allowHeaders: ['Content-Type', 'Authorization'],
	credentials: true,
}))

// Health check endpoint
app.get('/health', (c) => {
	const env = c.env as any
	return c.json({ 
		status: 'healthy', 
		timestamp: new Date().toISOString(),
		environment: env?.ENVIRONMENT || 'production'
	})
})

// OAuth exchange endpoint for frontend
app.post('/api/v1/oauth/google/exchange', async (c) => {
	const env = c.env as any
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
				client_id: env.GOOGLE_CLIENT_ID || '',
				client_secret: env.GOOGLE_CLIENT_SECRET || '',
				redirect_uri: env.GOOGLE_REDIRECT_URI || '',
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
		}, env.JWT_SECRET || '')
		
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

// Static asset fetcher using ASSETS binding with SPA fallback
app.get('*', async (c) => {
	const env = c.env as any
	const url = new URL(c.req.url)
	const path = url.pathname === '/' ? '/index.html' : url.pathname
	const res = await env.ASSETS.fetch(new Request(`https://assets${path}`))
	if (res.status === 404) {
		return env.ASSETS.fetch(new Request('https://assets/index.html'))
	}
	return res
})

export default app

// Export Durable Objects (required by wrangler.toml)
export { ChatRoom, MatchmakingQueue, LobbyDO } 