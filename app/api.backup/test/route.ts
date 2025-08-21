import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET() {
  return NextResponse.json({
    message: 'Test API route is working!',
    timestamp: new Date().toISOString(),
    runtime: 'edge',
  })
}
