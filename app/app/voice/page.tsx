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
      
      // Simulate finding a match after a delay
      setTimeout(() => {
        setPartner({
          name: 'Demo User',
          avatar: '/default-avatar.png',
          id: 'demo-user-123'
        })
        setState("incoming_call")
      }, 3000)
      
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
  }, [toast])

  const cancelSearch = useCallback(() => {
    setState("idle")
  }, [])

  const acceptCall = useCallback(async () => {
    setState("connecting")
    
    // Simulate connecting
    setTimeout(() => {
      setState("in_call")
    }, 2000)
  }, [])

  const declineCall = useCallback(() => {
    setState("idle")
    setPartner(null)
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
    
    setState("deciding")
  }, [])

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
    
    // Simulate decision handling
    setTimeout(() => {
      if (choice === "stay") {
        toast({
          title: "Great!",
          description: "You can now chat with this person in your messages",
          variant: "default",
        })
        router.push('/app/chats')
      } else {
        setState("idle")
        setPartner(null)
        setDecision(null)
      }
    }, 2000)
  }, [toast, router])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop())
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
    }
  }, [])

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
