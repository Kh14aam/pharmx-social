class ApiClient {
  private token: string | null = null
  private baseUrl: string

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://pharmx-api.kasimhussain333.workers.dev'
    
    // Try to get token from localStorage if in browser
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token')
    }
  }

  setToken(token: string) {
    this.token = token
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token)
    }
  }

  getToken(): string | null {
    // Try to get from localStorage if not in memory
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token')
    }
    return this.token
  }

  clearToken() {
    this.token = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
    }
  }

  async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          this.clearToken()
          throw new Error('Authentication required')
        }
        throw new Error(`API request failed: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('API request error:', error)
      throw error
    }
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const response = await this.request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    
    if (response.token) {
      this.setToken(response.token)
    }
    
    return response
  }

  async register(email: string, password: string, name: string) {
    const response = await this.request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    })
    
    if (response.token) {
      this.setToken(response.token)
    }
    
    return response
  }

  async logout() {
    try {
      await this.request('/api/v1/auth/logout', {
        method: 'POST',
      })
    } finally {
      this.clearToken()
    }
  }

  // User endpoints
  async getProfile() {
    return this.request('/api/v1/user/profile')
  }

  async updateProfile(data: Record<string, unknown>) {
    return this.request('/api/v1/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // Chat endpoints
  async getChats() {
    return this.request('/api/v1/chats')
  }

  async sendMessage(chatId: string, message: string) {
    return this.request(`/api/v1/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    })
  }
}

// Export singleton instance
export const apiClient = new ApiClient()
