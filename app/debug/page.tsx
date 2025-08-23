'use client'

import { useUser } from '@/components/providers/session-provider'
import { useEffect, useState } from 'react'

export default function DebugPage() {
  const { user: sessionUser, isLoading: sessionLoading } = useUser()
  const [localStorageData, setLocalStorageData] = useState<{
    token: string | null;
    user: unknown;
    hasToken: boolean;
    hasUser: boolean;
  }>({
    token: null,
    user: null,
    hasToken: false,
    hasUser: false
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('pharmx_token')
      const userData = localStorage.getItem('pharmx_user')
      
      setLocalStorageData({
        token: token,
        user: userData ? JSON.parse(userData) : null,
        hasToken: !!token,
        hasUser: !!userData
      })
    }
  }, [])

  if (sessionLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Debug Information</h1>
        
        <div className="grid gap-6">
          {/* Session State */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Session State</h2>
            <div className="space-y-2">
              <p><strong>Is Loading:</strong> {sessionLoading ? 'Yes' : 'No'}</p>
              <p><strong>Has User:</strong> {sessionUser ? 'Yes' : 'No'}</p>
              {sessionUser && (
                <div className="mt-4">
                  <h3 className="font-medium">User Details:</h3>
                  <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
                    {JSON.stringify(sessionUser, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Local Storage */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Local Storage</h2>
            <div className="space-y-2">
              <p><strong>Has Token:</strong> {localStorageData.hasToken ? 'Yes' : 'No'}</p>
              <p><strong>Has User:</strong> {localStorageData.hasUser ? 'Yes' : 'No'}</p>
              <p><strong>Token Preview:</strong> {localStorageData.token || 'None'}</p>
              <p><strong>User Email:</strong> {localStorageData.user && typeof localStorageData.user === 'object' && 'email' in localStorageData.user ? (localStorageData.user as { email: string }).email : 'None'}</p>
            </div>
          </div>

          {/* Environment */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Environment</h2>
            <div className="space-y-2">
              <p><strong>API URL:</strong> {process.env.NEXT_PUBLIC_API_URL || 'Not set'}</p>
              <p><strong>Current URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'SSR'}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Actions</h2>
            <div className="space-x-4">
              <button 
                onClick={() => {
                  localStorage.removeItem('pharmx_token')
                  localStorage.removeItem('pharmx_user')
                  window.location.reload()
                }}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Clear Session
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Refresh Page
              </button>
            </div>
          </div>

          {/* Debug JSON */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Debug JSON</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify({
                session: { user: sessionUser, isLoading: sessionLoading },
                localStorage: localStorageData,
                environment: {
                  apiUrl: process.env.NEXT_PUBLIC_API_URL,
                  currentUrl: typeof window !== 'undefined' ? window.location.href : 'SSR'
                }
              }, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
} 