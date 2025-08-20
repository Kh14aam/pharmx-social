export class RoomDO {
  private peers: Set<WebSocket> = new Set()
  private state: DurableObjectState
  private env: any

  constructor(state: DurableObjectState, env: any) {
    this.state = state
    this.env = env
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 })
    }

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)

    server.accept()
    this.peers.add(server)

    // Broadcast messages to other peers
    server.addEventListener('message', (evt: MessageEvent) => {
      const message = evt.data
      
      // Broadcast to all other peers
      for (const peer of this.peers) {
        if (peer !== server && peer.readyState === WebSocket.OPEN) {
          try {
            peer.send(message)
          } catch (error) {
            console.error('Failed to broadcast message:', error)
          }
        }
      }
    })

    // Clean up on disconnect
    const cleanup = () => {
      this.peers.delete(server)
      
      // Notify other peers that someone disconnected
      for (const peer of this.peers) {
        if (peer.readyState === WebSocket.OPEN) {
          try {
            peer.send(JSON.stringify({ type: 'peer-disconnected' }))
          } catch {}
        }
      }
      
      // If room is empty, it will be automatically cleaned up by Cloudflare
    }

    server.addEventListener('close', cleanup)
    server.addEventListener('error', cleanup)

    return new Response(null, {
      status: 101,
      webSocket: client
    })
  }
}
