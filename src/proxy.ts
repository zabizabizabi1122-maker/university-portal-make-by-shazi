import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { homeForRole, type Role } from '@/lib/roles'

const ROLE_PREFIX: Record<string, Role> = {
  '/admin': 'ADMIN',
  '/faculty': 'FACULTY',
  '/student': 'STUDENT',
}

const PUBLIC_PATHS = ['/login', '/register', '/verify-otp']

/**
 * Optimistic route guard: keeps users out of dashboards that do not belong to
 * their role. Real authorization is still enforced in pages and API routes.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('auth_token')?.value
  const session = token ? await verifyToken(token) : null

  // Public event pages (accessible to everyone)
  if (pathname.startsWith('/events/')) {
    return NextResponse.next()
  }

  // Public auth pages (login, register, verify-otp)
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(`${p}/`))) {
    if (session) {
      return NextResponse.redirect(new URL(homeForRole(session.role), request.url))
    }
    return NextResponse.next()
  }

  // Landing page
  if (pathname === '/') {
    return NextResponse.next()
  }

  // Protected dashboard routes
  if (!session) {
    const url = new URL('/login', request.url)
    // Preserve redirect URL for post-login redirect
    if (pathname !== '/login') {
      url.searchParams.set('redirect', pathname)
    }
    return NextResponse.redirect(url)
  }

  const home = homeForRole(session.role)
  for (const [prefix, role] of Object.entries(ROLE_PREFIX)) {
    if ((pathname === prefix || pathname.startsWith(`${prefix}/`)) && session.role !== role) {
      return NextResponse.redirect(new URL(home, request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/register',
    '/verify-otp',
    '/admin',
    '/admin/:path*',
    '/faculty',
    '/faculty/:path*',
    '/student',
    '/student/:path*',
    '/events/:path*',
  ],
}
