type EventCallback = (...args: unknown[]) => void

export class SignalingClient {
  private ws: WebSocket | null = null
  private url: string
  private token: string
  private events: Map<string, EventCallback[]> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectTimeout: NodeJS.Timeout | null = null
  private state: 'idle' | 'connecting' | 'connected' | 'searching' | 'paired' | 'in_call' | 'deciding' = 'idle'
  public role?: 'offerer' | 'answerer'

  constructor(url: string, token: string) {
    this.url = url
    this.token = token
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('[SignalingClient] Already connected')
      return
    }

    try {
      console.log('[SignalingClient] Connecting to:', this.url)
      this.ws = new WebSocket(this.url)
      
      this.ws.onopen = () => {
        console.log('[SignalingClient] Connected')
        this.state = 'connected'
        this.reconnectAttempts = 0
        
        // Send authentication
        this.send({
          type: 'auth',
          token: this.token
        })
        
        // Start searching for a match
        this.send({
          type: 'search'
        })
        
        this.state = 'searching'
        this.emit('onStateChange', this.state)
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('[SignalingClient] Received:', data.type)
          this.handleMessage(data)
        } catch (err) {
          console.error('[SignalingClient] Failed to parse message:', err)
        }
      }

      this.ws.onerror = (error) => {
        console.error('[SignalingClient] WebSocket error:', error)
        this.emit('onError', 'CONNECTION_ERROR', 'WebSocket connection error')
      }

      this.ws.onclose = () => {
        console.log('[SignalingClient] Disconnected')
        this.state = 'idle'
        this.emit('onStateChange', this.state)
        
        // Attempt to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000)
          console.log(`[SignalingClient] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)
          
          this.reconnectTimeout = setTimeout(() => {
            this.connect()
          }, delay)
        }
      }
    } catch (err) {
      console.error('[SignalingClient] Failed to create WebSocket:', err)
      this.emit('onError', 'CONNECTION_FAILED', 'Failed to establish connection')
    }
  }

  private handleMessage(data: Record<string, unknown>) {
    switch (data.type) {
      case 'paired':
        this.state = 'paired'
        this.emit('onStateChange', this.state)
        this.emit('onPaired', data.role, data.callId, data.partner)
        break
        
      case 'offer':
        this.emit('onOffer', data.sdp)
        break
        
      case 'answer':
        this.emit('onAnswer', data.sdp)
        break
        
      case 'ice-candidate':
        this.emit('onIceCandidate', data.candidate)
        break
        
      case 'call-started':
        this.state = 'in_call'
        this.emit('onStateChange', this.state)
        this.emit('onCallStarted', data.duration || 1200)
        break
        
      case 'tick':
        this.emit('onTick', data.remaining)
        break
        
      case 'call-ended':
        this.state = 'deciding'
        this.emit('onStateChange', this.state)
        this.emit('onCallEnded', data.reason)
        break
        
      case 'decision-waiting':
        this.emit('onDecisionWaiting')
        break
        
      case 'decision-result':
        this.emit('onDecisionResult', data.result)
        break
        
      case 'error':
        this.emit('onError', data.code, data.message)
        break
        
      default:
        console.log('[SignalingClient] Unknown message type:', data.type)
    }
  }

  private send(data: Record<string, unknown>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    } else {
      console.error('[SignalingClient] Cannot send message, not connected')
    }
  }

  sendOffer(sdp: RTCSessionDescriptionInit) {
    this.send({
      type: 'offer',
      sdp: sdp
    })
  }

  sendAnswer(sdp: RTCSessionDescriptionInit) {
    this.send({
      type: 'answer',
      sdp: sdp
    })
  }

  sendIceCandidate(candidate: RTCIceCandidate) {
    this.send({
      type: 'ice-candidate',
      candidate: candidate.toJSON()
    })
  }

  sendReady() {
    this.send({
      type: 'ready'
    })
  }

  sendDecision(decision: 'stay' | 'skip') {
    this.send({
      type: 'decision',
      decision: decision
    })
  }

  getState() {
    return this.state
  }

  on(event: string, callback: EventCallback) {
    if (!this.events.has(event)) {
      this.events.set(event, [])
    }
    this.events.get(event)!.push(callback)
  }

  private emit(event: string, ...args: unknown[]) {
    const callbacks = this.events.get(event)
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(...args)
        } catch (err) {
          console.error(`[SignalingClient] Error in event handler for ${event}:`, err)
        }
      })
    }
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
    
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    
    this.state = 'idle'
    this.events.clear()
  }
}
