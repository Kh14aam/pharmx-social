// API Client for PharmX Worker API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://pharmx-api.kasimhussain333.workers.dev'

export class ApiClient {
  private token: string | null = null
  private sessionId: string | null = null

  constructor() {
    // Load token from localStorage if available
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('pharmx_token')
      this.sessionId = localStorage.getItem('pharmx_session')
    }
  }

  // Set authentication token
  setAuth(token: string, sessionId: string) {
    this.token = token
    this.sessionId = sessionId
    if (typeof window !== 'undefined') {
      localStorage.setItem('pharmx_token', token)
      localStorage.setItem('pharmx_session', sessionId)
    }
  }

  // Clear authentication
  clearAuth() {
    this.token = null
    this.sessionId = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pharmx_token')
      localStorage.removeItem('pharmx_session')
    }
  }

  // Make authenticated request
  private async request(endpoint: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    }

    // Only set Content-Type if not already set and body is not FormData
    if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }
    if (this.sessionId) {
      headers['X-Session-ID'] = this.sessionId
    }

    console.log(`[API] ${options.method || 'GET'} ${endpoint}`)

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    })

    if (!response.ok) {
      // Try to parse error response
      let errorMessage = `Request failed with status ${response.status}`
      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorData.message || errorMessage
        console.error(`[API Error] ${endpoint}:`, errorData)
      } catch {
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage
      }

      if (response.status === 401) {
        this.clearAuth()
        window.location.href = '/login'
      }
      
      throw new Error(errorMessage)
    }

    const data = await response.json()
    console.log(`[API Response] ${endpoint}:`, data)
    return data
  }

  // Auth endpoints
  auth = {
    login: () => {
      window.location.href = `${API_BASE_URL}/api/v1/auth/login`
    },
    logout: async () => {
      await this.request('/api/v1/auth/logout', { method: 'POST' })
      this.clearAuth()
    },
    verify: () => this.request('/api/v1/auth/verify'),
  }

  // Profile endpoints
  profile = {
    get: () => this.request('/api/v1/profile'),
    update: (data: Record<string, unknown>) => this.request('/api/v1/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    uploadAvatar: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return this.request('/api/v1/upload/avatar', {
        method: 'POST',
        body: formData,
      })
    },
    create: (data: Record<string, unknown>) => this.request('/api/v1/profile', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  }

  // Users endpoints
  users = {
    list: (params?: { limit?: number; offset?: number }) => {
      const query = new URLSearchParams(params as Record<string, string>).toString()
      return this.request(`/api/v1/users${query ? `?${query}` : ''}`)
    },
    get: (id: string) => this.request(`/api/v1/users/${id}`),
    search: (query: string) => this.request(`/api/v1/users/search?q=${encodeURIComponent(query)}`),
  }

  // Chats endpoints
  chats = {
    list: () => this.request('/api/v1/chats'),
    create: (otherUserId: string) => this.request('/api/v1/chats', {
      method: 'POST',
      body: JSON.stringify({ otherUserId }),
    }),
    getMessages: (chatId: string, params?: { limit?: number; offset?: number }) => {
      const query = new URLSearchParams(params as Record<string, string>).toString()
      return this.request(`/api/v1/chats/${chatId}/messages${query ? `?${query}` : ''}`)
    },
    sendMessage: (chatId: string, content: string) => this.request(`/api/v1/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
  }

  // Health check
  health = () => fetch(`${API_BASE_URL}/health`).then(r => r.json())
}

// Export singleton instance
export const apiClient = new ApiClient()
