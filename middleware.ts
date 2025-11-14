/**
 * Middleware for Supabase Authentication and Route Protection
 *
 * This middleware handles:
 * 1. Public routes - accessible without authentication (/, /login, /register)
 * 2. Protected routes - require authentication (chat, API endpoints)
 * 3. Admin routes - require admin role (/admin/*)
 * 4. Proper redirects for unauthorized access attempts
 * 5. Session validation using Supabase Auth
 *
 * Route Protection Logic:
 * - Unauthenticated users: redirected to /login (except public routes)
 * - Authenticated users on auth pages: redirected to / or redirectTo param
 * - Non-admin users on admin routes: redirected to /
 * - Admin users: full access to all routes
 * - Regular users: access to all non-admin routes
 */

import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import {
  ErrorCategory,
  ErrorSeverity,
  logPermissionError,
  logSystemError,
} from "@/lib/errors/logger";

// Route configuration
const PUBLIC_ROUTES = [
  "/", // Home page - accessible to all users
  "/login", // Login page - accessible to unauthenticated users
  "/register", // Registration page - accessible to unauthenticated users
  "/ping", // Health check endpoint for testing
  "/about", // About page (if implemented)
  "/privacy", // Privacy policy (if implemented)
  "/terms", // Terms of service (if implemented)
];

const ADMIN_ROUTES = [
  "/admin", // Admin dashboard and all admin sub-routes (/admin/*, /admin/users, etc.)
];

// Protected routes are implicitly defined as any route not in PUBLIC_ROUTES
// This includes:
// - /chat/* - Chat interface and conversations
// - /api/* - API endpoints (except auth endpoints)
// - Any other application routes

/**
 * Check if a route is publicly accessible (no authentication required)
 * @param pathname - The request pathname
 * @returns true if the route is public, false otherwise
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => {
    if (route === "/") {
      // Exact match for home page to avoid matching all routes
      return pathname === "/";
    }
    // Check if pathname starts with the route pattern
    return pathname.startsWith(route);
  });
}

/**
 * Check if a route requires admin access
 * @param pathname - The request pathname
 * @returns true if the route requires admin access, false otherwise
 */
function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Check if a route is protected (requires authentication but not admin)
 * @param pathname - The request pathname
 * @returns true if the route is protected, false otherwise
 */
function isProtectedRoute(pathname: string): boolean {
  return !isPublicRoute(pathname) && !isAdminRoute(pathname);
}

/**
 * Extract user role from Supabase user object
 * @param user - The Supabase user object
 * @returns 'admin' if user has admin role, 'user' otherwise
 */
function getUserRole(user: any): "admin" | "user" {
  return user?.user_metadata?.role === "admin" ? "admin" : "user";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /*
   * Playwright starts the dev server and requires a 200 status to
   * begin the tests, so this ensures that the tests can start
   */
  if (pathname.startsWith("/ping")) {
    return new Response("pong", { status: 200 });
  }

  // Skip middleware for system routes and static files
  if (
    pathname.startsWith("/api/auth") || // Supabase auth endpoints
    pathname.startsWith("/_next") || // Next.js internal files
    pathname.startsWith("/favicon.ico") || // Favicon
    pathname.startsWith("/sitemap.xml") || // SEO files
    pathname.startsWith("/robots.txt") || // SEO files
    pathname.startsWith("/images/") || // Static images
    pathname.startsWith("/icons/") || // Static icons
    pathname.startsWith("/.well-known/") || // Browser/DevTools config files
    pathname.match(/\.(js|map|json)$/)
  ) {
    // JavaScript files, source maps, JSON files
    return NextResponse.next();
  }

  // Create Supabase client for middleware
  const response = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Get user from Supabase for middleware authentication
  // Using getUser() instead of getSession() for better security as recommended by Supabase
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Handle session validation errors
  if (error) {
    console.error(
      "Middleware session validation error:",
      error.message || error
    );

    // Log the session validation error
    await logSystemError(
      ErrorCategory.SESSION_EXPIRED,
      `Middleware session validation failed: ${error.message}`,
      {
        pathname,
        error: error.message,
        userAgent: request.headers.get("user-agent"),
        ip:
          request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip") ||
          "unknown",
        timestamp: new Date().toISOString(),
      },
      ErrorSeverity.WARNING
    );

    // If there's an error getting session and it's not a public route, redirect to login
    if (!isPublicRoute(pathname)) {
      const redirectUrl = encodeURIComponent(pathname);
      return NextResponse.redirect(
        new URL(
          `/login?redirectTo=${redirectUrl}&error=session_error`,
          request.url
        )
      );
    }

    // For public routes, allow access even with session errors
    return response;
  }

  // Check if user is authenticated
  const isAuthenticated = !!user;

  // Handle unauthenticated users
  if (!isAuthenticated) {
    // Allow access to public routes
    if (isPublicRoute(pathname)) {
      return response;
    }

    // For protected or admin routes, redirect to login with return URL
    if (isProtectedRoute(pathname) || isAdminRoute(pathname)) {
      const redirectUrl = encodeURIComponent(pathname);
      return NextResponse.redirect(
        new URL(`/login?redirectTo=${redirectUrl}`, request.url)
      );
    }

    // Fallback redirect to login for any other routes
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Handle authenticated users
  const userRole = getUserRole(user);

  // Redirect authenticated users away from auth pages to prevent confusion
  if (pathname === "/login" || pathname === "/register") {
    // Check if there's a redirectTo parameter to honor after login
    const redirectTo = request.nextUrl.searchParams.get("redirectTo");
    if (redirectTo && redirectTo !== "/login" && redirectTo !== "/register") {
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }
    // Default redirect to chat page for authenticated users
    return NextResponse.redirect(new URL("/chat", request.url));
  }

  // Check admin route access
  if (isAdminRoute(pathname)) {
    if (userRole !== "admin") {
      // Log unauthorized admin access attempt
      await logPermissionError(
        ErrorCategory.PERMISSION_DENIED,
        `Non-admin user attempted to access admin route: ${pathname}`,
        {
          pathname,
          userRole,
          userId: user.id,
          userEmail: user.email,
          userAgent: request.headers.get("user-agent"),
          ip:
            request.headers.get("x-forwarded-for") ||
            request.headers.get("x-real-ip") ||
            "unknown",
          timestamp: new Date().toISOString(),
        },
        user.id,
        ErrorSeverity.WARNING
      );

      // Non-admin users trying to access admin routes get redirected to home
      // This prevents privilege escalation attempts
      return NextResponse.redirect(new URL("/", request.url));
    }
    // Admin users are allowed to proceed to admin routes
  }

  // Protected routes are accessible to all authenticated users
  // (both admin and regular users can access chat, API endpoints, etc.)

  // Allow the request to proceed
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (Supabase auth endpoints - handled by Supabase)
     * - _next/static (static files - no auth needed)
     * - _next/image (image optimization files - no auth needed)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files - no auth needed)
     * - images/, icons/ (static assets - no auth needed)
     * - .well-known/ (browser/devtools config files)
     *
     * Note: File extensions (.js, .map, .json) are handled in the middleware function
     * itself using runtime checks to avoid complex regex issues.
     *
     * This ensures middleware runs on:
     * - All page routes (/, /login, /register, /chat/*, /admin/*)
     * - All API routes except auth (api/chat, api/history, etc.)
     * - Any other application routes
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|images/|icons/|\\.well-known/).*)",
  ],
};
