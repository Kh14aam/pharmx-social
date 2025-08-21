import { auth0 } from '@/lib/auth0'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  return auth0.handleAuth({
    callback: auth0.handleCallback(),
  })(request)
}
