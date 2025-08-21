import { NextRequest, NextResponse } from 'next/server'

// Generate static params for the dynamic route
export async function generateStaticParams() {
  return [
    { auth0: 'login' },
    { auth0: 'callback' },
    { auth0: 'logout' },
  ]
}

// Simple Auth0 authentication handlers for Edge Runtime
export async function GET(request: NextRequest, { params }: { params: { auth0: string } }) {
  const action = params.auth0
  
  const baseUrl = process.env.AUTH0_BASE_URL || 'https://chat.pharmx.co.uk'
  const issuerBase = process.env.AUTH0_ISSUER_BASE_URL
  const clientId = process.env.AUTH0_CLIENT_ID
  
  if (!issuerBase || !clientId) {
    return NextResponse.json({ error: 'Auth0 not configured' }, { status: 500 })
  }
  
  switch (action) {
    case 'login':
      // Redirect to Auth0 login with Google connection
      const searchParams = request.nextUrl.searchParams
      const connection = searchParams.get('connection') || 'google-oauth2'
      const returnTo = searchParams.get('returnTo') || '/onboarding'
      
      const authUrl = new URL(`${issuerBase}/authorize`)
      authUrl.searchParams.set('response_type', 'code')
      authUrl.searchParams.set('client_id', clientId)
      authUrl.searchParams.set('redirect_uri', `${baseUrl}/api/auth/callback`)
      authUrl.searchParams.set('scope', 'openid profile email')
      authUrl.searchParams.set('connection', connection)
      authUrl.searchParams.set('state', Buffer.from(JSON.stringify({ returnTo })).toString('base64'))
      
      return NextResponse.redirect(authUrl.toString())
      
    case 'callback':
      // This would handle the OAuth callback - simplified for now
      // In production, you'd exchange the code for tokens and create a session
      return NextResponse.redirect(`${baseUrl}/onboarding`)
      
    case 'logout':
      // Redirect to Auth0 logout
      const logoutUrl = new URL(`${issuerBase}/v2/logout`)
      logoutUrl.searchParams.set('client_id', clientId)
      logoutUrl.searchParams.set('returnTo', baseUrl)
      
      return NextResponse.redirect(logoutUrl.toString())
      
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 404 })
  }
}
