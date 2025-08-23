"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Phone, PhoneOff, Mic, MicOff, Loader2, Heart, X, Clock, Volume2, VolumeX } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

type VoiceState = "idle" | "searching" | "incoming_call" | "connecting" | "in_call" | "deciding" | "waiting_decision"

// Engaging waiting messages that rotate during search
const waitingMessages = [
  "Looking for the perfect voice match for you :)",
  "Hang tight! Connecting you to someone new...",
  "You're in line - we're working hard to find a connection :)",
  "Still searching... Thanks for your patience :)",
  "Almost there! A new voice chat partner is on the way :)",
]

export default function VoicePage() {
  const { toast } = useToast()
  const router = useRouter()
  const [state, setState] = useState<VoiceState>("idle")
  const [isMuted, setIsMuted] = useState(false)
  const [isLoudSpeaker, setIsLoudSpeaker] = useState(true)
  const [remainingSeconds, setRemainingSeconds] = useState(1200) // 20 minutes
  const [decision, setDecision] = useState<"stay" | "skip" | null>(null)
  const [partner, setPartner] = useState<{ name: string; avatar: string; id: string } | null>(null)
  const [waitingMessageIndex, setWaitingMessageIndex] = useState(0)
  
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)

  // WebSocket connection management
  const connectToMatchmaking = useCallback(async () => {
    try {
      const token = localStorage.getItem('pharmx_token')
      if (!token) {
        toast({
          title: "Authentication Required",
          description: "Please log in to start voice chat",
          variant: "destructive",
        })
        return false
      }

      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://pharmx-api.kasimhussain333.workers.dev/api/v1'
      const wsUrl = apiBase.replace('https://', 'wss://').replace('http://', 'ws://')
      
      console.log('[Voice] Connecting to WebSocket:', `${wsUrl}/match`)
      
      const ws = new WebSocket(`${wsUrl}/match`)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('[Voice] WebSocket connected')
        // Send join message with authentication token
        ws.send(JSON.stringify({ type: 'join', token }))
      }

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data)
        console.log('[Voice] Received message:', message)
        handleWebSocketMessage(message)
      }

      ws.onerror = (error) => {
        console.error('[Voice] WebSocket error:', error)
        setState('idle')
        toast({
          title: "Connection Error",
          description: "Failed to connect to voice service",
          variant: "destructive",
        })
      }

      ws.onclose = (event) => {
        console.log('[Voice] WebSocket closed:', event.code, event.reason)
        if (state !== 'idle') {
          setState('idle')
        }
      }

      return true
    } catch (error) {
      console.error('[Voice] Failed to connect to matchmaking:', error)
      return false
    }
  }, [state, toast])

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((message: any) => {
    switch (message.type) {
      case 'connected':
        console.log('[Voice] Successfully connected to lobby')
        break
        
      case 'status':
        if (message.state === 'queued') {
          setState('searching')
        } else if (message.state === 'paired') {
          setPartner(message.partner)
          setState('incoming_call')
          // If we're the offerer, we'll get the signal to create offer after both accept
        }
        break
        
      case 'call-accepted':
        // Both users accepted, start WebRTC setup
        setupWebRTC()
        break
        
      case 'call-declined':
        setState('searching')
        setPartner(null)
        break
        
      case 'offer':
        handleWebRTCOffer(message.sdp)
        break
        
      case 'answer':
        handleWebRTCAnswer(message.sdp)
        break
        
      case 'ice':
        handleICECandidate(message.candidate)
        break
        
      case 'call-started':
        setState('in_call')
        setRemainingSeconds(message.remainingSec || 1200)
        break
        
      case 'tick':
        setRemainingSeconds(message.remainingSec)
        break
        
      case 'call-ended':
        setState('deciding')
        cleanupWebRTC()
        break
        
      case 'decision-waiting':
        // Keep showing waiting state
        break
        
      case 'decision-result':
        if (message.result === 'stayinchat') {
          toast({
            title: "Great!",
            description: "You can now chat with this person in your messages",
            variant: "default",
          })
          router.push('/app/chats')
        } else {
          setState('idle')
          setPartner(null)
          setDecision(null)
        }
        break
        
      case 'error':
        console.error('[Voice] Server error:', message.message)
        setState('idle')
        toast({
          title: "Error",
          description: message.message || "An error occurred",
          variant: "destructive",
        })
        break
    }
  }, [toast, router])

  // Setup WebRTC connection
  const setupWebRTC = useCallback(async () => {
    try {
      // Create peer connection with optimized configuration
      const configuration: RTCConfiguration = {
        iceServers: [
          { urls: 'stun:stun.cloudflare.com:3478' },
          { urls: 'stun:stun.l.google.com:19302' }
        ],
        iceCandidatePoolSize: 10,
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require'
      }
      
      const peerConnection = new RTCPeerConnection(configuration)
      peerConnectionRef.current = peerConnection
      
      // Add local stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          peerConnection.addTrack(track, localStreamRef.current!)
        })
      }
      
      // Handle remote stream
      peerConnection.ontrack = (event) => {
        console.log('[Voice] Received remote track')
        if (remoteAudioRef.current && event.streams[0]) {
          remoteAudioRef.current.srcObject = event.streams[0]
        }
      }
      
      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && wsRef.current) {
          wsRef.current.send(JSON.stringify({
            type: 'ice',
            candidate: event.candidate
          }))
        }
      }
      
      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log('[Voice] Connection state:', peerConnection.connectionState)
        if (peerConnection.connectionState === 'connected') {
          setState('in_call')
          // Send ready signal to server
          if (wsRef.current) {
            wsRef.current.send(JSON.stringify({ type: 'ready' }))
          }
        } else if (peerConnection.connectionState === 'failed') {
          toast({
            title: "Connection Failed",
            description: "Voice call connection failed",
            variant: "destructive",
          })
          endCall()
        }
      }
      
    } catch (error) {
      console.error('[Voice] Failed to setup WebRTC:', error)
    }
  }, [])

  // Handle WebRTC offer
  const handleWebRTCOffer = useCallback(async (sdp: RTCSessionDescriptionInit) => {
    if (!peerConnectionRef.current) return
    
    try {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(sdp))
      const answer = await peerConnectionRef.current.createAnswer()
      await peerConnectionRef.current.setLocalDescription(answer)
      
      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'answer',
          sdp: answer
        }))
      }
    } catch (error) {
      console.error('[Voice] Failed to handle offer:', error)
    }
  }, [])

  // Handle WebRTC answer
  const handleWebRTCAnswer = useCallback(async (sdp: RTCSessionDescriptionInit) => {
    if (!peerConnectionRef.current) return
    
    try {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(sdp))
    } catch (error) {
      console.error('[Voice] Failed to handle answer:', error)
    }
  }, [])

  // Handle ICE candidate
  const handleICECandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    if (!peerConnectionRef.current) return
    
    try {
      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
    } catch (error) {
      console.error('[Voice] Failed to add ICE candidate:', error)
    }
  }, [])

  // Cleanup WebRTC connection
  const cleanupWebRTC = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
  }, [])
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Helper to request microphone access and remember permission
  const getMicrophoneStream = async () => {
    if (localStreamRef.current) return localStreamRef.current

    const constraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: false,
      },
    }

    // Check permission if supported to avoid unnecessary prompts
    try {
      const permission = await navigator.permissions?.query({
        // PermissionName isn't narrowed in TS yet
        name: 'microphone' as PermissionName,
      })
      if (permission && permission.state === 'denied') {
        throw new Error('Microphone permission denied')
      }
    } catch {
      // Ignore if Permissions API not supported
    }

    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    localStreamRef.current = stream
    try {
      localStorage.setItem('micPermission', 'granted')
    } catch {
      // Ignore storage errors
    }
    return stream
  }

  // Pre-check microphone permission to minimise prompts on refresh
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (localStorage.getItem('micPermission') === 'granted') {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then(stream => stream.getTracks().forEach(t => t.stop()))
        .catch(() => {})
    }
  }, [])

  // Rotate waiting messages every few seconds
  useEffect(() => {
    if (state !== "searching") return

    const interval = setInterval(() => {
      setWaitingMessageIndex((prev) => (prev + 1) % waitingMessages.length)
    }, 3000)

    return () => clearInterval(interval)
  }, [state])

  // Countdown timer for calls
  useEffect(() => {
    if (state !== "in_call") return

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          endCall()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    countdownIntervalRef.current = interval
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  const startFindingVoice = useCallback(async () => {
    try {
      // Request microphone access first
      await getMicrophoneStream()
      
      setState("searching")
      
      // Connect to WebSocket matchmaking
      const connected = await connectToMatchmaking()
      if (!connected) {
        setState("idle")
        return
      }
      
    } catch (error) {
      console.error('Failed to start voice search:', error)
      setState("idle")
      
      if (error instanceof Error && error.message.includes('Microphone')) {
        toast({
          title: "Microphone Access Required",
          description: "Please allow microphone access to use voice chat",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Connection Failed",
          description: "Please check your internet connection and try again",
          variant: "destructive",
        })
      }
    }
  }, [toast, connectToMatchmaking])

  const cancelSearch = useCallback(() => {
    setState("idle")
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'leave' }))
      wsRef.current.close()
      wsRef.current = null
    }
  }, [])

  const acceptCall = useCallback(async () => {
    setState("connecting")
    
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'accept' }))
    }
  }, [])

  const declineCall = useCallback(() => {
    setState("idle")
    setPartner(null)
    
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'decline' }))
    }
  }, [])

  const endCall = useCallback(() => {
    // Stop media streams
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
      localStreamRef.current = null
    }
    
    // Clear countdown
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
    
    // Cleanup WebRTC
    cleanupWebRTC()
    
    // Notify server
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'leave' }))
    }
    
    setState("deciding")
  }, [cleanupWebRTC])

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newMuted = !prev
      
      // Toggle audio track
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(track => {
          track.enabled = !newMuted
        })
      }
      
      return newMuted
    })
  }, [])

  const toggleLoudSpeaker = useCallback(() => {
    setIsLoudSpeaker(prev => !prev)
    // Note: Actual speaker routing would be implemented here
  }, [])

  const handleDecision = useCallback(async (choice: "stay" | "skip") => {
    setDecision(choice)
    setState("waiting_decision")
    
    // Send decision to server
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ 
        type: 'decision', 
        choice 
      }))
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop())
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
      cleanupWebRTC()
    }
  }, [cleanupWebRTC])

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] px-4">
      <audio ref={remoteAudioRef} autoPlay playsInline />
      
      {/* Idle state - Find a Voice button */}
      {state === "idle" && (
        <Card className="w-full max-w-md p-8 text-center space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Ready to chat?</h2>
            <p className="text-muted-foreground">
              Connect with someone new through voice
            </p>
          </div>
          
          <Button
            size="lg"
            className="w-full h-16 text-lg rounded-2xl"
            onClick={startFindingVoice}
          >
            <Phone className="mr-2 h-5 w-5" />
            Find a Voice
          </Button>
        </Card>
      )}

      {/* Searching state */}
      {state === "searching" && (
        <Card className="w-full max-w-md p-8 text-center space-y-6">
          <div className="space-y-4">
            <div className="relative h-32 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-primary/10 animate-ping" />
              </div>
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
            
            <div className="space-y-2">
              <p className="text-lg font-medium">Finding someone…</p>
              <p className="text-sm text-muted-foreground transition-all duration-300">
                {waitingMessages[waitingMessageIndex]}
              </p>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={cancelSearch}
          >
            Cancel
          </Button>
        </Card>
      )}

      {/* Incoming call preview */}
      {state === "incoming_call" && (
        <Card className="w-full max-w-md p-8 text-center space-y-6">
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="relative">
                <Avatar className="h-24 w-24 mx-auto">
                  <AvatarImage src={partner?.avatar} alt={partner?.name} />
                  <AvatarFallback className="text-2xl">
                    {partner?.name?.charAt(0)?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                  <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium animate-pulse">
                    Incoming Call
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-semibold">{partner?.name}</h3>
                <p className="text-sm text-muted-foreground">wants to voice chat with you</p>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-4">
            <Button
              variant="destructive"
              size="lg"
              className="flex-1"
              onClick={declineCall}
            >
              <X className="mr-2 h-5 w-5" />
              Decline
            </Button>
            <Button
              variant="default"
              size="lg"
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={acceptCall}
            >
              <Phone className="mr-2 h-5 w-5" />
              Accept
            </Button>
          </div>
        </Card>
      )}

      {/* Connecting state */}
      {state === "connecting" && (
        <Card className="w-full max-w-md p-8 text-center space-y-6">
          <div className="space-y-4">
            {partner && (
              <div className="space-y-3">
                <Avatar className="h-20 w-20 mx-auto">
                  <AvatarImage src={partner?.avatar} alt={partner?.name} />
                  <AvatarFallback className="text-lg">
                    {partner?.name?.charAt(0)?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">{partner?.name}</h3>
                  <p className="text-sm text-muted-foreground">Waiting for the other person to connect…</p>
                </div>
              </div>
            )}
            {!partner && (
              <div className="space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                <p className="text-lg font-medium">Waiting for the other person to connect…</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* In call state */}
      {state === "in_call" && (
        <Card className="w-full max-w-md p-8 text-center space-y-6">
          <div className="space-y-4">
            {partner && (
              <div className="space-y-3">
                <Avatar className="h-20 w-20 mx-auto">
                  <AvatarImage src={partner?.avatar} alt={partner?.name} />
                  <AvatarFallback className="text-lg">
                    {partner?.name?.charAt(0)?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-lg font-semibold">{partner?.name}</h3>
              </div>
            )}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{"You're connected"}</p>
              <div className="flex items-center justify-center space-x-2">
                <Clock className="h-5 w-5 text-primary" />
                <p className="text-2xl font-bold font-mono">
                  {formatTime(remainingSeconds)}
                </p>
                <span className="text-sm text-muted-foreground">remaining</span>
              </div>
            </div>
            
            <div className="flex justify-center space-x-4">
              <Button
                size="icon"
                variant={isMuted ? "destructive" : "secondary"}
                className="h-12 w-12 rounded-full"
                onClick={toggleMute}
              >
                {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>
              
              <Button
                size="icon"
                variant={isLoudSpeaker ? "default" : "secondary"}
                className="h-12 w-12 rounded-full"
                onClick={toggleLoudSpeaker}
              >
                {isLoudSpeaker ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              </Button>
            </div>
          </div>
          
          <Button
            variant="destructive"
            size="lg"
            className="w-full"
            onClick={endCall}
          >
            <PhoneOff className="mr-2 h-5 w-5" />
            End Call
          </Button>
        </Card>
      )}

      {/* Decision phase */}
      {state === "deciding" && (
        <Card className="w-full max-w-md p-8 text-center space-y-6">
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Choose what happens next</h3>
            <p className="text-sm text-muted-foreground">
              Would you like to stay in touch?
            </p>
          </div>
          
          <div className="space-y-3">
            <Button
              size="lg"
              className="w-full"
              onClick={() => handleDecision('stay')}
            >
              <Heart className="mr-2 h-5 w-5" />
              Stay in touch
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => handleDecision('skip')}
            >
              <X className="mr-2 h-5 w-5" />
              Skip
            </Button>
          </div>
        </Card>
      )}

      {/* Waiting for other person's decision */}
      {state === "waiting_decision" && (
        <Card className="w-full max-w-md p-8 text-center space-y-6">
          <div className="space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <div className="space-y-2">
              <p className="text-lg font-medium">Waiting for their choice…</p>
              <p className="text-sm text-muted-foreground">
                You chose to {decision === 'stay' ? 'stay in touch' : 'skip'}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
