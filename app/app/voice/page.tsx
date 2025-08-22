"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Phone, PhoneOff, Mic, MicOff, Loader2, Heart, X, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { SignalingClient, SignalingEventType } from "@/lib/voice/signaling"
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/api-client"

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
  const [remainingSeconds, setRemainingSeconds] = useState(1200) // 20 minutes
  const [, setCallId] = useState<string | null>(null)
  const [decision, setDecision] = useState<"stay" | "skip" | null>(null)
  const [partner, setPartner] = useState<{ name: string; avatar: string; id: string } | null>(null)
  const [waitingMessageIndex, setWaitingMessageIndex] = useState(0)
  
  const signalingRef = useRef<SignalingClient | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Format time as MM:SS
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

  // Cleanup function
  const cleanup = useCallback(() => {
    // Stop countdown
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }

    // Close WebRTC connection
    if (pcRef.current) {
      pcRef.current.close()
      pcRef.current = null
    }

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
      localStreamRef.current = null
    }

    // Disconnect signaling
    if (signalingRef.current) {
      signalingRef.current.disconnect()
      signalingRef.current = null
    }

    // Reset state
    setIsMuted(false)
    setRemainingSeconds(1200)
    setCallId(null)
    setDecision(null)
    setPartner(null)
  }, [])

  // Start finding a voice
  const startFindingVoice = async () => {
    try {
      // Check if running in a browser environment
      if (typeof window === 'undefined' || !navigator.mediaDevices) {
        toast({
          title: "Browser not supported",
          description: "Voice chat requires a modern browser with microphone support",
          variant: "destructive",
        })
        return
      }

      // Request microphone permission
      await getMicrophoneStream()

      setState("searching")

      // Get auth token from API client
      const token = apiClient.getToken()
      console.log('[Voice] Retrieved token:', token)
      console.log('[Voice] Token length:', token?.length)
      console.log('[Voice] Token type:', typeof token)
      
      if (!token) {
        toast({
          title: "Authentication required",
          description: "Please sign in to use voice chat",
          variant: "destructive",
        })
        router.push('/login')
        return
      }
      
      // Connect to signaling server
      const wsUrl = process.env.NEXT_PUBLIC_API_URL || 'https://pharmx-api.kasimhussain333.workers.dev'
      const signalingUrl = `${wsUrl.replace('https://', 'wss://').replace('http://', 'ws://')}/signal/ws`
      
      const signaling = new SignalingClient(signalingUrl, token)
      signalingRef.current = signaling

      // Set up signaling event handlers
      // Helper to preserve literal types for event names
      const evt = <T extends SignalingEventType>(eventName: T) => eventName

      signaling.on(evt('onStateChange'), (signalingState: string) => {
        console.log('[Voice] Signaling state:', signalingState)
      })

      signaling.on(
        evt('onPaired'),
        async (
          role: 'offerer' | 'answerer',
          callId: string,
          partner: { name: string; avatar: string; id: string }
        ) => {
          console.log(`[Voice] Paired as ${role} for call ${callId}`, partner)
          setCallId(callId)

          if (!partner?.name || !partner?.avatar) {
            toast({
              title: 'Profile required',
              description: 'Could not load partner profile',
              variant: 'destructive'
            })
            setState('searching')
            return
          }

          setPartner(partner)

          if (role === 'answerer') {
            // Show accept/decline for the receiver
            setState('incoming_call')
          } else {
            // Caller auto-accepts and waits for connection
            signalingRef.current?.sendAccept()
            setState('connecting')
          }

          // Store role for later use
          signalingRef.current!.role = role
        }
      )

      signaling.on(evt('onBothAccepted'), async () => {
        console.log('[Voice] Both users accepted, setting up WebRTC')
        const role = signalingRef.current?.role || 'answerer'
        await setupWebRTC(role)
      })

      signaling.on(evt('onCallDeclined'), () => {
        console.log('[Voice] Partner declined the call, searching again')
        toast({
          title: 'They were busy',
          description: 'Searching again...'
        })
        setPartner(null)
        setState('searching')
      })

      signaling.on(evt('onOffer'), async (sdp) => {
        if (pcRef.current) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp))
          const answer = await pcRef.current.createAnswer()
          await pcRef.current.setLocalDescription(answer)
          signaling.sendAnswer(answer)
        }
      })

      signaling.on(evt('onAnswer'), async (sdp) => {
        if (pcRef.current) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp))
        }
      })

      signaling.on(evt('onIceCandidate'), async (candidate) => {
        if (pcRef.current) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate))
        }
      })

      signaling.on(evt('onCallStarted'), (seconds) => {
        setState("in_call")
        setRemainingSeconds(seconds)
        
        // Start countdown timer
        countdownIntervalRef.current = setInterval(() => {
          setRemainingSeconds(prev => {
            if (prev <= 1) {
              return 0
            }
            return prev - 1
          })
        }, 1000)
      })

      signaling.on(evt('onTick'), (seconds) => {
        setRemainingSeconds(seconds)
      })

      signaling.on(evt('onCallEnded'), (reason) => {
        console.log(`[Voice] Call ended: ${reason}`)
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current)
          countdownIntervalRef.current = null
        }
        setState("deciding")
      })

      signaling.on(evt('onDecisionWaiting'), () => {
        setState("waiting_decision")
      })

      signaling.on(evt('onDecisionResult'), (result) => {
        if (result === 'stayinchat') {
          toast({
            title: "Chat created",
            description: "You can continue chatting in the Chats tab",
          })
          // Navigate to chats
          router.push('/app/chats')
        } else {
          toast({
            title: "Not added this time",
            description: "You can try finding another voice",
          })
        }
        cleanup()
        setState("idle")
      })

      signaling.on(evt('onError'), (code, message) => {
        console.error(`[Voice] Error ${code}: ${message}`)
        
        // Handle specific errors gracefully
        if (code === 'ALREADY_CONNECTED') {
          // Silently reconnect, don't show error to user
          console.log('[Voice] Handling reconnection gracefully')
          return
        }
        
        // Only show critical errors to user
        if (code === 'AUTH_FAILED') {
          toast({
            title: "Authentication required",
            description: "Please sign in to use voice chat",
            variant: "destructive",
          })
          router.push('/login')
        } else if (state === "searching") {
          // If error during search, silently retry
          console.log('[Voice] Error during search, retrying...')
          setTimeout(() => {
            if (signalingRef.current && state === "searching") {
              signalingRef.current.connect()
            }
          }, 2000)
          return
        }
        
        cleanup()
        setState("idle")
      })

      // Connect to signaling server
      signaling.connect()

    } catch (error) {
      console.error('[Voice] Error starting:', error)
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to use voice chat",
        variant: "destructive",
      })
      cleanup()
      setState("idle")
    }
  }

  // Set up WebRTC connection
  const setupWebRTC = async (role: 'offerer' | 'answerer') => {
    try {
      // Get ICE servers
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://pharmx-api.kasimhussain333.workers.dev'
      const turnResponse = await fetch(`${apiUrl}/api/v1/turn-credentials`)
      const { iceServers } = await turnResponse.json()

      // Create peer connection
      const pc = new RTCPeerConnection({ iceServers })
      pcRef.current = pc

      // Add local stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current!)
        })
      }

      // Handle remote stream
      pc.ontrack = (event) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0]
        }
      }

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && signalingRef.current) {
          signalingRef.current.sendIceCandidate(event.candidate)
        }
      }

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log('[Voice] Connection state:', pc.connectionState)
        if (pc.connectionState === 'connected') {
          // Send ready signal
          signalingRef.current?.sendReady()
        } else if (pc.connectionState === 'failed') {
          toast({
            title: "Connection failed",
            description: "Couldn't connect. Trying someone new...",
            variant: "destructive",
          })
          cleanup()
          // Auto-retry
          setTimeout(() => startFindingVoice(), 2000)
        }
      }

      // Create offer if offerer
      if (role === 'offerer') {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        signalingRef.current?.sendOffer(offer)
      }

    } catch (error) {
      console.error('[Voice] WebRTC setup error:', error)
      toast({
        title: "Connection error",
        description: "Failed to establish voice connection",
        variant: "destructive",
      })
      cleanup()
      setState("idle")
    }
  }

  // Cancel search
  const cancelSearch = () => {
    cleanup()
    setState("idle")
  }

  // End call
  const endCall = () => {
    // This will trigger the decision phase
    if (signalingRef.current?.getState() === 'in_call') {
      // The server will handle ending the call and moving to decision phase
      cleanup()
      setState("deciding")
    } else {
      cleanup()
      setState("idle")
    }
  }

  // Toggle mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMuted(!audioTrack.enabled)
      }
    }
  }

  // Handle decision
  const handleDecision = (choice: 'stay' | 'skip') => {
    setDecision(choice)
    signalingRef.current?.sendDecision(choice)
    setState("waiting_decision")
  }

  // Accept incoming call
  const acceptCall = () => {
    console.log('[Voice] Accepting call')
    signalingRef.current?.sendAccept()
    // Wait for both users to accept
    setState("connecting")
  }

  // Decline incoming call
  const declineCall = () => {
    console.log('[Voice] Declining call')
    signalingRef.current?.sendDecline()
    // The backend will handle putting us back in queue
    setState("searching")
  }

  // Rotate waiting messages during search
  useEffect(() => {
    if (state === "searching") {
      setWaitingMessageIndex(0) // Reset to first message
      const interval = setInterval(() => {
        setWaitingMessageIndex((prev) => (prev + 1) % waitingMessages.length)
      }, 5000) // Change message every 5 seconds
      
      return () => clearInterval(interval)
    }
  }, [state])

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
