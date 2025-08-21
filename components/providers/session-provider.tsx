'use client'

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

export function Auth0Provider({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error] = useState<Error | null>(null)

  useEffect(() => {
    // In a production app, you would:
    // 1. Check for stored auth tokens in localStorage/cookies
    // 2. Validate them with your Worker API
    // 3. Fetch user profile from Worker API
    
    // For now, check if user data is in localStorage (mock)
    const storedUser = localStorage.getItem('pharmx_user')
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (e) {
        console.error('Failed to parse user data', e)
      }
    }
    setIsLoading(false)
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
