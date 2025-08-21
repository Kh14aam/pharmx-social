import { NextRequest, NextResponse } from 'next/server'
import { auth0Config } from '@/lib/auth0'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  // Placeholder for Auth0 login redirect
  // Full implementation will be added when Auth0 credentials are configured
  const { searchParams } = request.nextUrl
  const connection = searchParams.get('connection')
  
  const authUrl = new URL(`${auth0Config.issuerBaseURL}/authorize`)
  authUrl.searchParams.set('client_id', auth0Config.clientID)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', auth0Config.authorizationParams.scope)
  authUrl.searchParams.set('redirect_uri', `${auth0Config.baseURL}/api/auth/callback`)
  authUrl.searchParams.set('state', crypto.randomUUID())
  
  if (connection) {
    authUrl.searchParams.set('connection', connection)
  }
  
  if (auth0Config.authorizationParams.audience) {
    authUrl.searchParams.set('audience', auth0Config.authorizationParams.audience)
  }
  
  return NextResponse.redirect(authUrl.toString())
}
