/**
 * Middleware for BetterAuth Authentication and Route Protection
 *
 * This middleware handles:
 * 1. Public routes - accessible without authentication (/, /login, /register)
 * 2. Protected routes - require authentication (chat, API endpoints)
 * 3. Admin routes - require admin role (/admin/*)
 * 4. Proper redirects for unauthorized access attempts
 * 5. Session detection via BetterAuth session cookie (Edge-compatible, no Node.js imports)
 *
 * Route Protection Logic:
 * - Unauthenticated users: redirected to /login (except public routes)
 * - Authenticated users on auth pages: redirected to / or redirectTo param
 * - Non-admin users on admin routes: redirected by server components (not middleware)
 * - Admin users: full access to all routes
 * - Regular users: access to all non-admin routes
 */

import { type NextRequest, NextResponse } from "next/server";
import { isRepoWikiPath } from "@/lib/repo-wiki";

// BetterAuth session cookie name. Must match the basePath in lib/auth/instance.ts.
// The middleware only checks cookie presence — full session validation happens
// in server components via auth.api.getSession(). Admin role enforcement is
// also handled server-side; the middleware only redirects unauthenticated users.
const SESSION_COOKIE = "better-auth.session_token";

// Route configuration
const PUBLIC_ROUTES = [
  "/", // Home page - accessible to all users
  "/intro", // Intro/landing page - accessible to all users
  "/key",       // Key manager inside chat navigation
  "/chat/key", // Legacy key manager path - redirects to /chat/keys
  "/chat/keys", // Key manager widget
  "/keys", // Key manager asset route + root shortcut
  "/api/repos",         // Public: available repos list (no auth needed, reads local files)
  "/api/server-keys",   // Public: which provider keys are present in server .env
  "/api/validate-key",  // Public: validate a user-supplied API key against provider
  "/api/github-token",  // Public: server GitHub PAT for the GitHub integration
  "/login", // Login page - accessible to unauthenticated users
  "/register", // Registration page - accessible to unauthenticated users
  "/ping", // Health check endpoint for testing
  "/features", // Features page - accessible to all users
  "/agents", // Agents page - accessible to all users
  "/faq", // FAQ page - accessible to all users
  "/know", // Trade map embed demo (page + its /know/embed.html static asset) - accessible to all users
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
  if (isRepoWikiPath(pathname)) {
    return true;
  }

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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /*
   * Playwright starts the dev server and requires a 200 status to
   * begin the tests, so this ensures that the tests can start
   */
  if (pathname.startsWith("/ping")) {
    return new Response("pong", { status: 200 });
  }

  // Honor REQUIRE_AUTH (and host-based default) to decide whether the
  // middleware should redirect anonymous users to /login. Mirrors the helper
  // in `lib/auth/server.ts:isAuthRequired`. When auth isn't required, fall
  // through with whatever session the user has (server logs may still gate
  // private chats, but anonymous /chat browsing is allowed).
  const authFlag = process.env.REQUIRE_AUTH?.trim().toLowerCase();
  let authRequired: boolean;
  if (authFlag === "true") {
    authRequired = true;
  } else if (authFlag === "false") {
    authRequired = false;
  } else {
    // Default: do not force auth. Set REQUIRE_AUTH=true to gate the whole site.
    // Individual server components (requireAuth, requireAdmin) handle their own gates.
    authRequired = false;
  }
  if (!authRequired) {
    return NextResponse.next();
  }

  // Skip middleware for system routes and static files
  if (
    pathname.startsWith("/api/auth") || // BetterAuth auth endpoints
    pathname.startsWith("/api/oauth") || // OAuth navigation proxy (incognito-safe)
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

  const response = NextResponse.next();
  const isAuthenticated = !!request.cookies.get(SESSION_COOKIE);

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

  // Admin role enforcement is handled by server components (requireAdmin/requireAdminWithRedirect).
  // The middleware only ensures the user is authenticated before reaching admin routes.

  // Protected routes are accessible to all authenticated users
  // (both admin and regular users can access chat, API endpoints, etc.)

  // Allow the request to proceed
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (BetterAuth endpoints - handled by BetterAuth)
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
