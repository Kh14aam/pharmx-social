import { DurableObject } from 'cloudflare:workers'

interface Participant {
  websocket: WebSocket
  userId: string
  role: 'initiator' | 'responder'
  joinedAt: number
}

export class ChatRoom extends DurableObject {
  private participants: Map<string, Participant> = new Map()
  private roomCode: string = ''
  private createdAt: number = Date.now()

  constructor(ctx: DurableObjectState, env: any) {
    super(ctx, env)
  }

  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get('Upgrade')
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 })
    }

    // Extract room code from URL
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    this.roomCode = pathParts[pathParts.length - 1]

    // Check if room is full
    if (this.participants.size >= 2) {
      return new Response('Room is full', { status: 403 })
    }

    const webSocketPair = new WebSocketPair()
    const [client, server] = Object.values(webSocketPair)

    this.ctx.acceptWebSocket(server)

    // Determine role based on participants count
    const role: 'initiator' | 'responder' = this.participants.size === 0 ? 'initiator' : 'responder'
    const userId = crypto.randomUUID()

    // Add participant
    const participant: Participant = {
      websocket: server,
      userId,
      role,
      joinedAt: Date.now(),
    }
    this.participants.set(userId, participant)

    // Send initial connection info
    server.send(JSON.stringify({
      type: 'connected',
      userId,
      role,
      roomCode: this.roomCode,
      participantCount: this.participants.size,
    }))

    // Notify other participant if exists
    if (this.participants.size === 2) {
      this.broadcastToOthers(userId, {
        type: 'peer-joined',
        userId,
        role,
      })
    }

    // Handle WebSocket messages
    server.addEventListener('message', async (event) => {
      try {
        const data = JSON.parse(event.data as string)
        await this.handleMessage(userId, data)
      } catch (error) {
        console.error('Error handling message:', error)
        server.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }))
      }
    })

    server.addEventListener('close', () => {
      this.handleDisconnect(userId)
    })

    server.addEventListener('error', (error) => {
      console.error('WebSocket error:', error)
      this.handleDisconnect(userId)
    })

    return new Response(null, {
      status: 101,
      webSocket: client,
    })
  }

  private async handleMessage(userId: string, data: any) {
    const participant = this.participants.get(userId)
    if (!participant) return

    switch (data.type) {
      case 'offer':
        this.relaySignal(userId, { type: 'offer', offer: data.offer, from: userId })
        break

      case 'answer':
        this.relaySignal(userId, { type: 'answer', answer: data.answer, from: userId })
        break

      case 'ice-candidate':
        this.relaySignal(userId, { type: 'ice-candidate', candidate: data.candidate, from: userId })
        break

      case 'heartbeat':
        participant.websocket.send(JSON.stringify({ type: 'pong' }))
        break

      case 'chat-message':
        // Relay text messages during call
        this.broadcastToOthers(userId, {
          type: 'chat-message',
          message: data.message,
          from: userId,
          timestamp: Date.now(),
        })
        break

      case 'mute-status':
        this.broadcastToOthers(userId, {
          type: 'mute-status',
          isMuted: data.isMuted,
          from: userId,
        })
        break

      case 'end-call':
        this.handleEndCall(userId)
        break

      default:
        participant.websocket.send(JSON.stringify({ 
          type: 'error', 
          message: 'Unknown message type' 
        }))
    }
  }

  private relaySignal(fromUserId: string, signal: any) {
    // Send signal to the other participant
    for (const [userId, participant] of this.participants) {
      if (userId !== fromUserId) {
        try {
          participant.websocket.send(JSON.stringify(signal))
        } catch (error) {
          console.error('Error relaying signal:', error)
        }
      }
    }
  }

  private broadcastToOthers(fromUserId: string, message: any) {
    for (const [userId, participant] of this.participants) {
      if (userId !== fromUserId) {
        try {
          participant.websocket.send(JSON.stringify(message))
        } catch (error) {
          console.error('Error broadcasting message:', error)
        }
      }
    }
  }

  private broadcast(message: any) {
    for (const [_, participant] of this.participants) {
      try {
        participant.websocket.send(JSON.stringify(message))
      } catch (error) {
        console.error('Error broadcasting:', error)
      }
    }
  }

  private handleDisconnect(userId: string) {
    const participant = this.participants.get(userId)
    if (!participant) return

    // Remove participant
    this.participants.delete(userId)

    // Notify other participants
    this.broadcast({
      type: 'peer-disconnected',
      userId,
      remainingParticipants: this.participants.size,
    })

    // If room is empty, it will be garbage collected
    if (this.participants.size === 0) {
      // Room cleanup logic if needed
      console.log(`Room ${this.roomCode} is now empty`)
    }
  }

  private handleEndCall(userId: string) {
    // Notify all participants that call is ending
    this.broadcast({
      type: 'call-ended',
      endedBy: userId,
    })

    // Close all connections
    for (const [_, participant] of this.participants) {
      try {
        participant.websocket.close(1000, 'Call ended')
      } catch (error) {
        console.error('Error closing WebSocket:', error)
      }
    }

    // Clear participants
    this.participants.clear()
  }

  // Optional: Add room statistics
  async getStats() {
    return {
      roomCode: this.roomCode,
      participantCount: this.participants.size,
      createdAt: this.createdAt,
      duration: Date.now() - this.createdAt,
      participants: Array.from(this.participants.values()).map(p => ({
        userId: p.userId,
        role: p.role,
        joinedAt: p.joinedAt,
      })),
    }
  }
}
