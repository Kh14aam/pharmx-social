import { DurableObject } from 'cloudflare:workers'

interface QueuedUser {
  userId: string
  websocket: WebSocket
  joinedAt: number
  preferences?: {
    topic?: string
    language?: string
  }
}

export class MatchmakingQueue extends DurableObject {
  private queue: Map<string, QueuedUser> = new Map()
  private heartbeatInterval: number | null = null

  constructor(ctx: DurableObjectState, env: any) {
    super(ctx, env)
    
    // Clean up stale connections every 30 seconds
    this.ctx.blockConcurrencyWhile(async () => {
      this.heartbeatInterval = setInterval(() => {
        this.cleanupStaleConnections()
      }, 30000) as any
    })
  }

  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get('Upgrade')
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 })
    }

    const webSocketPair = new WebSocketPair()
    const [client, server] = Object.values(webSocketPair)

    this.ctx.acceptWebSocket(server)
    
    // Handle WebSocket messages
    server.addEventListener('message', async (event) => {
      try {
        const data = JSON.parse(event.data as string)
        await this.handleMessage(server, data)
      } catch (error) {
        console.error('Error handling message:', error)
        server.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }))
      }
    })

    server.addEventListener('close', () => {
      this.removeUserFromQueue(server)
    })

    return new Response(null, {
      status: 101,
      webSocket: client,
    })
  }

  private async handleMessage(ws: WebSocket, data: any) {
    switch (data.type) {
      case 'join':
        await this.addToQueue(ws, data)
        break
      
      case 'cancel':
        this.removeUserFromQueue(ws)
        ws.send(JSON.stringify({ type: 'cancelled' }))
        break
      
      case 'heartbeat':
        ws.send(JSON.stringify({ type: 'pong' }))
        break
      
      default:
        ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }))
    }
  }

  private async addToQueue(ws: WebSocket, data: any) {
    const userId = data.userId || crypto.randomUUID()
    
    // Check if user is already in queue
    if (this.queue.has(userId)) {
      ws.send(JSON.stringify({ type: 'error', message: 'Already in queue' }))
      return
    }

    // Add user to queue
    const queuedUser: QueuedUser = {
      userId,
      websocket: ws,
      joinedAt: Date.now(),
      preferences: data.preferences,
    }
    
    this.queue.set(userId, queuedUser)

    // Try to match immediately
    const match = await this.findMatch(userId)
    
    if (match) {
      await this.createMatch(userId, match)
    } else {
      // Send queue status
      const position = this.queue.size
      const estimatedWait = position * 15 // 15 seconds per person estimate
      
      ws.send(JSON.stringify({
        type: 'queued',
        position,
        queueSize: this.queue.size,
        etaSeconds: estimatedWait,
      }))

      // Send periodic updates
      this.startQueueUpdates(userId)
    }
  }

  private async findMatch(userId: string): Promise<string | null> {
    const user = this.queue.get(userId)
    if (!user) return null

    // Simple FIFO matching for now
    // In the future, can match based on preferences
    for (const [otherId, otherUser] of this.queue) {
      if (otherId !== userId) {
        // Check if preferences match (if any)
        if (this.preferencesMatch(user.preferences, otherUser.preferences)) {
          return otherId
        }
      }
    }

    return null
  }

  private preferencesMatch(pref1?: any, pref2?: any): boolean {
    // If no preferences, match anyone
    if (!pref1 || !pref2) return true
    
    // Match based on topic if specified
    if (pref1.topic && pref2.topic && pref1.topic !== pref2.topic) {
      return false
    }
    
    // Match based on language if specified
    if (pref1.language && pref2.language && pref1.language !== pref2.language) {
      return false
    }
    
    return true
  }

  private async createMatch(userId1: string, userId2: string) {
    const user1 = this.queue.get(userId1)
    const user2 = this.queue.get(userId2)
    
    if (!user1 || !user2) return

    // Generate room code
    const roomCode = this.generateRoomCode()
    
    // Notify both users
    const matchData = {
      type: 'match',
      roomCode,
      role: 'initiator', // or 'responder'
    }

    user1.websocket.send(JSON.stringify({ ...matchData, role: 'initiator' }))
    user2.websocket.send(JSON.stringify({ ...matchData, role: 'responder' }))

    // Remove from queue
    this.queue.delete(userId1)
    this.queue.delete(userId2)
  }

  private generateRoomCode(): string {
    return Math.random().toString(36).substring(2, 15)
  }

  private removeUserFromQueue(ws: WebSocket) {
    for (const [userId, user] of this.queue) {
      if (user.websocket === ws) {
        this.queue.delete(userId)
        break
      }
    }
  }

  private startQueueUpdates(userId: string) {
    const interval = setInterval(() => {
      const user = this.queue.get(userId)
      if (!user) {
        clearInterval(interval)
        return
      }

      // Calculate current position
      let position = 1
      for (const [id] of this.queue) {
        if (id === userId) break
        position++
      }

      const estimatedWait = Math.max(0, (position - 1) * 15)
      
      user.websocket.send(JSON.stringify({
        type: 'queueUpdate',
        position,
        queueSize: this.queue.size,
        etaSeconds: estimatedWait,
      }))
    }, 5000) as any // Update every 5 seconds
  }

  private cleanupStaleConnections() {
    const now = Date.now()
    const timeout = 60000 // 1 minute timeout

    for (const [userId, user] of this.queue) {
      if (now - user.joinedAt > timeout) {
        try {
          user.websocket.send(JSON.stringify({ 
            type: 'timeout', 
            message: 'Connection timed out' 
          }))
          user.websocket.close()
        } catch (e) {
          // WebSocket might already be closed
        }
        this.queue.delete(userId)
      }
    }
  }
}
