// WebSocket signaling client for voice calls

export type SignalingState = 'disconnected' | 'connecting' | 'queued' | 'paired' | 'in_call' | 'deciding' | 'resolved'

export type ServerMessage =
  | {
      type: 'status'
      state: 'queued' | 'paired'
      role?: 'offerer' | 'answerer'
      callId?: string
      partner?: { name: string; avatar?: string; id: string }
    }
  | { type: 'offer'; sdp: RTCSessionDescriptionInit }
  | { type: 'answer'; sdp: RTCSessionDescriptionInit }
  | { type: 'ice'; candidate: RTCIceCandidateInit }
  | { type: 'call-started'; remainingSec: number }
  | { type: 'tick'; remainingSec: number }
  | { type: 'both-accepted' }
  | { type: 'call-ended'; reason: 'duration' | 'hangup' | 'disconnect' | 'error' }
  | { type: 'decision-waiting' }
  | { type: 'decision-result'; result: 'stayinchat' | 'notadded' }
  | { type: 'error'; code: string; message: string }

export interface SignalingEvents {
  onStateChange: (state: SignalingState) => void
  onPaired: (role: 'offerer' | 'answerer', callId: string, partner?: { name: string; avatar?: string; id: string }) => void
  onOffer: (sdp: RTCSessionDescriptionInit) => void
  onAnswer: (sdp: RTCSessionDescriptionInit) => void
  onIceCandidate: (candidate: RTCIceCandidateInit) => void
  onCallStarted: (remainingSec: number) => void
  onTick: (remainingSec: number) => void
  onCallEnded: (reason: 'duration' | 'hangup' | 'disconnect' | 'error') => void
  onDecisionWaiting: () => void
  onDecisionResult: (result: 'stayinchat' | 'notadded') => void
  onBothAccepted: () => void
  onError: (code: string, message: string) => void
}

export type SignalingEventType = keyof SignalingEvents

export class SignalingClient {
  private ws: WebSocket | null = null
  private state: SignalingState = 'disconnected'
  private events: Partial<SignalingEvents> = {}
  private reconnectTimer: NodeJS.Timeout | null = null
  private pingInterval: NodeJS.Timeout | null = null
  private wsUrl: string
  private token: string
  public role?: 'offerer' | 'answerer' // Add role property for storing the user's role

  constructor(wsUrl: string, token: string) {
    this.wsUrl = wsUrl
    this.token = token
  }

  // Set event handlers
  on<K extends keyof SignalingEvents>(event: K, handler: SignalingEvents[K]) {
    this.events[event] = handler
  }

  // Connect to signaling server
  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[Signaling] Already connected')
      return
    }

    this.updateState('connecting')
    
    try {
      this.ws = new WebSocket(this.wsUrl)
      
      this.ws.onopen = () => {
        console.log('[Signaling] Connected to server')
        this.clearReconnectTimer()
        
        // Send join message with token
        this.send({ type: 'join', token: this.token })
        
        // Start ping interval to keep connection alive
        this.startPingInterval()
      }

      this.ws.onmessage = (event) => {
        try {
          const message: ServerMessage = JSON.parse(event.data)
          this.handleMessage(message)
        } catch (e) {
          console.error('[Signaling] Failed to parse message:', e)
        }
      }

      this.ws.onerror = (error) => {
        console.error('[Signaling] WebSocket error:', error)
        this.events.onError?.('WS_ERROR', 'WebSocket connection error')
      }

      this.ws.onclose = (event) => {
        console.log(`[Signaling] Disconnected: ${event.code} - ${event.reason}`)
        this.stopPingInterval()
        this.updateState('disconnected')
        
        // Auto-reconnect if not intentionally closed
        if (event.code !== 1000) {
          this.scheduleReconnect()
        }
      }
    } catch (e) {
      console.error('[Signaling] Failed to create WebSocket:', e)
      this.events.onError?.('CONNECTION_FAILED', 'Failed to connect to server')
      this.scheduleReconnect()
    }
  }

  // Disconnect from server
  disconnect() {
    this.clearReconnectTimer()
    this.stopPingInterval()
    
    if (this.ws) {
      this.send({ type: 'leave' })
      this.ws.close(1000, 'User disconnect')
      this.ws = null
    }
    
    this.updateState('disconnected')
  }

  // Send offer SDP
  sendOffer(sdp: RTCSessionDescriptionInit) {
    this.send({ type: 'offer', sdp })
  }

  // Send answer SDP
  sendAnswer(sdp: RTCSessionDescriptionInit) {
    this.send({ type: 'answer', sdp })
  }

  // Send ICE candidate
  sendIceCandidate(candidate: RTCIceCandidateInit) {
    this.send({ type: 'ice', candidate })
  }

  // Send ready signal (user has media and is ready)
  sendReady() {
    this.send({ type: 'ready' })
  }

  // Send post-call decision
  sendDecision(choice: 'stay' | 'skip') {
    this.send({ type: 'decision', choice })
  }

  // Accept incoming call
  sendAccept() {
    this.send({ type: 'accept' })
  }

  // Decline incoming call
  sendDecline() {
    this.send({ type: 'decline' })
  }

  // Get current state
  getState(): SignalingState {
    return this.state
  }

  // Private methods
  private handleMessage(message: ServerMessage) {
    console.log('[Signaling] Received:', message.type)
    
    switch (message.type) {
      case 'status':
        if (message.state === 'queued') {
          this.updateState('queued')
        } else if (message.state === 'paired' && message.role && message.callId) {
          this.updateState('paired')
          this.events.onPaired?.(message.role, message.callId, message.partner)
        }
        break
      
      case 'offer':
        this.events.onOffer?.(message.sdp)
        break
      
      case 'answer':
        this.events.onAnswer?.(message.sdp)
        break
      
      case 'ice':
        this.events.onIceCandidate?.(message.candidate)
        break
      
      case 'call-started':
        this.updateState('in_call')
        this.events.onCallStarted?.(message.remainingSec)
        break
      
      case 'tick':
        this.events.onTick?.(message.remainingSec)
        break
      
      case 'call-ended':
        this.updateState('deciding')
        this.events.onCallEnded?.(message.reason)
        break

      case 'both-accepted':
        this.events.onBothAccepted?.()
        break
      
      case 'decision-waiting':
        this.events.onDecisionWaiting?.()
        break
      
      case 'decision-result':
        this.updateState('resolved')
        this.events.onDecisionResult?.(message.result)
        break
      
      case 'error':
        this.events.onError?.(message.code, message.message)
        break
    }
  }

  private send(data: Record<string, unknown>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    } else {
      console.error('[Signaling] Cannot send - WebSocket not open')
    }
  }

  private updateState(newState: SignalingState) {
    if (this.state !== newState) {
      this.state = newState
      this.events.onStateChange?.(newState)
    }
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
    this.clearReconnectTimer()
    this.reconnectTimer = setTimeout(() => {
      console.log('[Signaling] Attempting to reconnect...')
      this.connect()
    }, 3000) // Reconnect after 3 seconds
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }
}
