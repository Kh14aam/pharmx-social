import { DurableObject } from 'cloudflare:workers'

interface Participant {
  websocket: WebSocket
  userId: string
  role: 'initiator' | 'responder'
  joinedAt: number
}

export class ChatRoom extends DurableObject {
  private sessions: Map<string, WebSocket> = new Map()
  private maxConnections = 1000
  private iceConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' }
    ],
    iceCandidatePoolSize: 10,
    iceTransportPolicy: 'all' as const
  }

  // WebRTC quality constraints for WhatsApp/Telegram level quality
  private audioConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
    channelCount: 1,
    latency: 0.01,
    googEchoCancellation: true,
    googAutoGainControl: true,
    googNoiseSuppression: true,
    googHighpassFilter: true
  }

  async fetch(request: Request) {
    const url = new URL(request.url)
    
    if (url.pathname === '/ws') {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('Expected WebSocket', { status: 400 })
      }
      
      // Check connection limits
      if (this.sessions.size >= this.maxConnections) {
        return new Response('Room at maximum capacity', { status: 503 })
      }
      
      const pair = new WebSocketPair()
      const [client, server] = Object.values(pair)
      
      server.accept()
      
      // Generate unique session ID
      const sessionId = crypto.randomUUID()
      this.sessions.set(sessionId, server)
      
      // Send quality configuration to client
      server.send(JSON.stringify({
        type: 'config',
        audioConstraints: this.audioConstraints,
        iceConfig: this.iceConfig
      }))
      
      server.addEventListener('message', async (event) => {
        try {
          const data = JSON.parse(event.data as string)
          await this.handleMessage(sessionId, data, server)
        } catch (error) {
          console.error('Error handling message:', error)
          server.send(JSON.stringify({
            type: 'error',
            message: 'Failed to process message'
          }))
        }
      })
      
      server.addEventListener('close', () => {
        this.sessions.delete(sessionId)
        this.broadcastToOthers(sessionId, {
          type: 'user_disconnected',
          sessionId
        })
      })
      
      server.addEventListener('error', (error) => {
        console.error('WebSocket error:', error)
        this.sessions.delete(sessionId)
      })
      
      return new Response(null, { status: 101, webSocket: client })
    }
    
    return new Response('Not found', { status: 404 })
  }

  private async handleMessage(sessionId: string, data: any, ws: WebSocket) {
    switch (data.type) {
      case 'offer':
        // Handle WebRTC offer with quality optimization
        this.broadcastToOthers(sessionId, {
          type: 'offer',
          sessionId,
          offer: data.offer,
          audioConstraints: this.audioConstraints
        })
        break
        
      case 'answer':
        this.broadcastToOthers(sessionId, {
          type: 'answer',
          sessionId,
          answer: data.answer
        })
        break
        
      case 'ice_candidate':
        this.broadcastToOthers(sessionId, {
          type: 'ice_candidate',
          sessionId,
          candidate: data.candidate
        })
        break
        
      case 'call_quality_report':
        // Log call quality metrics for monitoring
        console.log(`Call quality report from ${sessionId}:`, data.metrics)
        break
        
      default:
        console.warn('Unknown message type:', data.type)
    }
  }

  private broadcastToOthers(senderId: string, message: any) {
    for (const [sessionId, ws] of this.sessions) {
      if (sessionId !== senderId && ws.readyState === WebSocket.READY_STATE_OPEN) {
        try {
          ws.send(JSON.stringify(message))
        } catch (error) {
          console.error('Failed to send message to session:', sessionId, error)
          // Remove failed connection
          this.sessions.delete(sessionId)
        }
      }
    }
  }
}
