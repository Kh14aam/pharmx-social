import { v4 as uuidv4 } from 'uuid'

interface User {
  id: string
  ws: WebSocket
  state: 'queued' | 'paired' | 'connecting' | 'in_call' | 'deciding' | 'resolved'
  partner?: string
  role?: 'offerer' | 'answerer'
  callId?: string
  ready?: boolean
  decision?: 'stay' | 'skip'
  profile?: {
    name: string
    avatar?: string
    id: string
  }
}

interface Call {
  id: string
  userA: string
  userB: string
  startedAt: Date
  timer?: NodeJS.Timeout
  remainingSeconds: number
}

type ClientMessage = 
  | { type: 'join'; token: string }
  | { type: 'ready' }
  | { type: 'leave' }
  | { type: 'offer'; sdp: any }
  | { type: 'answer'; sdp: any }
  | { type: 'ice'; candidate: any }
  | { type: 'decision'; choice: 'stay' | 'skip' }
  | { type: 'ping' }

type ServerMessage =
  | { type: 'status'; state: 'queued' | 'paired'; role?: 'offerer' | 'answerer'; callId?: string; partner?: { name: string; avatar?: string; id: string } }
  | { type: 'offer'; sdp: any }
  | { type: 'answer'; sdp: any }
  | { type: 'ice'; candidate: any }
  | { type: 'call-started'; remainingSec: number }
  | { type: 'tick'; remainingSec: number }
  | { type: 'call-ended'; reason: 'duration' | 'hangup' | 'disconnect' | 'error' }
  | { type: 'decision-waiting' }
  | { type: 'decision-result'; result: 'stayinchat' | 'notadded' }
  | { type: 'error'; code: string; message: string }

export class LobbyDO {
  private users: Map<string, User> = new Map()
  private queue: string[] = []
  private calls: Map<string, Call> = new Map()
  private state: DurableObjectState
  private env: any

  constructor(state: DurableObjectState, env: any) {
    this.state = state
    this.env = env
  }

  async fetch(request: Request): Promise<Response> {
    try {
      console.log('[LobbyDO] Fetch request received')
      
      const url = new URL(request.url)
      console.log('[LobbyDO] Request URL:', url.pathname)
      
      const upgradeHeader = request.headers.get('Upgrade')
      console.log('[LobbyDO] Upgrade header:', upgradeHeader)
      
      if (!upgradeHeader || upgradeHeader !== 'websocket') {
        console.log('[LobbyDO] Not a WebSocket upgrade request')
        return new Response('Expected Upgrade: websocket', { status: 426 })
      }

      console.log('[LobbyDO] Creating WebSocket pair...')
      const pair = new WebSocketPair()
      const [client, server] = Object.values(pair)

      console.log('[LobbyDO] Accepting WebSocket on server side...')
      // Accept the WebSocket connection on the server side
      this.handleWebSocket(server)

      console.log('[LobbyDO] Returning client WebSocket...')
      return new Response(null, {
        status: 101,
        webSocket: client,
      })
    } catch (error) {
      console.error('[LobbyDO] Error in fetch:', error)
      return new Response('Internal Server Error', { status: 500 })
    }
  }

  private handleWebSocket(ws: WebSocket) {
    // Accept the WebSocket connection
    this.state.acceptWebSocket(ws)
    console.log('[LobbyDO] WebSocket accepted')
  }

  async webSocketOpen(ws: WebSocket) {
    console.log('[LobbyDO] WebSocket connection opened')
    // Send a welcome message to confirm connection
    try {
      ws.send(JSON.stringify({ type: 'connected', message: 'WebSocket connected successfully' }))
    } catch (e) {
      console.error('[LobbyDO] Failed to send welcome message:', e)
    }
  }

  async webSocketError(ws: WebSocket, error: any) {
    console.error('[LobbyDO] WebSocket error:', error)
  }

