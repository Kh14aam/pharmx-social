'use client'

import { useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth0 } from '@auth0/auth0-react'
import { apiClient } from '@/lib/api-client'

function AuthCallbackContent() {
  const router = useRouter()
  const { isAuthenticated, isLoading, user, getAccessTokenSilently, error } = useAuth0()

  useEffect(() => {
    const handleAuth = async () => {
      console.log('[Auth Callback] Auth state:', { isAuthenticated, isLoading, user: !!user, error: !!error })
      
      if (isLoading) {
        console.log('[Auth Callback] Still loading...')
        return
      }
      
      if (error) {
        console.error('[Auth Callback] Auth0 error:', error)
        router.push('/login')
        return
      }
      
      if (isAuthenticated && user) {
        console.log('[Auth Callback] User authenticated:', user.email)
        
        try {
          // Get access token from Auth0
          const accessToken = await getAccessTokenSilently()
          console.log('[Auth Callback] Got access token, length:', accessToken.length)
          
          // Store user info and token
          localStorage.setItem('pharmx_user', JSON.stringify(user))
          localStorage.setItem('pharmx_token', accessToken)
          console.log('[Auth Callback] Stored user data in localStorage')
          
          // Set auth in API client
          apiClient.setAuth(accessToken, user.sub || '')
          console.log('[Auth Callback] Set auth in API client')
          
          // For new users, always go to onboarding first
          // We'll check for existing profile in the onboarding page instead
          console.log('[Auth Callback] Redirecting to onboarding for new user')
          router.push('/onboarding')
          
        } catch (error) {
          console.error('[Auth Callback] Auth setup failed:', error)
          // Even if API setup fails, redirect to onboarding
          router.push('/onboarding')
        }
      } else if (!isLoading) {
        console.log('[Auth Callback] Not authenticated, redirecting to login')
        router.push('/login')
      }
    }

    handleAuth()
  }, [isAuthenticated, isLoading, user, getAccessTokenSilently, error, router])

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

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-white">Authentication failed</p>
          <p className="text-white text-sm mt-2">Please try again</p>
          <button 
            onClick={() => router.push('/login')}
            className="mt-4 px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-100"
          >
            Back to Login
          </button>
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
