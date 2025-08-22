import { EventEmitter } from 'events'

type ServerMessage =
  | { type: 'status'; state: 'queued' | 'paired'; role?: 'offerer' | 'answerer'; callId?: string }
  | { type: 'offer'; sdp: RTCSessionDescriptionInit }
  | { type: 'answer'; sdp: RTCSessionDescriptionInit }
  | { type: 'ice'; candidate: RTCIceCandidateInit }
  | { type: 'call-started'; remainingSec: number }
  | { type: 'tick'; remainingSec: number }
  | { type: 'call-ended'; reason: 'duration' | 'hangup' | 'disconnect' | 'error' }
  | { type: 'decision-waiting' }
  | { type: 'decision-result'; result: 'stayinchat' | 'notadded' }
  | { type: 'error'; code: string; message: string }

type ClientMessage = 
  | { type: 'join'; token: string }
  | { type: 'ready' }
  | { type: 'leave' }
  | { type: 'offer'; sdp: RTCSessionDescriptionInit }
  | { type: 'answer'; sdp: RTCSessionDescriptionInit }
  | { type: 'ice'; candidate: RTCIceCandidateInit }
  | { type: 'decision'; choice: 'stay' | 'skip' }
  | { type: 'ping' }

export class SignalingClient extends EventEmitter {
  private ws: WebSocket | null = null
  private url: string
  private token: string
  private reconnectTimer: NodeJS.Timeout | null = null
  private pingInterval: NodeJS.Timeout | null = null
  private state: 'disconnected' | 'connecting' | 'connected' | 'queued' | 'paired' = 'disconnected'

  constructor(url: string, token: string) {
    super()
    this.url = url
    this.token = token
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.warn('[SignalingClient] Already connected')
      return
    }

    this.state = 'connecting'
    this.emit('onStateChange', this.state)

    console.log('[SignalingClient] Connecting to:', this.url)

    try {
      this.ws = new WebSocket(this.url)

      this.ws.onopen = () => {
        console.log('[SignalingClient] WebSocket connected')
        this.state = 'connected'
        this.emit('onStateChange', this.state)

        // Send join message with token
        this.send({ type: 'join', token: this.token })

        // Start ping interval to keep connection alive
        this.startPingInterval()
      }

      this.ws.onmessage = (event) => {
        try {
          const message: ServerMessage = JSON.parse(event.data)
          this.handleMessage(message)
        } catch (error) {
          console.error('[SignalingClient] Failed to parse message:', error)
        }
      }

      this.ws.onerror = (error) => {
        console.error('[SignalingClient] WebSocket error:', error)
        this.emit('onError', 'WS_ERROR', 'WebSocket connection error')
      }

      this.ws.onclose = (event) => {
        console.log(`[SignalingClient] WebSocket closed: ${event.code} - ${event.reason}`)
        this.state = 'disconnected'
        this.emit('onStateChange', this.state)
        
        this.stopPingInterval()

        // Attempt to reconnect if not intentionally closed
        if (event.code !== 1000) {
          this.scheduleReconnect()
        }
      }
    } catch (error) {
      console.error('[SignalingClient] Failed to create WebSocket:', error)
      this.emit('onError', 'CONNECTION_FAILED', 'Failed to establish connection')
    }
  }

  private handleMessage(message: ServerMessage) {
    console.log('[SignalingClient] Received message:', message.type)

    switch (message.type) {
      case 'status':
        this.state = message.state
        this.emit('onStateChange', this.state)
        
        if (message.state === 'paired' && message.role && message.callId) {
          this.emit('onPaired', message.role, message.callId)
        }
        break

      case 'offer':
        this.emit('onOffer', message.sdp)
        break

      case 'answer':
        this.emit('onAnswer', message.sdp)
        break

      case 'ice':
        this.emit('onIceCandidate', message.candidate)
        break

      case 'call-started':
        this.emit('onCallStarted', message.remainingSec)
        break

      case 'tick':
        this.emit('onTick', message.remainingSec)
        break

      case 'call-ended':
        this.emit('onCallEnded', message.reason)
        break

      case 'decision-waiting':
        this.emit('onDecisionWaiting')
        break

      case 'decision-result':
        this.emit('onDecisionResult', message.result)
        break

      case 'error':
        this.emit('onError', message.code, message.message)
        break
    }
  }

  private send(message: ClientMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn('[SignalingClient] Cannot send message, WebSocket not open')
    }
  }

  sendReady() {
    this.send({ type: 'ready' })
  }

  sendOffer(sdp: RTCSessionDescriptionInit) {
    this.send({ type: 'offer', sdp })
  }

  sendAnswer(sdp: RTCSessionDescriptionInit) {
    this.send({ type: 'answer', sdp })
  }

  sendIceCandidate(candidate: RTCIceCandidate) {
    this.send({ type: 'ice', candidate: candidate.toJSON() })
  }

  sendDecision(choice: 'stay' | 'skip') {
    this.send({ type: 'decision', choice })
  }

  disconnect() {
    this.stopPingInterval()

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.ws) {
      this.send({ type: 'leave' })
      this.ws.close(1000, 'User disconnect')
      this.ws = null
    }

    this.state = 'disconnected'
    this.emit('onStateChange', this.state)
  }

  private startPingInterval() {
    this.stopPingInterval()
    this.pingInterval = setInterval(() => {
      this.send({ type: 'ping' })
    }, 30000) // Ping every 30 seconds
  }

  private stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return

    console.log('[SignalingClient] Scheduling reconnect in 3 seconds...')
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, 3000)
  }

  getState() {
    return this.state
  }
}
