'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

function LoginCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [hasRedirected, setHasRedirected] = useState(false)

  useEffect(() => {
    const handleAuth = async () => {
      if (hasRedirected) return

      const code = searchParams.get('code')
      const error = searchParams.get('error')
      const state = searchParams.get('state')

      console.log('[Login Callback] Received:', { code: !!code, error, state })

      if (error) {
        console.error('[Login Callback] OAuth error:', error)
        setHasRedirected(true)
        router.push('/login')
        return
      }

      if (!code) {
        console.error('[Login Callback] No authorization code received')
        setHasRedirected(true)
        router.push('/login')
        return
      }

      // Verify state parameter
      const storedState = localStorage.getItem('oauth_state')
      if (state !== storedState) {
        console.error('[Login Callback] State mismatch - possible CSRF attack')
        setHasRedirected(true)
        router.push('/login')
        return
      }

      try {
        console.log('[Login Callback] Exchanging code with backend...')
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://pharmx-api.kasimhussain333.workers.dev/api/v1'
        
        const res = await fetch(`${apiBase}/oauth/google/exchange`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        })

        console.log('[Login Callback] Backend response status:', res.status)

        if (!res.ok) {
          const errorText = await res.text()
          console.error('[Login Callback] Backend error:', errorText)
          setHasRedirected(true)
          router.push('/login')
          return
        }

        const data = await res.json()
        console.log('[Login Callback] Success:', { hasUser: !!data.user, hasTokens: !!data.tokens })
        
        const { user, tokens } = data
        if (user && tokens?.id_token) {
          localStorage.setItem('pharmx_user', JSON.stringify(user))
          localStorage.setItem('pharmx_token', tokens.id_token)
          localStorage.removeItem('oauth_state') // Clean up
          
          // Check if user has existing profile
          console.log('[Login Callback] Checking for existing profile...')
          try {
            const profileRes = await fetch(`${apiBase}/profile`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${tokens.id_token}`,
                'Content-Type': 'application/json'
              }
            })
            
            if (profileRes.ok) {
              const profileData = await profileRes.json()
              console.log('[Login Callback] Profile found:', { hasName: !!profileData.name })
              
              if (profileData && profileData.name) {
                // Existing user with profile - go to main app
                console.log('[Login Callback] Existing user - redirecting to app')
                setHasRedirected(true)
                router.push('/app/voice')
                return
              }
            }
            
            // No profile found or profile incomplete - go to onboarding
            console.log('[Login Callback] No profile found - redirecting to onboarding')
            setHasRedirected(true)
            router.push('/onboarding')
            return
            
          } catch (profileError) {
            // Error checking profile (likely new user) - go to onboarding
            console.log('[Login Callback] Profile check failed (new user) - redirecting to onboarding')
            setHasRedirected(true)
            router.push('/onboarding')
            return
          }
        }

        console.error('[Login Callback] Invalid response format')
        setHasRedirected(true)
        router.push('/login')
      } catch (error) {
        console.error('[Login Callback] Network error:', error)
        setHasRedirected(true)
        router.push('/login')
      }
    }

    handleAuth()
  }, [searchParams, router, hasRedirected])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white">Completing sign in...</p>
      </div>
    </div>
  )
}

export default function LoginCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white">Loading...</p>
        </div>
      </div>
    }>
      <LoginCallbackContent />
    </Suspense>
  )
}