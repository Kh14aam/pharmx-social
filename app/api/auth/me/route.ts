import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    // In a production app, you would validate the session cookie here
    // For now, we'll return a mock user for testing
    const cookieStore = cookies()
    const sessionCookie = cookieStore.get('appSession')
    
    if (!sessionCookie) {
      return NextResponse.json(null, { status: 401 })
    }
    
    // Mock user data - in production this would come from validated session
    // You would decode and validate the JWT token here
    return NextResponse.json({
      email: 'user@example.com',
      name: 'Test User',
      picture: null,
      sub: 'auth0|123456',
    })
  } catch (error) {
    console.error('Error fetching session:', error)
    return NextResponse.json(null, { status: 401 })
  }
}
