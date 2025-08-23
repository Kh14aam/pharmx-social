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

export class MatchmakingQueue {
  private queues: Map<string, UserQueue> = new Map()
  private lastAssigned: Map<string, number> = new Map()
  private maxQueueSize = 50000
  private maxWaitTime = 300000 // 5 minutes
  private maxConcurrentUsers = 1000
  private shardCount = 10

  constructor(private state: DurableObjectState, private env: any) {
    this.initializeShards()
  }

  private initializeShards() {
    for (let i = 0; i < this.shardCount; i++) {
      const shardId = `shard_${i}`
      if (!this.queues.has(shardId)) {
        this.queues.set(shardId, new UserQueue(shardId, this.maxQueueSize))
      }
    }
  }

  async fetch(request: Request) {
    const url = new URL(request.url)
    
    if (url.pathname === '/ws') {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('Expected WebSocket', { status: 400 })
      }
      
      const pair = new WebSocketPair()
      const [client, server] = Object.values(pair)
      
      server.accept()
      
      const userId = crypto.randomUUID()
      const shardId = this.getShardId(userId)
      const queue = this.queues.get(shardId)!
      
      // Add user to appropriate shard
      await queue.addUser(userId, server)
      
      // Try to match users immediately
      await this.attemptMatching()
      
      server.addEventListener('close', () => {
        queue.removeUser(userId)
      })
      
      server.addEventListener('error', (error) => {
        console.error('WebSocket error:', error)
        queue.removeUser(userId)
      })
      
      return new Response(null, { status: 101, webSocket: client })
    }
    
    if (url.pathname === '/stats') {
      const stats = await this.getStats()
      return Response.json(stats)
    }
    
    return new Response('Not found', { status: 404 })
  }

  private getShardId(userId: string): string {
    // Consistent hashing for user distribution
    const hash = this.hashString(userId)
    const shardIndex = hash % this.shardCount
    return `shard_${shardIndex}`
  }

  private hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  private async attemptMatching() {
    // Sort shards by last assignment time for fair rotation
    const availableShards = Array.from(this.queues.entries())
      .filter(([, queue]) => queue.size >= 2)
      .sort(([a], [b]) => {
        const timeA = this.lastAssigned.get(a) || 0
        const timeB = this.lastAssigned.get(b) || 0
        return timeA - timeB
      })
    
    if (availableShards.length === 0) return
    
    // Process matches in fair rotation
    for (const [shardId, queue] of availableShards) {
      const match = await queue.matchUsers(this.maxWaitTime)
      if (match) {
        this.lastAssigned.set(shardId, Date.now())
        await this.createCall(match.user1, match.user2)
        break // Only process one match per cycle for fairness
      }
    }
  }

  private async createCall(user1: string, user2: string) {
    try {
      // Create a new chat room for the call using the environment
      const roomName = `call_${user1}_${user2}`
      const roomId = this.env.CHAT_ROOMS.idFromName(roomName)
      const room = this.env.CHAT_ROOMS.get(roomId)
      
      // Notify both users about the match
      const queue1 = this.findUserQueue(user1)
      const queue2 = this.findUserQueue(user2)
      
      if (queue1 && queue2) {
        queue1.notifyUser(user1, {
          type: 'match_found',
          roomId: roomId.toString(),
          partner: user2
        })
        
        queue2.notifyUser(user2, {
          type: 'match_found',
          roomId: roomId.toString(),
          partner: user1
        })
      }
    } catch (error) {
      console.error('Failed to create call:', error)
    }
  }

  private findUserQueue(userId: string): UserQueue | null {
    for (const queue of this.queues.values()) {
      if (queue.hasUser(userId)) {
        return queue
      }
    }
    return null
  }

  async getStats() {
    const stats = {
      totalUsers: 0,
      shards: [] as any[],
      lastAssigned: {} as Record<string, number>,
      performance: {
        averageWaitTime: 0,
        matchesPerMinute: 0
      }
    }
    
    for (const [shardId, queue] of this.queues) {
      const shardStats = queue.getStats()
      stats.totalUsers += shardStats.userCount
      stats.shards.push({
        id: shardId,
        ...shardStats
      })
    }
    
    for (const [shardId, timestamp] of this.lastAssigned) {
      stats.lastAssigned[shardId] = timestamp
    }
    
    return stats
  }
}

class UserQueue {
  private users: Map<string, { ws: WebSocket; joinedAt: number }> = new Map()
  private maxSize: number
  private shardId: string

  constructor(shardId: string, maxSize: number) {
    this.shardId = shardId
    this.maxSize = maxSize
  }

  async addUser(userId: string, ws: WebSocket): Promise<boolean> {
    if (this.users.size >= this.maxSize) {
      return false
    }
    
    this.users.set(userId, {
      ws,
      joinedAt: Date.now()
    })
    
    // Send confirmation
    ws.send(JSON.stringify({
      type: 'queue_joined',
      shardId: this.shardId,
      position: this.users.size,
      estimatedWaitTime: this.estimateWaitTime()
    }))
    
    return true
  }

  removeUser(userId: string) {
    this.users.delete(userId)
  }

  hasUser(userId: string): boolean {
    return this.users.has(userId)
  }

  async matchUsers(maxWaitTime: number): Promise<{ user1: string; user2: string } | null> {
    if (this.users.size < 2) return null
    
    const userEntries = Array.from(this.users.entries())
    
    // Find users who have been waiting the longest
    const sortedUsers = userEntries
      .filter(([, data]) => Date.now() - data.joinedAt <= maxWaitTime)
      .sort((a, b) => a[1].joinedAt - b[1].joinedAt)
    
    if (sortedUsers.length < 2) return null
    
    // Select the two users who have been waiting the longest
    const user1 = sortedUsers[0][0]
    const user2 = sortedUsers[1][0]
    
    // Remove them from the queue
    this.users.delete(user1)
    this.users.delete(user2)
    
    return { user1, user2 }
  }

  notifyUser(userId: string, message: any) {
    const userData = this.users.get(userId)
    if (userData && userData.ws.readyState === WebSocket.READY_STATE_OPEN) {
      try {
        userData.ws.send(JSON.stringify(message))
      } catch (error) {
        console.error('Failed to notify user:', userId, error)
        this.users.delete(userId)
      }
    }
  }

  private estimateWaitTime(): number {
    // Simple estimation based on queue size and historical data
    const baseWaitTime = 30000 // 30 seconds base
    const queueMultiplier = this.users.size * 1000 // 1 second per user in queue
    return Math.min(baseWaitTime + queueMultiplier, 300000) // Max 5 minutes
  }

  get size(): number {
    return this.users.size
  }

  getStats() {
    const now = Date.now()
    const waitTimes = Array.from(this.users.values()).map(data => now - data.joinedAt)
    const averageWaitTime = waitTimes.length > 0 ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length : 0
    
    return {
      userCount: this.users.size,
      averageWaitTime,
      oldestUser: Math.min(...waitTimes, 0),
      shardId: this.shardId
    }
  }
}
