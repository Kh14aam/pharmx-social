'use client'

import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import Image from "next/image"

export default function LoginPage() {
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleGoogleLogin = () => {
    setIsLoading(true)
    // Auth0 handles the authentication flow
    // The connection parameter tells Auth0 to use Google
    window.location.href = '/api/auth/login?connection=google-oauth2&returnTo=/onboarding'
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Neuron Network Image Section - Takes up most of the screen */}
      <div className="relative flex-1 min-h-0">
        <div className="absolute inset-0">
          <Image
            src="/neurons-bg.png"
            alt="Neural network background"
            fill
            className="object-cover"
            priority
            quality={100}
          />
        </div>
      </div>

      {/* Black Background Section with Login Button */}
      <div className="bg-black px-8 py-16">
        <div className="max-w-sm mx-auto">
          <Button 
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full h-14 bg-white text-gray-800 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-full font-medium text-lg shadow-xl hover:shadow-2xl transition-all hover:scale-105 disabled:hover:scale-100 flex items-center justify-center gap-3"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </>
            )}
          </Button>
          
          <p className="text-center text-white/60 text-sm mt-6">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  )
}
