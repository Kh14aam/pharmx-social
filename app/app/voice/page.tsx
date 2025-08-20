"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Phone, PhoneOff, Mic, MicOff, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

type VoiceState = "idle" | "searching" | "matched" | "in_call" | "ended"

const searchMessages = [
  "Finding someone friendly…",
  "Warming up the mic…",
  "Just a moment…",
  "Looking for a voice match…",
  "Connecting you soon…",
]

export default function VoicePage() {
  const { toast } = useToast()
  const [state, setState] = useState<VoiceState>("idle")
  const [isMuted, setIsMuted] = useState(false)
  const [searchMessage, setSearchMessage] = useState(searchMessages[0])
  const [estimatedWait, setEstimatedWait] = useState<number | null>(null)
  const [peerName, setPeerName] = useState<string>("")
  
  const wsRef = useRef<WebSocket | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    if (state === "searching") {
      const interval = setInterval(() => {
        setSearchMessage(prev => {
          const currentIndex = searchMessages.indexOf(prev)
          return searchMessages[(currentIndex + 1) % searchMessages.length]
        })
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [state])

  const startSearch = async () => {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      localStreamRef.current = stream

      setState("searching")
      
      // Connect to matchmaking WebSocket
      const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WORKER_URL}/match`)
      wsRef.current = ws

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "join", userId: "current-user-id" }))
        
        // Send heartbeat every 10 seconds
        const heartbeat = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "heartbeat" }))
          } else {
            clearInterval(heartbeat)
          }
        }, 10000)
      }

      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data)
        
        switch (data.type) {
          case "queued":
            setEstimatedWait(data.etaSeconds)
            break
            
          case "match":
            setState("matched")
            ws.close()
            await connectToRoom(data.roomCode)
            break
            
          case "queueUpdate":
            setEstimatedWait(data.etaSeconds)
            break
            
          case "cancelled":
            setState("idle")
            break
        }
      }

      ws.onerror = () => {
        toast({
          title: "Connection error",
          description: "Failed to connect to matchmaking service",
          variant: "destructive",
        })
        setState("idle")
      }
    } catch (error) {
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to use voice chat",
        variant: "destructive",
      })
      setState("idle")
    }
  }

  const connectToRoom = async (roomCode: string) => {
    // Initialize WebRTC connection
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: ["stun:stun.cloudflare.com:3478"] },
      ],
    })
    pcRef.current = pc

    // Add local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!)
      })
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      remoteStreamRef.current = event.streams[0]
      if (audioRef.current) {
        audioRef.current.srcObject = event.streams[0]
      }
      setState("in_call")
      setPeerName("Anonymous") // In real app, get from server
    }

    // Connect to signaling WebSocket
    const signalingWs = new WebSocket(`${process.env.NEXT_PUBLIC_WORKER_URL}/room/${roomCode}`)
    
    signalingWs.onopen = async () => {
      // Create and send offer
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      signalingWs.send(JSON.stringify({ type: "offer", offer }))
    }

    signalingWs.onmessage = async (event) => {
      const data = JSON.parse(event.data)
      
      switch (data.type) {
        case "offer":
          await pc.setRemoteDescription(data.offer)
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          signalingWs.send(JSON.stringify({ type: "answer", answer }))
          break
          
        case "answer":
          await pc.setRemoteDescription(data.answer)
          break
          
        case "ice-candidate":
          await pc.addIceCandidate(data.candidate)
          break
      }
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        signalingWs.send(JSON.stringify({
          type: "ice-candidate",
          candidate: event.candidate,
        }))
      }
    }
  }

  const cancelSearch = () => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: "cancel" }))
      wsRef.current.close()
    }
    setState("idle")
  }

  const endCall = () => {
    // Clean up WebRTC connection
    if (pcRef.current) {
      pcRef.current.close()
      pcRef.current = null
    }
    
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
      localStreamRef.current = null
    }
    
    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    
    setState("idle")
    setPeerName("")
  }

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMuted(!audioTrack.enabled)
      }
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] px-4">
      <audio ref={audioRef} autoPlay />
      
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
            onClick={startSearch}
          >
            <Phone className="mr-2 h-5 w-5" />
            Find a Voice
          </Button>
        </Card>
      )}

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
              <p className="text-lg font-medium animate-pulse">{searchMessage}</p>
              {estimatedWait && (
                <p className="text-sm text-muted-foreground">
                  Estimated wait: {estimatedWait} seconds
                </p>
              )}
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

      {(state === "matched" || state === "in_call") && (
        <Card className="w-full max-w-md p-8 text-center space-y-6">
          <div className="space-y-4">
            <Avatar className="w-32 h-32 mx-auto">
              <AvatarFallback className="text-3xl">
                {peerName?.[0] || "?"}
              </AvatarFallback>
            </Avatar>
            
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {state === "matched" ? "Connecting to" : "Connected to"}
              </p>
              <p className="text-xl font-semibold">{peerName || "Finding match..."}</p>
            </div>
            
            {state === "in_call" && (
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
            )}
          </div>
          
          <Button
            variant="destructive"
            size="lg"
            className="w-full"
            onClick={endCall}
          >
            <PhoneOff className="mr-2 h-5 w-5" />
            Hang Up
          </Button>
        </Card>
      )}
    </div>
  )
}
