'use client'

import { Auth0Provider as Auth0ProviderSDK } from '@auth0/auth0-react'
import { createContext, useContext, useEffect, useState } from 'react'

interface User {
  email?: string
  name?: string
  picture?: string
  sub?: string
}

interface UserContextType {
  user: User | null
  isLoading: boolean
  error: Error | null
}

const UserContext = createContext<UserContextType>({
  user: null,
  isLoading: true,
  error: null,
})

export function Auth0ProviderWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // Check for existing session on app load
    const checkExistingSession = async () => {
      try {
        console.log('[Session Provider] Checking for existing session...')
        const token = localStorage.getItem('pharmx_token')
        const userData = localStorage.getItem('pharmx_user')
        
        console.log('[Session Provider] Found in localStorage - Token:', !!token, 'User:', !!userData)
        
        if (token && userData) {
          try {
            const user = JSON.parse(userData)
            setUser(user)
            console.log('[Session Provider] ✅ Restored user session:', user.email)
          } catch (e) {
            console.error('[Session Provider] Failed to parse user data:', e)
            localStorage.removeItem('pharmx_token')
            localStorage.removeItem('pharmx_user')
            setUser(null)
          }
        } else {
          console.log('[Session Provider] No existing session found')
          setUser(null)
        }
      } catch (err) {
        console.error('[Session Provider] Session check failed:', err)
        setError(err as Error)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkExistingSession()
  }, [])

  return (
    <UserContext.Provider value={{ user, isLoading, error }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}

// Main Auth0 Provider Component
export function Auth0Provider({ children }: { children: React.ReactNode }) {
  const domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN
  const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID
  const audience = process.env.NEXT_PUBLIC_AUTH0_AUDIENCE

  if (!domain || !clientId) {
    console.error('Auth0 configuration missing. Check your environment variables.')
    return <div>Configuration Error</div>
  }

  return (
    <Auth0ProviderSDK
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: typeof window !== 'undefined' ? window.location.origin + '/auth/callback' : '',
        audience: audience,
        scope: 'openid profile email'
      }}
      cacheLocation="localstorage"
      useRefreshTokens={true}
    >
      <Auth0ProviderWrapper>
        {children}
      </Auth0ProviderWrapper>
    </Auth0ProviderSDK>
  )
}
