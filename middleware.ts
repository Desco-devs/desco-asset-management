import { createMiddlewareClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const supabase = createMiddlewareClient(request)

  // Refresh session if expired - required for Server Components
  const { data: { session } } = await supabase.auth.getSession()

  // Protected routes that require authentication
  const protectedRoutes = [
    '/home',
    '/users',
    '/locations',
    '/projects',
    '/equipments',
    '/vehicles',
    '/assets'
  ]

  // Check if current path is a protected route
  const isProtectedRoute = protectedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )

  // If accessing a protected route without session, redirect to login
  if (isProtectedRoute && !session) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // If accessing login page with valid session, redirect to home
  if (request.nextUrl.pathname === '/login' && session) {
    return NextResponse.redirect(new URL('/home', request.url))
  }

  // If accessing root with valid session, redirect to home
  if (request.nextUrl.pathname === '/' && session) {
    return NextResponse.redirect(new URL('/home', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes)
     * - landing-page (public landing page)
     */
    '/((?!_next/static|_next/image|favicon.ico|api|landing-page).*)',
  ],
}