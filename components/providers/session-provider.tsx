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

export function SessionProvider({
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
        const token = typeof window !== 'undefined' ? localStorage.getItem('pharmx_token') : null
        const userData = typeof window !== 'undefined' ? localStorage.getItem('pharmx_user') : null

        if (token && userData) {
          try {
            const parsed = JSON.parse(userData)
            setUser(parsed)
          } catch {
            localStorage.removeItem('pharmx_token')
            localStorage.removeItem('pharmx_user')
            setUser(null)
          }
        } else {
          setUser(null)
        }
      } catch (err) {
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
