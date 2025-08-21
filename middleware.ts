import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Simply pass through all requests
  return NextResponse.next()
}

// Only run middleware on specific paths
export const config = {
  matcher: [
    // Skip all internal paths (_next)
    '/((?!_next|_static|favicon.ico).*)',
  ],
}
