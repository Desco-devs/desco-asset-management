import { createMiddlewareClient } from './src/lib/supabase-server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { UserRole } from './src/types/auth'
import { ROUTE_ACCESS_CONFIG, SKIP_MIDDLEWARE_PATHS, getDefaultRedirectPath } from './src/lib/auth'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const supabase = createMiddlewareClient(request)

  // Skip middleware for certain paths to prevent redirect loops
  if (SKIP_MIDDLEWARE_PATHS.some(path => request.nextUrl.pathname.startsWith(path))) {
    return response
  }

  // Refresh session if expired - required for Server Components
  const { data: { session } } = await supabase.auth.getSession()

  // Check if current path is a protected route
  const matchedRoute = ROUTE_ACCESS_CONFIG.find(route => 
    request.nextUrl.pathname.startsWith(route.path)
  )

  // If accessing a protected route without session, redirect to login
  if (matchedRoute && !session) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // If user is authenticated, check role-based access
  if (matchedRoute && session) {
    try {
      // Get user role from database
      const { data: userData, error } = await supabase
        .from('users')
        .select('role, user_status')
        .eq('id', session.user.id)
        .single()

      if (error || !userData) {
        // If user not found in database, redirect to login
        const redirectUrl = new URL('/login', request.url)
        redirectUrl.searchParams.set('error', 'User not found')
        return NextResponse.redirect(redirectUrl)
      }

      // Check if user is active
      if (userData.user_status !== 'ACTIVE') {
        const redirectUrl = new URL('/login', request.url)
        redirectUrl.searchParams.set('error', 'Account inactive')
        return NextResponse.redirect(redirectUrl)
      }

      // Check if user has required role
      if (!matchedRoute.allowedRoles.includes(userData.role)) {
        // Redirect to unauthorized page
        const redirectUrl = new URL('/unauthorized', request.url)
        return NextResponse.redirect(redirectUrl)
      }

      // Add user role to headers for use in API routes and components
      response.headers.set('x-user-role', userData.role)
      response.headers.set('x-user-id', session.user.id)
      
    } catch (error) {
      console.error('Middleware error:', error)
      // On error, redirect to login
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('error', 'Authentication error')
      return NextResponse.redirect(redirectUrl)
    }
  }

  // If accessing root with valid session, redirect based on user role
  if (request.nextUrl.pathname === '/' && session) {
    try {
      // Get user role to determine redirect destination
      const { data: userData, error } = await supabase
        .from('users')
        .select('role, user_status')
        .eq('id', session.user.id)
        .single()

      if (error || !userData || userData.user_status !== 'ACTIVE') {
        // If user not found or inactive, redirect to login
        const redirectUrl = new URL('/login', request.url)
        return NextResponse.redirect(redirectUrl)
      }

      // Redirect based on user role
      const redirectPath = getDefaultRedirectPath(userData.role)
      return NextResponse.redirect(new URL(redirectPath, request.url))
    } catch (error) {
      console.error('Root redirect error:', error)
      return NextResponse.redirect(new URL('/login', request.url))
    }
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