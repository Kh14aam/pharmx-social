'use client'

import { useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth0 } from '@auth0/auth0-react'
import { apiClient } from '@/lib/api-client'

function AuthCallbackContent() {
  const router = useRouter()
  const { isAuthenticated, isLoading, user, getAccessTokenSilently } = useAuth0()

  useEffect(() => {
    const handleAuth = async () => {
      if (isLoading) return
      
      if (isAuthenticated && user) {
        try {
          // Get access token from Auth0
          const accessToken = await getAccessTokenSilently()
          
          // Store user info and token
          localStorage.setItem('pharmx_user', JSON.stringify(user))
          localStorage.setItem('pharmx_token', accessToken)
          
          // Set auth in API client
          apiClient.setAuth(accessToken, user.sub || '')
          
          // Check if user has completed onboarding
          try {
            const profile = await apiClient.profile.get()
            if (profile && profile.name) {
              router.push('/app/voice')
            } else {
              router.push('/onboarding')
            }
          } catch {
            // No profile yet, go to onboarding
            router.push('/onboarding')
          }
        } catch (error) {
          console.error('Auth setup failed:', error)
          router.push('/login')
        }
      } else if (!isLoading) {
        // Not authenticated, redirect to login
        router.push('/login')
      }
    }

    handleAuth()
  }, [isAuthenticated, isLoading, user, getAccessTokenSilently, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white">Completing sign in...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white">Setting up your account...</p>
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
