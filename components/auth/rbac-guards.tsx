/**
 * RBAC Guard Components for UI Protection
 *
 * This file provides React components for role-based access control and authentication guards.
 * Use these components to protect UI sections based on authentication state and user roles.
 */

"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthContext } from "@/lib/auth/context";

// Component prop types
type RBACGuardProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
  showLoading?: boolean;
};

type ConditionalRenderProps = {
  children: React.ReactNode;
};

/**
 * RequireAuth Component
 *
 * Protects UI sections that require authentication.
 * Redirects unauthenticated users to login page.
 *
 * @param children - Content to render for authenticated users
 * @param fallback - Optional content to render while loading or for unauthenticated users
 * @param redirectTo - Optional redirect URL after login (default: current page)
 * @param showLoading - Whether to show loading state (default: true)
 *
 * @example
 * <RequireAuth fallback={<div>Please log in</div>}>
 *   <UserDashboard />
 * </RequireAuth>
 */
export function RequireAuth({
  children,
  fallback,
  redirectTo,
  showLoading = true,
}: RBACGuardProps) {
  const { user, session, loading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    // Don't redirect while loading
    if (loading) {
      return;
    }

    // Redirect to login if not authenticated
    if (!user || !session) {
      const currentPath =
        typeof window !== "undefined" ? window.location.pathname : "/";
      const returnTo = redirectTo || currentPath;
      const loginUrl = `/login?returnTo=${encodeURIComponent(returnTo)}`;
      router.push(loginUrl);
    }
  }, [user, session, loading, router, redirectTo]);

  // Show loading state
  if (loading && showLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="h-8 w-8 animate-spin rounded-full border-gray-900 border-b-2" />
      </div>
    );
  }

  // Show fallback for unauthenticated users
  if (!user || !session) {
    return fallback ? fallback : null;
  }

  // Render children for authenticated users
  return <>{children}</>;
}

/**
 * RequireAdmin Component
 *
 * Protects UI sections that require admin privileges.
 * Redirects non-admin users to home page or specified URL.
 *
 * @param children - Content to render for admin users
 * @param fallback - Optional content to render for non-admin users
 * @param redirectTo - Optional redirect URL for non-admin users (default: home page)
 * @param showLoading - Whether to show loading state (default: true)
 *
 * @example
 * <RequireAdmin fallback={<div>Admin access required</div>}>
 *   <AdminPanel />
 * </RequireAdmin>
 */
export function RequireAdmin({
  children,
  fallback,
  redirectTo = "/",
  showLoading = true,
}: RBACGuardProps) {
  const { user, session, role, isAdmin, loading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    // Don't redirect while loading
    if (loading) {
      return;
    }

    // Redirect to login if not authenticated
    if (!user || !session) {
      const currentPath =
        typeof window !== "undefined" ? window.location.pathname : "/";
      const loginUrl = `/login?returnTo=${encodeURIComponent(currentPath)}`;
      router.push(loginUrl);
      return;
    }

    // Redirect non-admin users
    if (role && !isAdmin) {
      router.push(redirectTo);
    }
  }, [user, session, role, isAdmin, loading, router, redirectTo]);

  // Show loading state
  if (loading && showLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="h-8 w-8 animate-spin rounded-full border-gray-900 border-b-2" />
      </div>
    );
  }

  // Show fallback for non-admin users
  if (!user || !session || (role && !isAdmin)) {
    return fallback ? fallback : null;
  }

  // Render children for admin users
  return <>{children}</>;
}

/**
 * AdminOnly Component
 *
 * Conditionally renders content only for admin users.
 * Does not redirect - simply shows/hides content.
 *
 * @param children - Content to render for admin users only
 *
 * @example
 * <AdminOnly>
 *   <button>Delete All Users</button>
 * </AdminOnly>
 */
export function AdminOnly({ children }: ConditionalRenderProps) {
  const { isAdmin, loading: isLoading } = useAuthContext();

  // Don't render anything while loading or for non-admin users
  if (isLoading || !isAdmin) {
    return null;
  }

  return <>{children}</>;
}

/**
 * UserOnly Component
 *
 * Conditionally renders content only for regular users (non-admin).
 * Does not redirect - simply shows/hides content.
 *
 * @param children - Content to render for regular users only
 *
 * @example
 * <UserOnly>
 *   <div>Regular user content</div>
 * </UserOnly>
 */
