"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Phone, PhoneOff, Mic, MicOff, Loader2, Heart, X, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { SignalingClient } from "@/lib/voice/signaling"
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/api-client"

type VoiceState = "idle" | "searching" | "connecting" | "in_call" | "deciding" | "waiting_decision"

export default function VoicePage() {
  const { toast } = useToast()
  const router = useRouter()
  const [state, setState] = useState<VoiceState>("idle")
  const [isMuted, setIsMuted] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(1200) // 20 minutes
  const [, setCallId] = useState<string | null>(null)
  const [decision, setDecision] = useState<"stay" | "skip" | null>(null)
  const [partner, setPartner] = useState<{ name: string; avatar?: string; id: string } | null>(null)
  
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
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true, 
          autoGainControl: false 
        } 
      })
      localStreamRef.current = stream

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
      signaling.on('onStateChange', (signalingState) => {
        console.log('[Voice] Signaling state:', signalingState)
      })

      signaling.on('onPaired', async (role: 'offerer' | 'answerer', callId: string, partner?: { name: string; avatar?: string; id: string }) => {
        console.log(`[Voice] Paired as ${role} for call ${callId}`, partner)
        setCallId(callId)
        setPartner(partner || null)
        setState("connecting")
        await setupWebRTC(role)
      })

      signaling.on('onOffer', async (sdp) => {
        if (pcRef.current) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp))
          const answer = await pcRef.current.createAnswer()
          await pcRef.current.setLocalDescription(answer)
          signaling.sendAnswer(answer)
        }
      })

      signaling.on('onAnswer', async (sdp) => {
        if (pcRef.current) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp))
        }
      })

      signaling.on('onIceCandidate', async (candidate) => {
        if (pcRef.current) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate))
        }
      })

      signaling.on('onCallStarted', (seconds) => {
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

      signaling.on('onTick', (seconds) => {
        setRemainingSeconds(seconds)
      })

      signaling.on('onCallEnded', (reason) => {
        console.log(`[Voice] Call ended: ${reason}`)
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current)
          countdownIntervalRef.current = null
        }
        setState("deciding")
      })

      signaling.on('onDecisionWaiting', () => {
        setState("waiting_decision")
      })

      signaling.on('onDecisionResult', (result) => {
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

      signaling.on('onError', (code, message) => {
        console.error(`[Voice] Error ${code}: ${message}`)
        toast({
          title: "Connection error",
          description: message,
          variant: "destructive",
        })
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
              <p className="text-sm text-muted-foreground">
                This usually takes a few seconds
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

      {/* Connecting state */}
      {state === "connecting" && (
        <Card className="w-full max-w-md p-8 text-center space-y-6">
          <div className="space-y-4">
            {partner && (
              <div className="space-y-3">
                <Avatar className="h-20 w-20 mx-auto">
                  <AvatarImage src={partner.avatar} alt={partner.name} />
                  <AvatarFallback className="text-lg">
                    {partner.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">{partner.name}</h3>
                  <p className="text-sm text-muted-foreground">Connecting...</p>
                </div>
              </div>
            )}
            {!partner && (
              <div className="space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                <p className="text-lg font-medium">Connecting…</p>
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
                  <AvatarImage src={partner.avatar} alt={partner.name} />
                  <AvatarFallback className="text-lg">
                    {partner.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-lg font-semibold">{partner.name}</h3>
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