  async webSocketMessage(ws: WebSocket, messageStr: string | ArrayBuffer) {
    console.log('[LobbyDO] WebSocket message received')
    
    if (typeof messageStr !== 'string') {
      console.log('[LobbyDO] Non-string message, ignoring')
      return
    }

    let message: ClientMessage
    try {
      message = JSON.parse(messageStr)
      console.log('[LobbyDO] Parsed message type:', message.type)
    } catch (e) {
      console.error('[LobbyDO] Failed to parse message:', e)
      this.sendMessage(ws, { type: 'error', code: 'INVALID_JSON', message: 'Invalid message format' })
      return
    }

    // Find user by WebSocket
    let userId: string | undefined
    for (const [id, user] of this.users) {
      if (user.ws === ws) {
        userId = id
        break
      }
    }

    switch (message.type) {
      case 'join':
        await this.handleJoin(ws, message.token)
        break
      
      case 'ready':
        if (userId) await this.handleReady(userId)
        break
      
      case 'leave':
        if (userId) await this.handleLeave(userId)
        break
      
      case 'offer':
      case 'answer':
      case 'ice':
        if (userId) await this.handleSignaling(userId, message)
        break
      
      case 'decision':
        if (userId) await this.handleDecision(userId, message.choice)
        break
      
      case 'ping':
        // Keep-alive, no action needed
        break
      
      default:
        this.sendMessage(ws, { type: 'error', code: 'UNKNOWN_TYPE', message: 'Unknown message type' })
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    console.log(`[LobbyDO] WebSocket closed: code=${code}, reason=${reason}, wasClean=${wasClean}`)
    
    // Find and handle disconnected user
    for (const [userId, user] of this.users) {
      if (user.ws === ws) {
        console.log(`[LobbyDO] User ${userId} disconnected`)
        await this.handleDisconnect(userId)
        break
      }
    }
  }

  private async handleJoin(ws: WebSocket, token: string) {
    // Validate JWT token and extract user ID
    const userId = await this.validateToken(token)
    if (!userId) {
      this.sendMessage(ws, { type: 'error', code: 'AUTH_FAILED', message: 'Invalid authentication token' })
      ws.close(1008, 'Invalid token')
      return
    }

    // Check if user already connected - handle gracefully
    if (this.users.has(userId)) {
      console.log(`[LobbyDO] User ${userId} already connected, replacing old connection`)
      const existingUser = this.users.get(userId)!
      
      // Clean up old connection
      try {
        existingUser.ws.close(1000, 'New connection established')
      } catch (e) {
        console.log('[LobbyDO] Old connection already closed')
      }
      
      // If user was in queue, remove them
      const queueIndex = this.queue.indexOf(userId)
      if (queueIndex !== -1) {
        this.queue.splice(queueIndex, 1)
      }
      
      // If user had a partner, handle disconnection
      if (existingUser.partner) {
        const partner = this.users.get(existingUser.partner)
        if (partner) {
          partner.partner = undefined
          partner.state = 'queued'
          partner.role = undefined
          partner.callId = undefined
          partner.ready = false
          if (!this.queue.includes(partner.id)) {
            this.queue.push(partner.id)
          }
          this.sendMessage(partner.ws, { type: 'status', state: 'queued' })
        }
      }
    }

    // Add user to system
    const user: User = {
      id: userId,
      ws,
      state: 'queued'
    }
    this.users.set(userId, user)
    this.queue.push(userId)

    // Send queued status
    this.sendMessage(ws, { type: 'status', state: 'queued' })

    // Try to pair if possible
    await this.tryPair()
  }

  private async handleReady(userId: string) {
    const user = this.users.get(userId)
    if (!user || user.state !== 'connecting') return

    user.ready = true
    
    // Check if both users are ready
    if (user.partner) {
      const partner = this.users.get(user.partner)
      if (partner?.ready) {
        // Both ready, start the call
        await this.startCall(userId, user.partner)
      }
    }
  }

  private async handleLeave(userId: string) {
    await this.handleDisconnect(userId)
  }

  private async handleSignaling(userId: string, message: any) {
    const user = this.users.get(userId)
    if (!user || !user.partner) return

    const partner = this.users.get(user.partner)
    if (!partner) return

    // Relay signaling message to partner
    this.sendMessage(partner.ws, message)
  }

  private async handleDecision(userId: string, choice: 'stay' | 'skip') {
    const user = this.users.get(userId)
    if (!user || user.state !== 'deciding' || !user.callId) return

    user.decision = choice

    // Store decision in database
    try {
      await this.env.DB.prepare(
        'INSERT INTO voice_decisions (id, call_id, user_id, choice) VALUES (?, ?, ?, ?)'
      ).bind(uuidv4(), user.callId, userId, choice).run()
    } catch (e) {
      console.error('Failed to store decision:', e)
    }

    // Check if both users have decided
    if (user.partner) {
      const partner = this.users.get(user.partner)
      if (partner?.decision) {
        await this.resolveDecisions(userId, user.partner, user.callId)
      } else {
        // Waiting for partner's decision
        this.sendMessage(user.ws, { type: 'decision-waiting' })
      }
    }
  }

  private async handleDisconnect(userId: string) {
    const user = this.users.get(userId)
    if (!user) return

    // Remove from queue if queued
    if (user.state === 'queued') {
      const index = this.queue.indexOf(userId)
      if (index !== -1) {
        this.queue.splice(index, 1)
      }
    }

    // Handle partner if in call
    if (user.partner) {
      const partner = this.users.get(user.partner)
      if (partner) {
        if (user.state === 'in_call') {
          // End call due to disconnect
          await this.endCall(user.callId!, 'disconnect')
        } else if (user.state === 'connecting') {
          // Partner disconnected during connection
          partner.partner = undefined
          partner.state = 'queued'
          partner.role = undefined
          partner.callId = undefined
          partner.ready = false
          this.queue.push(partner.id)
          this.sendMessage(partner.ws, { type: 'status', state: 'queued' })
          await this.tryPair()
        }
      }
    }

    // Remove user
    this.users.delete(userId)
  }

  private async tryPair() {
    while (this.queue.length >= 2) {
      const userAId = this.queue.shift()!
      const userBId = this.queue.shift()!

      const userA = this.users.get(userAId)
      const userB = this.users.get(userBId)

      if (!userA || !userB) continue

      // Fetch profile data for both users
      try {
        const userAProfile = await this.fetchUserProfile(userAId)
        const userBProfile = await this.fetchUserProfile(userBId)
        
        // Store profiles in user objects
        userA.profile = userAProfile
        userB.profile = userBProfile
      } catch (e) {
        console.error('Failed to fetch user profiles:', e)
      }

      // Create call record
      const callId = uuidv4()

      // Set up pairing
      userA.state = 'connecting'
      userA.partner = userBId
      userA.role = 'offerer'
      userA.callId = callId

      userB.state = 'connecting'
      userB.partner = userAId
      userB.role = 'answerer'
      userB.callId = callId

      // Notify both users with partner profile
      this.sendMessage(userA.ws, { 
        type: 'status', 
        state: 'paired', 
        role: 'offerer', 
        callId,
        partner: userB.profile 
      })
      this.sendMessage(userB.ws, { 
        type: 'status', 
        state: 'paired', 
        role: 'answerer', 
        callId,
        partner: userA.profile 
      })
    }
  }

  private async startCall(userAId: string, userBId: string) {
    const userA = this.users.get(userAId)
    const userB = this.users.get(userBId)
    if (!userA || !userB || !userA.callId) return

    const callId = userA.callId

    // Create call record in database
    try {
      await this.env.DB.prepare(
        'INSERT INTO calls (id, a_user_id, b_user_id, started_at) VALUES (?, ?, ?, ?)'
      ).bind(callId, userAId, userBId, new Date().toISOString()).run()
    } catch (e) {
      console.error('Failed to create call record:', e)
    }

    // Update states
    userA.state = 'in_call'
    userB.state = 'in_call'

    // Create call tracking
    const call: Call = {
      id: callId,
      userA: userAId,
      userB: userBId,
      startedAt: new Date(),
      remainingSeconds: 1200 // 20 minutes
    }
    this.calls.set(callId, call)

    // Send call started message
    this.sendMessage(userA.ws, { type: 'call-started', remainingSec: 1200 })
    this.sendMessage(userB.ws, { type: 'call-started', remainingSec: 1200 })

    // Start countdown timer
    call.timer = setInterval(async () => {
      call.remainingSeconds--
      
      if (call.remainingSeconds <= 0) {
        await this.endCall(callId, 'duration')
      } else if (call.remainingSeconds % 10 === 0) {
        // Send tick every 10 seconds to reduce spam
        this.sendMessage(userA.ws, { type: 'tick', remainingSec: call.remainingSeconds })
        this.sendMessage(userB.ws, { type: 'tick', remainingSec: call.remainingSeconds })
      }
    }, 1000)
  }

  private async endCall(callId: string, reason: 'duration' | 'hangup' | 'disconnect' | 'error') {
    const call = this.calls.get(callId)
    if (!call) return

    // Clear timer
    if (call.timer) {
      clearInterval(call.timer)
    }

    // Update database
    try {
      await this.env.DB.prepare(
        'UPDATE calls SET ended_at = ?, end_reason = ? WHERE id = ?'
      ).bind(new Date().toISOString(), reason, callId).run()
    } catch (e) {
      console.error('Failed to update call record:', e)
    }

    // Update user states
    const userA = this.users.get(call.userA)
    const userB = this.users.get(call.userB)

    if (userA) {
      userA.state = 'deciding'
      this.sendMessage(userA.ws, { type: 'call-ended', reason })
    }

    if (userB) {
      userB.state = 'deciding'
      this.sendMessage(userB.ws, { type: 'call-ended', reason })
    }

    // Remove call
    this.calls.delete(callId)
  }

  private async resolveDecisions(userAId: string, userBId: string, callId: string) {
    const userA = this.users.get(userAId)
    const userB = this.users.get(userBId)
    
    if (!userA || !userB) return

    const bothStay = userA.decision === 'stay' && userB.decision === 'stay'

    if (bothStay) {
      // Create chat thread
      try {
        // Check if chat already exists between these users
        const existing = await this.env.DB.prepare(
          `SELECT * FROM chats 
           WHERE (user1_id = ? AND user2_id = ?) 
           OR (user1_id = ? AND user2_id = ?)`
        ).bind(userAId, userBId, userBId, userAId).first()
        
        if (!existing) {
          // Create new chat
          const chatId = uuidv4()
          await this.env.DB.prepare(
            `INSERT INTO chats (id, user1_id, user2_id, created_at)
             VALUES (?, ?, ?, datetime('now'))`
          ).bind(chatId, userAId, userBId).run()
          
          console.log(`[LobbyDO] Created chat ${chatId} between ${userAId} and ${userBId}`)
        } else {
          console.log(`[LobbyDO] Chat already exists between ${userAId} and ${userBId}`)
        }

        // Send success result
        this.sendMessage(userA.ws, { type: 'decision-result', result: 'stayinchat' })
        this.sendMessage(userB.ws, { type: 'decision-result', result: 'stayinchat' })
      } catch (e) {
        console.error('Failed to create chat:', e)
        // Send failure result
        this.sendMessage(userA.ws, { type: 'decision-result', result: 'notadded' })
        this.sendMessage(userB.ws, { type: 'decision-result', result: 'notadded' })
      }
    } else {
      // At least one chose skip
      this.sendMessage(userA.ws, { type: 'decision-result', result: 'notadded' })
      this.sendMessage(userB.ws, { type: 'decision-result', result: 'notadded' })
    }

    // Update states
    userA.state = 'resolved'
    userB.state = 'resolved'

    // Clean up after a delay
    setTimeout(() => {
      this.users.delete(userAId)
      this.users.delete(userBId)
    }, 5000)
  }

  private async validateToken(token: string): Promise<string | null> {
    try {
      console.log('[LobbyDO] Validating token:', token.substring(0, 20) + '...')
      
      // Try to decode the JWT to get the user ID
      // For production, we'll decode the JWT directly since it's signed by our auth provider
      try {
        const parts = token.split('.')
        if (parts.length === 3) {
          // Decode the payload (base64url decode)
          let payload = parts[1]
          // Add padding if needed for base64 decoding
          while (payload.length % 4) {
            payload += '='
          }
          
          const decodedPayload = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
          console.log('[LobbyDO] Decoded JWT payload:', decodedPayload)
          
          const userId = decodedPayload.sub || decodedPayload.user_id || decodedPayload.userId
          
          // Check if token is expired
          if (decodedPayload.exp && Date.now() >= decodedPayload.exp * 1000) {
            console.error('[LobbyDO] Token expired')
            return null
          }
          
          console.log('[LobbyDO] Extracted user ID from JWT:', userId)
          return userId
        }
      } catch (decodeError) {
        console.error('[LobbyDO] Failed to decode JWT:', decodeError)
      }
      
      console.error('[LobbyDO] Token validation failed')
      return null
    } catch (e) {
      console.error('[LobbyDO] Token validation error:', e)
      return null
    }
  }

  private async fetchUserProfile(userId: string): Promise<{ name: string; avatar?: string; id: string }> {
    try {
      const result = await this.env.DB.prepare(
        'SELECT id, name, avatar_url FROM users WHERE id = ?'
      ).bind(userId).first()

      if (result) {
        return {
          id: result.id,
          name: result.name || 'Anonymous',
          avatar: result.avatar_url
        }
      }
    } catch (e) {
      console.error('Failed to fetch user profile:', e)
    }

    // Fallback profile
    return {
      id: userId,
      name: 'Anonymous'
    }
  }

  private sendMessage(ws: WebSocket, message: ServerMessage) {
    try {
      ws.send(JSON.stringify(message))
    } catch (e) {
      console.error('Failed to send message:', e)
    }
  }
}
