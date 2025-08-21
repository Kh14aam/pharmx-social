"use client"

import { useState } from "react"
import { apiClient } from "@/lib/api-client"
import { Button } from "@/components/ui/button"

export default function TestUploadPage() {
  const [status, setStatus] = useState<string>("")
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toISOString()}: ${message}`])
    console.log(message)
  }

  const testAuth = async () => {
    try {
      addLog("Testing authentication...")
      const result = await apiClient.auth.verify()
      addLog(`Auth successful: ${JSON.stringify(result)}`)
      setStatus("✅ Authentication working")
    } catch (error) {
      addLog(`Auth failed: ${error}`)
      setStatus("❌ Authentication failed")
    }
  }

  const testUploadService = async () => {
    try {
      addLog("Testing upload service...")
      const response = await fetch('https://pharmx-api.kasimhussain333.workers.dev/api/v1/upload/test')
      const data = await response.json()
      addLog(`Upload service test: ${JSON.stringify(data)}`)
      setStatus(data.hasR2 && data.hasDB ? "✅ Upload service configured" : "❌ Upload service misconfigured")
    } catch (error) {
      addLog(`Upload service test failed: ${error}`)
      setStatus("❌ Upload service test failed")
    }
  }

  const testFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    addLog(`Selected file: ${file.name}, size: ${file.size}, type: ${file.type}`)

    try {
      addLog("Uploading file...")
      const result = await apiClient.profile.uploadAvatar(file)
      addLog(`Upload successful: ${JSON.stringify(result)}`)
      setStatus("✅ File uploaded successfully!")
    } catch (error) {
      addLog(`Upload failed: ${error}`)
      setStatus(`❌ Upload failed: ${error}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">Upload Test Page</h1>
        
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="space-y-2">
            <Button onClick={testAuth}>Test Authentication</Button>
            <Button onClick={testUploadService} className="ml-2">Test Upload Service</Button>
          </div>

          <div className="border-t pt-4">
            <label className="block">
              <span className="text-sm font-medium">Test File Upload:</span>
              <input
                type="file"
                accept="image/*"
                onChange={testFileUpload}
                className="mt-1 block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-violet-50 file:text-violet-700
                  hover:file:bg-violet-100"
              />
            </label>
          </div>

          {status && (
            <div className={`p-3 rounded ${status.startsWith('✅') ? 'bg-green-100' : 'bg-red-100'}`}>
              {status}
            </div>
          )}

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">Logs:</h3>
            <div className="bg-gray-100 rounded p-3 h-64 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-gray-500">No logs yet...</p>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="text-xs font-mono mb-1">{log}</div>
                ))
              )}
            </div>
          </div>

          <div className="border-t pt-4 text-sm text-gray-600">
            <p>Also check your browser console (F12) for detailed logs.</p>
            <p>API URL: https://pharmx-api.kasimhussain333.workers.dev</p>
          </div>
        </div>
      </div>
    </div>
  )
}
