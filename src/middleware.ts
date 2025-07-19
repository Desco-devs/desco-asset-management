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
  console.log("🚀 MIDDLEWARE RUNNING for:", request.nextUrl.pathname);

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
    console.log("⏭️ MIDDLEWARE SKIPPED for path:", request.nextUrl.pathname);
    return response;
  }

  // Get user with server verification - More secure for middleware authentication
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  // Cache for user data within this request to avoid multiple API calls
  let userData: any = null;
  
  // Helper function to fetch user data once and cache it
  const getUserData = async () => {
    if (userData || !user) return userData;
    
    try {
      const apiUrl = new URL("/api/session", request.url);
      const sessionResponse = await fetch(apiUrl.toString(), {
        headers: {
          'cookie': request.headers.get('cookie') || '',
        },
      });

      if (sessionResponse.ok) {
        const result = await sessionResponse.json();
        userData = result.user;
      }
    } catch (error) {
      console.error("❌ Error fetching user data:", error);
    }
    
    return userData;
  };

  console.log("🔍 User check:", {
    path: request.nextUrl.pathname,
    hasUser: !!user,
    userEmail: user?.email,
    userId: user?.id,
    error: userError?.message,
  });

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
    console.log("🚀 BLOCKING: Authenticated user accessing public page, redirecting based on role");
    
    const currentUserData = await getUserData();
    
    if (currentUserData && currentUserData.user_status === "ACTIVE") {
      const redirectPath = getDefaultRedirectPath(currentUserData.role);
      console.log("✅ Redirecting authenticated user to:", redirectPath, "Role:", currentUserData.role);
      return NextResponse.redirect(new URL(redirectPath, request.url));
    }
    
    // Fallback redirect
    return NextResponse.redirect(new URL(DEFAULT_AUTHENTICATED_REDIRECT, request.url));
  }

  // If accessing root with user, redirect based on role
  if (request.nextUrl.pathname === "/" && user) {
    console.log("🚀 Redirecting authenticated user from root based on role");
    
    const currentUserData = await getUserData();
    
    if (currentUserData && currentUserData.user_status === "ACTIVE") {
      const redirectPath = getDefaultRedirectPath(currentUserData.role);
      console.log("✅ Redirecting user from root to:", redirectPath, "Role:", currentUserData.role);
      return NextResponse.redirect(new URL(redirectPath, request.url));
    }
    
    // Fallback redirect
    return NextResponse.redirect(new URL(DEFAULT_AUTHENTICATED_REDIRECT, request.url));
  }

  // If accessing root without user, redirect to landing page
  if (request.nextUrl.pathname === "/" && !user) {
    console.log("🚀 Redirecting unauthenticated user from root to landing page");
    return NextResponse.redirect(new URL("/landing-page", request.url));
  }

  // If accessing dashboard protected routes without user, redirect to login
  if (isDashboardProtectedRoute && !user) {
    console.log("🔒 Dashboard route accessed without user, redirecting to login");
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If accessing any non-public route without user, redirect to login
  if (!isPublicRoute && !user && request.nextUrl.pathname !== "/assets") {
    console.log("🔒 Protected route accessed without user, redirecting to login");
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // For authenticated users accessing dashboard routes, check if they're viewers
  if (user && isDashboardProtectedRoute) {
    console.log("🔐 Checking if viewer should be redirected from dashboard route");
    
    const currentUserData = await getUserData();
    
    // If user is a VIEWER, redirect them to assets (they can only access assets)
    if (currentUserData && currentUserData.role === 'VIEWER') {
      console.log("🚀 BLOCKING: Viewer trying to access dashboard route, redirecting to assets");
      return NextResponse.redirect(new URL(DEFAULT_AUTHENTICATED_REDIRECT, request.url));
    }
    
    console.log("✅ Admin/SuperAdmin accessing dashboard route:", currentUserData?.role);
  }

  // Add user info to headers if authenticated (for use in API routes and components)
  if (user) {
    response.headers.set("x-user-id", user.id);
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
