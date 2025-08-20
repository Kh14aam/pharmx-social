export { MatchmakerDO } from './matchmaker'
export { RoomDO } from './room'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    
    // Handle matchmaking endpoint
    if (url.pathname === '/match') {
      const id = env.MATCHMAKER.idFromName('global')
      const matchmaker = env.MATCHMAKER.get(id)
      return matchmaker.fetch(request)
    }
    
    // Handle room signaling endpoint
    const roomMatch = url.pathname.match(/^\/room\/([^\/]+)$/)
    if (roomMatch) {
      const roomCode = roomMatch[1]
      const id = env.ROOM.idFromName(roomCode)
      const room = env.ROOM.get(id)
      return room.fetch(request)
    }
    
    return new Response('Not found', { status: 404 })
  }
}

interface Env {
  MATCHMAKER: DurableObjectNamespace
  ROOM: DurableObjectNamespace
}
