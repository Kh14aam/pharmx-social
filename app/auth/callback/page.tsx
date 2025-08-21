'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    // Handle the Auth0 callback
    // In a real implementation, you would:
    // 1. Extract the authorization code from the URL
    // 2. Exchange it for tokens via your Worker API
    // 3. Store the session
    // 4. Redirect to the intended page
    
    // For now, we'll just redirect to onboarding
    // This would typically be handled by your Worker API
    router.push('/onboarding')
  }, [router])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white">Completing sign in...</p>
      </div>
    </div>
  )
}
