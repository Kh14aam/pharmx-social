'use client'

import { useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth0 } from '@auth0/auth0-react'

function AuthCallbackContent() {
  const router = useRouter()
  const { isAuthenticated, isLoading, user, getAccessTokenSilently, error } = useAuth0()

  useEffect(() => {
    const handleAuth = async () => {
      console.log('[Auth Callback] === AUTH FLOW START ===')
      console.log('[Auth Callback] Auth state:', { isAuthenticated, isLoading, user: !!user, error: !!error })
      console.log('[Auth Callback] User details:', user)
      
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
        console.log('[Auth Callback] ✅ User authenticated:', user.email)
        
        try {
          // Get access token from Auth0
          const accessToken = await getAccessTokenSilently()
          console.log('[Auth Callback] ✅ Got access token, length:', accessToken.length)
          console.log('[Auth Callback] Token preview:', accessToken.substring(0, 20) + '...')
          
          // Store user info and token directly from Auth0
          localStorage.setItem('pharmx_user', JSON.stringify(user))
          localStorage.setItem('pharmx_token', accessToken)
          console.log('[Auth Callback] ✅ Stored Auth0 data in localStorage')
          
          // Verify storage worked
          const storedUser = localStorage.getItem('pharmx_user')
          const storedToken = localStorage.getItem('pharmx_token')
          console.log('[Auth Callback] Verification - Stored user:', !!storedUser, 'Stored token:', !!storedToken)
          
          // For new users, go directly to onboarding
          // No Worker API calls needed at this stage
          console.log('[Auth Callback] 🚀 Redirecting to onboarding for new user')
          console.log('[Auth Callback] === AUTH FLOW END ===')
          router.push('/onboarding')
          
        } catch (error) {
          console.error('[Auth Callback] ❌ Auth setup failed:', error)
          // Even if token retrieval fails, redirect to onboarding
          router.push('/onboarding')
        }
      } else if (!isLoading) {
        console.log('[Auth Callback] ❌ Not authenticated, redirecting to login')
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
