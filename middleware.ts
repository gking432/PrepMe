import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that are completely public (no auth check at all)
const PUBLIC_ROUTES = [
  '/',
  '/auth/login',
  '/auth/signup',
  '/auth/callback',
]

// Routes that allow anonymous access (for free HR screen tier)
// These still run the middleware but don't redirect unauthenticated users
const ANONYMOUS_ALLOWED_ROUTES = [
  '/dashboard',
  '/interview',
  '/interview/feedback',
]

// API routes that allow anonymous access
const ANONYMOUS_ALLOWED_API = [
  '/api/extract-text',
  '/api/interview/voice',
  '/api/interview/start',
  '/api/interview/feedback',
  '/api/interview/practice',
  '/api/interview/text',
]

// Routes that strictly require authentication
const PROTECTED_ROUTES = [
  '/profile',
  '/admin',
]

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const pathname = req.nextUrl.pathname

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return res
  }

  // Public routes — no auth check needed
  if (PUBLIC_ROUTES.some(route => pathname === route)) {
    return res
  }

  // Create Supabase client for middleware and get session safely
  let session = null
  try {
    const supabase = createMiddlewareClient({ req, res })
    const { data } = await supabase.auth.getSession()
    session = data?.session
  } catch (e) {
    // Session parsing failed (e.g. after logout with stale cookies)
    // Treat as unauthenticated
  }

  // Protected routes — must be authenticated
  if (PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
    if (!session) {
      const redirectUrl = new URL('/auth/login', req.url)
      redirectUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(redirectUrl)
    }
    return res
  }

  // API routes — enforce stage gating for non-HR stages
  if (pathname.startsWith('/api/')) {
    // Allow anonymous API access for listed routes
    if (ANONYMOUS_ALLOWED_API.some(route => pathname.startsWith(route))) {
      // For interview voice/start/feedback APIs, check if non-HR stage requires auth
      if (
        pathname.startsWith('/api/interview/voice') ||
        pathname.startsWith('/api/interview/start') ||
        pathname.startsWith('/api/interview/feedback')
      ) {
        // We can't easily read the body in middleware for POST requests,
        // so stage-level auth enforcement is done in the route handlers themselves.
        // Middleware just ensures the session cookie is refreshed.
        return res
      }
      return res
    }

    // All other API routes require auth
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return res
  }

  // Anonymous-allowed page routes — let through but refresh session
  if (ANONYMOUS_ALLOWED_ROUTES.some(route => pathname.startsWith(route))) {
    return res
  }

  // Default: require auth for any unmatched route
  if (!session) {
    const redirectUrl = new URL('/auth/login', req.url)
    redirectUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  matcher: [
    // Match all routes except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
