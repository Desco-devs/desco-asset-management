import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  DASHBOARD_PROTECTED_ROUTES,
  SKIP_MIDDLEWARE_PATHS,
  PUBLIC_ROUTES,
  DEFAULT_AUTHENTICATED_REDIRECT,
} from "./lib/auth";
import { getDefaultRedirectPath } from "./lib/auth/utils";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Create Supabase client with proper middleware setup
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Skip middleware for certain paths to prevent redirect loops
  if (SKIP_MIDDLEWARE_PATHS.some((path) => request.nextUrl.pathname.startsWith(path))) {
    return response;
  }

  // Get user with server verification
  const { data: { user } } = await supabase.auth.getUser();

  // Get user role from user metadata (stored in Supabase)
  const userRole = user?.user_metadata?.role || null;
  const userStatus = user?.user_metadata?.user_status || 'ACTIVE';

  // Check if this is a public route
  const isPublicRoute = PUBLIC_ROUTES.some(route => 
    request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(route)
  );

  // Check if accessing a dashboard protected route
  const isDashboardProtectedRoute = DASHBOARD_PROTECTED_ROUTES.some(route =>
    request.nextUrl.pathname.startsWith(route)
  );

  // If authenticated user tries to access login or landing page, redirect based on role
  if (user && (request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/landing-page")) {
    if (userRole && userStatus === "ACTIVE") {
      const redirectPath = getDefaultRedirectPath(userRole);
      return NextResponse.redirect(new URL(redirectPath, request.url));
    }
    
    // Fallback redirect
    return NextResponse.redirect(new URL(DEFAULT_AUTHENTICATED_REDIRECT, request.url));
  }

  // If accessing root with user, redirect based on role
  if (request.nextUrl.pathname === "/" && user) {
    if (userRole && userStatus === "ACTIVE") {
      const redirectPath = getDefaultRedirectPath(userRole);
      return NextResponse.redirect(new URL(redirectPath, request.url));
    }
    
    // Fallback redirect
    return NextResponse.redirect(new URL(DEFAULT_AUTHENTICATED_REDIRECT, request.url));
  }

  // If accessing root without user, redirect to landing page
  if (request.nextUrl.pathname === "/" && !user) {
    return NextResponse.redirect(new URL("/landing-page", request.url));
  }

  // If accessing dashboard protected routes without user, redirect to login
  if (isDashboardProtectedRoute && !user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If accessing any non-public route without user, redirect to login
  if (!isPublicRoute && !user && request.nextUrl.pathname !== "/assets") {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // For authenticated users accessing dashboard routes, check if they're viewers
  if (user && isDashboardProtectedRoute) {
    // If user is a VIEWER, redirect them to assets (they can only access assets)
    if (userRole === 'VIEWER') {
      return NextResponse.redirect(new URL(DEFAULT_AUTHENTICATED_REDIRECT, request.url));
    }
  }

  // Add user info to headers if authenticated (for use in API routes and components)
  if (user) {
    response.headers.set("x-user-id", user.id);
    if (userRole) {
      response.headers.set("x-user-role", userRole);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)  
     * - favicon.ico (favicon file)
     * - images (static images)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|images).*)',
  ],
};

console.log("🔥 MIDDLEWARE FILE LOADED");
