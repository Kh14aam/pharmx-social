interface WaitingUser {
  userId: string
  ws: WebSocket
  lastSeen: number
}

export class MatchmakerDO {
  private waiting: Map<WebSocket, WaitingUser> = new Map()
  private state: DurableObjectState
  private env: any

  constructor(state: DurableObjectState, env: any) {
    this.state = state
    this.env = env
  }

  async fetch(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url)
    
    if (pathname === '/match') {
      return this.handleMatchWS(request)
    }
    
    return new Response('Not found', { status: 404 })
  }

  private handleMatchWS(request: Request): Response {
    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)
    
    server.accept()
    
    let record: WaitingUser | undefined
    
    const heartbeat = () => {
      if (record) {
        record.lastSeen = Date.now()
      }
    }
    
    server.addEventListener('message', (evt: MessageEvent) => {
      try {
        const msg = JSON.parse(evt.data as string)
        
        switch (msg.type) {
          case 'join':
            record = {
              userId: msg.userId,
              ws: server,
              lastSeen: Date.now()
            }
            
            console.log('[Matchmaker] User joined:', msg.userId)
            
            // Try to find a partner
            const partner = this.findPartner(record.userId)
            
            if (partner) {
              // Match found!
              const roomCode = this.generateRoomCode()
              
              // Notify both users
              this.notify(partner.ws, { type: 'match', roomCode })
              this.notify(server, { type: 'match', roomCode })
              
              // Remove partner from waiting list
              for (const [ws, user] of this.waiting) {
                if (user === partner) {
                  this.waiting.delete(ws)
                  break
                }
              }
            } else {
              // Add to waiting list
              this.waiting.set(server, record)
              this.notify(server, {
                type: 'queued',
                etaSeconds: this.estimateETA()
              })
              
              // Send periodic updates
              const updateInterval = setInterval(() => {
                if (this.waiting.has(server)) {
                  this.notify(server, {
                    type: 'queueUpdate',
                    etaSeconds: this.estimateETA()
                  })
                } else {
                  clearInterval(updateInterval)
                }
              }, 5000)
            }
            break
            
          case 'heartbeat':
            heartbeat()
            break
            
          case 'cancel':
            this.waiting.delete(server)
            this.notify(server, { type: 'cancelled' })
            server.close()
            break
        }
      } catch (error) {
        console.error('Error handling message:', error)
      }
    })
    
    const cleanup = () => {
      this.waiting.delete(server)
    }
    
    server.addEventListener('close', cleanup)
    server.addEventListener('error', cleanup)
    
    // Clean up stale connections periodically
    this.cleanupStaleConnections()
    
    return new Response(null, {
      status: 101,
      webSocket: client
    })
  }
  
  private findPartner(userId: string): WaitingUser | null {
    // For v1, just return the first waiting user (FIFO)
    // In future, add compatibility filters
    for (const [ws, user] of this.waiting) {
      if (user.userId !== userId) {
        return user
      }
    }
    return null
  }
  
  private notify(ws: WebSocket, obj: any): void {
    try {
      ws.send(JSON.stringify(obj))
    } catch (error) {
      // WebSocket might be closed
      console.error('Failed to send message:', error)
    }
  }
  
  private estimateETA(): number {
    // Simple estimation: 5 seconds per waiting user
    return Math.min(30, this.waiting.size * 5)
  }
  
  private generateRoomCode(): string {
    return Math.random().toString(36).substring(2, 8)
  }
  
  private cleanupStaleConnections(): void {
    const now = Date.now()
    const timeout = 30000 // 30 seconds
    
    for (const [ws, user] of this.waiting) {
      if (now - user.lastSeen > timeout) {
        this.waiting.delete(ws)
        try {
          ws.close()
        } catch {}
      }
    }
  }
}
