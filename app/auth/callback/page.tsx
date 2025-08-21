'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { apiClient } from '@/lib/api-client'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Handle the Auth0 callback with JWT token from Worker
    const token = searchParams.get('token')
    const sessionId = searchParams.get('session')
    
    if (token && sessionId) {
      // Store the authentication credentials
      apiClient.setAuth(token, sessionId)
      
      // Check if user has completed onboarding
      apiClient.profile.get()
        .then(profile => {
          // If profile exists, go to app, otherwise onboarding
          if (profile && profile.name) {
            router.push('/app/voice')
          } else {
            router.push('/onboarding')
          }
        })
        .catch(() => {
          // No profile yet, go to onboarding
          router.push('/onboarding')
        })
    } else {
      // No token, redirect to login
      router.push('/login')
    }
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white">Completing sign in...</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white">Loading...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}
