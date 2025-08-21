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
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // Fetch user session from the API route
    fetch('/api/auth/me')
      .then(res => {
        if (res.ok) {
          return res.json()
        }
        return null
      })
      .then(data => {
        setUser(data)
        setIsLoading(false)
      })
      .catch(err => {
        setError(err)
        setIsLoading(false)
      })
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
