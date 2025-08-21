import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: {
      hasAuth0Config: !!(
        process.env.AUTH0_BASE_URL &&
        process.env.AUTH0_ISSUER_BASE_URL &&
        process.env.AUTH0_CLIENT_ID &&
        process.env.AUTH0_CLIENT_SECRET &&
        process.env.AUTH0_SECRET
      ),
      hasStripeConfig: !!(
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY &&
        process.env.STRIPE_SECRET_KEY
      ),
      nodeEnv: process.env.NODE_ENV,
    }
  })
}