export function UserOnly({ children }: ConditionalRenderProps) {
  const { isAuthenticated, isAdmin, loading: isLoading } = useAuthContext();

  // Don't render anything while loading, for unauthenticated users, or for admin users
  if (isLoading || !isAuthenticated || isAdmin) {
    return null;
  }

  return <>{children}</>;
}

/**
 * AuthenticatedOnly Component
 *
 * Conditionally renders content only for authenticated users (any role).
 * Does not redirect - simply shows/hides content.
 *
 * @param children - Content to render for authenticated users only
 *
 * @example
 * <AuthenticatedOnly>
 *   <UserProfile />
 * </AuthenticatedOnly>
 */
export function AuthenticatedOnly({ children }: ConditionalRenderProps) {
  const { isAuthenticated, loading: isLoading } = useAuthContext();

  // Don't render anything while loading or for unauthenticated users
  if (isLoading || !isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

/**
 * UnauthenticatedOnly Component
 *
 * Conditionally renders content only for unauthenticated users.
 * Useful for login/register forms and public content.
 *
 * @param children - Content to render for unauthenticated users only
 *
 * @example
 * <UnauthenticatedOnly>
 *   <LoginForm />
 * </UnauthenticatedOnly>
 */
export function UnauthenticatedOnly({ children }: ConditionalRenderProps) {
  const { isAuthenticated, loading: isLoading } = useAuthContext();

  // Don't render anything while loading or for authenticated users
  if (isLoading || isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

/**
 * RoleBasedRender Component
 *
 * Renders different content based on user role.
 * Provides fine-grained control over role-based rendering.
 *
 * @param adminContent - Content to render for admin users
 * @param userContent - Content to render for regular users
 * @param unauthenticatedContent - Content to render for unauthenticated users
 * @param loadingContent - Optional content to render while loading
 *
 * @example
 * <RoleBasedRender
 *   adminContent={<AdminDashboard />}
 *   userContent={<UserDashboard />}
 *   unauthenticatedContent={<LoginPrompt />}
 * />
 */
export function RoleBasedRender({
  adminContent,
  userContent,
  unauthenticatedContent,
  loadingContent,
}: {
  adminContent?: React.ReactNode;
  userContent?: React.ReactNode;
  unauthenticatedContent?: React.ReactNode;
  loadingContent?: React.ReactNode;
}) {
  const {
    isAuthenticated,
    isAdmin,
    isUser,
    loading: isLoading,
  } = useAuthContext();

  // Show loading content while determining auth state
  if (isLoading) {
    return loadingContent ? (
      loadingContent
    ) : (
      <div className="flex items-center justify-center p-4">
        <div className="h-8 w-8 animate-spin rounded-full border-gray-900 border-b-2" />
      </div>
    );
  }

  // Show content based on authentication state and role
  if (!isAuthenticated) {
    return unauthenticatedContent ? unauthenticatedContent : null;
  }

  if (isAdmin) {
    return adminContent ? adminContent : null;
  }

  if (isUser) {
    return userContent ? userContent : null;
  }

  return null;
}

/**
 * ProtectedRoute Component
 *
 * Higher-order component for protecting entire routes.
 * Combines authentication and role checking with loading states.
 *
 * @param children - Content to render for authorized users
 * @param requireAdmin - Whether admin role is required (default: false)
 * @param fallback - Optional fallback content for unauthorized users
 * @param redirectTo - Optional redirect URL for unauthorized users
 *
 * @example
 * <ProtectedRoute requireAdmin={true}>
 *   <AdminPage />
 * </ProtectedRoute>
 */
export function ProtectedRoute({
  children,
  requireAdmin = false,
  fallback,
  redirectTo,
}: {
  children: React.ReactNode;
  requireAdmin?: boolean;
  fallback?: React.ReactNode;
  redirectTo?: string;
}) {
  if (requireAdmin) {
    return (
      <RequireAdmin fallback={fallback} redirectTo={redirectTo}>
        {children}
      </RequireAdmin>
    );
  }

  return (
    <RequireAuth fallback={fallback} redirectTo={redirectTo}>
      {children}
    </RequireAuth>
  );
}
