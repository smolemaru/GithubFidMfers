import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyQuickAuthToken } from '@/lib/quickauth'

export async function middleware(request: NextRequest) {
  // Only protect API routes that need auth
  if (request.nextUrl.pathname.startsWith('/api/protected')) {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing authorization token' },
        { status: 401 }
      )
    }
    
    const token = authHeader.split(' ')[1]
    const { fid, error } = await verifyQuickAuthToken(token)
    
    if (error || !fid) {
      return NextResponse.json(
        { error: error || 'Invalid token' },
        { status: 401 }
      )
    }
    
    // Add FID to request headers for use in API routes
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-fid', fid.toString())
    
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: '/api/protected/:path*',
}

