"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Phone, Loader2 } from "lucide-react"

// Debug wrapper to catch all errors
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  try {
    return <>{children}</>
  } catch (error) {
    console.error("[VoicePage] Render error:", error)
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-red-600">Error in Voice Page</h2>
        <p className="mt-2">{String(error)}</p>
      </div>
    )
  }
}

export default function VoicePageDebug() {
  console.log("[VoicePageDebug] Component mounting")
  
  const [state, setState] = useState<string>("idle")
  const [error, setError] = useState<string | null>(null)
  
  console.log("[VoicePageDebug] State initialized:", state)

  const startFindingVoice = async () => {
    console.log("[VoicePageDebug] startFindingVoice called")
    
    try {
      // Test 1: Basic state change
      console.log("[VoicePageDebug] Changing state to searching")
      setState("searching")
      
      // Test 2: Check browser APIs
      console.log("[VoicePageDebug] Checking browser APIs")
      console.log("- window exists:", typeof window !== 'undefined')
      console.log("- navigator exists:", typeof navigator !== 'undefined')
      console.log("- navigator.mediaDevices exists:", typeof navigator?.mediaDevices !== 'undefined')
      
      // Test 3: Try to get microphone access
      if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
        console.log("[VoicePageDebug] Requesting microphone access")
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
          console.log("[VoicePageDebug] Microphone access granted:", stream)
          stream.getTracks().forEach(track => track.stop())
        } catch (micError) {
          console.error("[VoicePageDebug] Microphone error:", micError)
          setError(`Microphone error: ${micError}`)
        }
      }
      
      // Test 4: Check if imports work
      console.log("[VoicePageDebug] Testing imports")
      try {
        await import("@/hooks/use-toast")
        console.log("[VoicePageDebug] useToast imported successfully")
      } catch (importError) {
        console.error("[VoicePageDebug] Import error for useToast:", importError)
        setError(`Import error: ${importError}`)
      }
      
      try {
        await import("@/lib/voice/signaling")
        console.log("[VoicePageDebug] SignalingClient imported successfully")
      } catch (importError) {
        console.error("[VoicePageDebug] Import error for SignalingClient:", importError)
        setError(`SignalingClient import error: ${importError}`)
      }
      
      try {
        await import("@/lib/api-client")
        console.log("[VoicePageDebug] apiClient imported successfully")
      } catch (importError) {
        console.error("[VoicePageDebug] Import error for apiClient:", importError)
        setError(`apiClient import error: ${importError}`)
      }
      
    } catch (err) {
      console.error("[VoicePageDebug] Unexpected error:", err)
      setError(String(err))
    }
  }

  console.log("[VoicePageDebug] Rendering with state:", state)

  return (
    <ErrorBoundary>
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] px-4">
        {error && (
          <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong>Error:</strong> {error}
          </div>
        )}
        
        {state === "idle" && (
          <Card className="w-full max-w-md p-8 text-center space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Voice Debug Mode</h2>
              <p className="text-muted-foreground">
                Click to test voice functionality
              </p>
            </div>
            
            <Button
              size="lg"
              className="w-full h-16 text-lg rounded-2xl"
              onClick={startFindingVoice}
            >
              <Phone className="mr-2 h-5 w-5" />
              Test Find Voice
            </Button>
            
            <div className="text-xs text-gray-500">
              Check browser console for debug logs
            </div>
          </Card>
        )}
        
        {state === "searching" && (
          <Card className="w-full max-w-md p-8 text-center space-y-6">
            <div className="space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <p className="text-lg font-medium">Testing...</p>
              <p className="text-sm text-muted-foreground">
                Check console for debug output
              </p>
            </div>
            
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => {
                console.log("[VoicePageDebug] Cancelling search")
                setState("idle")
                setError(null)
              }}
            >
              Cancel
            </Button>
          </Card>
        )}
      </div>
    </ErrorBoundary>
  )
}
