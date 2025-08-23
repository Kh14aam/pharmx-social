'use client'

import { useAuth0 } from '@auth0/auth0-react'
import { useUser } from '@/components/providers/session-provider'
import { useEffect, useState } from 'react'

export default function DebugPage() {
  const { isAuthenticated, isLoading, user, getAccessTokenSilently, error } = useAuth0()
  const { user: sessionUser, isLoading: sessionLoading } = useUser()
  const [localStorageData, setLocalStorageData] = useState<any>({})

  useEffect(() => {
    // Get localStorage data
    const token = localStorage.getItem('pharmx_token')
    const userData = localStorage.getItem('pharmx_user')
    
    setLocalStorageData({
      token: token ? `${token.substring(0, 20)}...` : null,
      user: userData ? JSON.parse(userData) : null,
      hasToken: !!token,
      hasUser: !!userData
    })
  }, [])

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🔍 Authentication Debug Page</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Auth0 State */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Auth0 State</h2>
            <div className="space-y-2">
              <p><strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}</p>
              <p><strong>Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</p>
              <p><strong>Has User:</strong> {user ? 'Yes' : 'No'}</p>
              <p><strong>User Email:</strong> {user?.email || 'None'}</p>
              <p><strong>User Sub:</strong> {user?.sub || 'None'}</p>
              <p><strong>Error:</strong> {error ? error.message : 'None'}</p>
            </div>
          </div>

          {/* Session Provider State */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Session Provider State</h2>
            <div className="space-y-2">
              <p><strong>Loading:</strong> {sessionLoading ? 'Yes' : 'No'}</p>
              <p><strong>Has User:</strong> {sessionUser ? 'Yes' : 'No'}</p>
              <p><strong>User Email:</strong> {sessionUser?.email || 'None'}</p>
              <p><strong>User Sub:</strong> {sessionUser?.sub || 'None'}</p>
            </div>
          </div>

          {/* LocalStorage State */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">LocalStorage State</h2>
            <div className="space-y-2">
              <p><strong>Has Token:</strong> {localStorageData.hasToken ? 'Yes' : 'No'}</p>
              <p><strong>Has User:</strong> {localStorageData.hasUser ? 'Yes' : 'No'}</p>
              <p><strong>Token Preview:</strong> {localStorageData.token || 'None'}</p>
              <p><strong>User Email:</strong> {localStorageData.user?.email || 'None'}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Actions</h2>
            <div className="space-y-2">
              <button 
                onClick={() => window.location.reload()}
                className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Refresh Page
              </button>
              <button 
                onClick={() => {
                  localStorage.clear()
                  window.location.reload()
                }}
                className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Clear LocalStorage & Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Raw Data */}
        <div className="mt-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Raw Data</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
            {JSON.stringify({
              auth0: { isAuthenticated, isLoading, user, error },
              session: { user: sessionUser, isLoading: sessionLoading },
              localStorage: localStorageData
            }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
} 