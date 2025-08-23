'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [hasRedirected, setHasRedirected] = useState(false)

  useEffect(() => {
    const handleAuth = async () => {
      if (hasRedirected) return

      const code = searchParams.get('code')
      const error = searchParams.get('error')

      if (error) {
        setHasRedirected(true)
        router.push('/login')
        return
      }

      if (!code) {
        setHasRedirected(true)
        router.push('/login')
        return
      }

      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || ''
        const res = await fetch(`${apiBase}/oauth/google/exchange`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        })

        if (!res.ok) {
          setHasRedirected(true)
          router.push('/login')
          return
        }

        const data = await res.json()
        const { user, tokens } = data
        if (user && tokens?.id_token) {
          localStorage.setItem('pharmx_user', JSON.stringify(user))
          localStorage.setItem('pharmx_token', tokens.id_token)
          setHasRedirected(true)
          router.push('/onboarding')
          return
        }

        setHasRedirected(true)
        router.push('/login')
      } catch {
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
