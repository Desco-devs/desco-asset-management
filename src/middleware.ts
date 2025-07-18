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

  // Get session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  console.log("🔍 Session check:", {
    path: request.nextUrl.pathname,
    hasSession: !!session,
    userEmail: session?.user?.email,
    userId: session?.user?.id,
    error: sessionError?.message,
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
  if (session && (request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/landing-page")) {
    console.log("🚀 BLOCKING: Authenticated user accessing public page, redirecting based on role");
    
    try {
      // Get user role to determine redirect destination
      const apiUrl = new URL("/api/session", request.url);
      const sessionResponse = await fetch(apiUrl.toString(), {
        headers: {
          'cookie': request.headers.get('cookie') || '',
        },
      });

      if (sessionResponse.ok) {
        const { user: userData } = await sessionResponse.json();
        if (userData && userData.user_status === "ACTIVE") {
          const redirectPath = getDefaultRedirectPath(userData.role);
          console.log("✅ Redirecting authenticated user to:", redirectPath, "Role:", userData.role);
          return NextResponse.redirect(new URL(redirectPath, request.url));
        }
      }
    } catch (error) {
      console.error("❌ Role-based redirect error:", error);
    }
    
    // Fallback redirect
    return NextResponse.redirect(new URL(DEFAULT_AUTHENTICATED_REDIRECT, request.url));
  }

  // If accessing root with session, redirect based on role
  if (request.nextUrl.pathname === "/" && session) {
    console.log("🚀 Redirecting authenticated user from root based on role");
    
    try {
      // Get user role to determine redirect destination
      const apiUrl = new URL("/api/session", request.url);
      const sessionResponse = await fetch(apiUrl.toString(), {
        headers: {
          'cookie': request.headers.get('cookie') || '',
        },
      });

      if (sessionResponse.ok) {
        const { user: userData } = await sessionResponse.json();
        if (userData && userData.user_status === "ACTIVE") {
          const redirectPath = getDefaultRedirectPath(userData.role);
          console.log("✅ Redirecting user from root to:", redirectPath, "Role:", userData.role);
          return NextResponse.redirect(new URL(redirectPath, request.url));
        }
      }
    } catch (error) {
      console.error("❌ Root redirect error:", error);
    }
    
    // Fallback redirect
    return NextResponse.redirect(new URL(DEFAULT_AUTHENTICATED_REDIRECT, request.url));
  }

  // If accessing root without session, redirect to landing page
  if (request.nextUrl.pathname === "/" && !session) {
    console.log("🚀 Redirecting unauthenticated user from root to landing page");
    return NextResponse.redirect(new URL("/landing-page", request.url));
  }

  // If accessing dashboard protected routes without session, redirect to login
  if (isDashboardProtectedRoute && !session) {
    console.log("🔒 Dashboard route accessed without session, redirecting to login");
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If accessing any non-public route without session, redirect to login
  if (!isPublicRoute && !session && request.nextUrl.pathname !== "/assets") {
    console.log("🔒 Protected route accessed without session, redirecting to login");
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // For authenticated users accessing dashboard routes, check if they're viewers
  if (session && isDashboardProtectedRoute) {
    console.log("🔐 Checking if viewer should be redirected from dashboard route");
    
    try {
      // Get user role to determine if they can access dashboard routes
      const apiUrl = new URL("/api/session", request.url);
      const sessionResponse = await fetch(apiUrl.toString(), {
        headers: {
          'cookie': request.headers.get('cookie') || '',
        },
      });

      if (sessionResponse.ok) {
        const { user: userData } = await sessionResponse.json();
        
        // If user is a VIEWER, redirect them to assets (they can only access assets)
        if (userData && userData.role === 'VIEWER') {
          console.log("🚀 BLOCKING: Viewer trying to access dashboard route, redirecting to assets");
          return NextResponse.redirect(new URL(DEFAULT_AUTHENTICATED_REDIRECT, request.url));
        }
        
        console.log("✅ Admin/SuperAdmin accessing dashboard route:", userData?.role);
      }
    } catch (error) {
      console.error("❌ Error checking user role:", error);
    }
  }

  // Add user info to headers if authenticated (for use in API routes and components)
  if (session) {
    response.headers.set("x-user-id", session.user.id);
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
