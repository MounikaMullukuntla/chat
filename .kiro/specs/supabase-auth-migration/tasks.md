# Implementation Plan: Supabase Authentication Migration

## Task Overview

This implementation plan converts the Supabase Authentication Migration design into discrete, manageable coding tasks. Each task builds incrementally on previous tasks and focuses on implementing Phase 3 (steps 3.1, 3.2, 3.3) from the development plan.

## Implementation Tasks

- [x] 1. Remove NextAuth dependencies and clean up existing auth code






  - Uninstall next-auth package from package.json
  - Remove app/(auth)/auth.ts and app/(auth)/auth.config.ts files
  - Remove all NextAuth imports from components and API routes
  - Remove AUTH_SECRET from environment variables
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
-

- [x] 2. Create Supabase authentication client utilities








  - Create lib/auth/client.ts with Supabase auth wrapper functions
  - Implement signUp, signIn, signOut methods with proper error handling
  - Add getUserRole and isAdmin utility functions
  - Create session management functions (getSession, getUser)
  - _Requirements: 2.1, 2.2, 2.3, 5.1, 5.2_
-

- [x] 3. Create authentication React hooks for client components




  - Create lib/auth/hooks.ts with useAuth hook for authentication state
  - Implement useRole hook for role-based rendering
  - Add useRequireAuth hook for protected components
  - Include loading states and error handling in all hooks
  - _Requirements: 2.1, 2.2, 5.1, 5.2, 7.6_

- [x] 4. Create server-side authentication utilities





  - Create lib/auth/server.ts with server-side auth functions
  - Implement getCurrentUser and getSession for server components
  - Add requireAuth and requireAdmin functions for API routes
  - Create getUserRole and isAdmin functions for server-side role checking
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 5. Update login page to use Supabase Auth





  - Modify app/(auth)/login/page.tsx to use Supabase signIn
  - Replace NextAuth useSession with custom useAuth hook
  - Update form submission to handle Supabase auth responses
  - Add proper error handling and user feedback for login failures
  - _Requirements: 2.1, 2.2, 2.3, 8.1, 8.2, 8.3_
- [x] 6. Update register page to use Supabase Auth


  - Modify app/(auth)/register/page.tsx to use Supabase signUp
  - Add role assignment (default to 'user') during registration
  - Replace NextAuth session handling with Supabase auth
  - Implement proper error handling for registration failures
  - _Requirements: 2.4, 3.1, 8.1, 8.2, 8.3, 8.4_

- [x] 7. Implement logout functionality with Supabase






  - Update components/sign-out-form.tsx to use Supabase signOut
  - Remove NextAuth signOut import and replace with Supabase auth
  - Ensure proper session cleanup and redirect after logout
  - Test logout functionality across different components (Skipped)
  - _Requirements: 2.5, 7.1, 7.2, 7.3_

- [x] 8. Create RBAC middleware for route protection





  - Replace existing middleware.ts with Supabase auth middleware
  - Implement session validation using Supabase getSession
  - Add role extraction from JWT user_metadata
  - Create route protection logic for /admin/* routes
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 9. Configure middleware route patterns and redirects





  - Define public routes (/, /login, /register) that don't require auth
  - Set up protected routes that require authentication
  - Configure admin-only routes (/admin/*) with role checking
  - Implement proper redirect logic for unauthorized access attempts
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 10. Create RBAC guard components for UI protection





  - Create components/auth/rbac-guards.tsx with RequireAuth component
  - Implement RequireAdmin component for admin-only UI sections
  - Add AdminOnly and UserOnly wrapper components
  - Include fallback rendering and redirect options for unauthorized users
  - _Requirements: 3.7, 5.4, 5.5_

- [x] 11. Update sidebar user navigation to use Supabase auth





  - Modify components/sidebar-user-nav.tsx to use useAuth hook
  - Replace NextAuth useSession with Supabase authentication
  - Update user data access to use Supabase user object
  - Test user navigation functionality with new auth system
  - _Requirements: 5.1, 5.2, 7.6_

- [x] 12. Update all API routes to use Supabase session validation





  - Update app/(chat)/api/chat/route.ts to use Supabase auth validation
  - Modify app/(chat)/api/vote/route.ts for Supabase session checking
  - Update app/(chat)/api/history/route.ts with new auth system
  - Replace all NextAuth auth imports with Supabase server auth utilities
  - _Requirements: 5.5, 5.6_

- [x] 13. Update server components to use Supabase authentication





  - Modify app/(chat)/page.tsx to use Supabase getCurrentUser
  - Update app/(chat)/layout.tsx with Supabase auth checking
  - Replace NextAuth auth imports in all server components
  - Test server-side authentication and user data access
  - _Requirements: 5.1, 5.2_
- [x] 14. Update client components with new authentication hooks


  - Modify components/model-selector.tsx to use Supabase session
  - Update components/app-sidebar.tsx with new auth hooks
  - Replace all NextAuth session usage with Supabase equivalents
  - Test client-side authentication state management
  - _Requirements: 5.1, 5.2, 7.6_

- [x] 15. Remove SessionProvider and update app layout





  - Remove NextAuth SessionProvider from app/layout.tsx
  - Create Supabase auth context provider if needed
  - Update root layout to work with Supabase authentication
  - Test application-wide authentication state management
  - _Requirements: 2.1, 7.1, 7.6_

- [x] 16. Create first admin user through Supabase





  - Sign up a new user through the updated registration flow
  - Update user metadata via Supabase Dashboard to set role: 'admin'
  - Verify admin role appears correctly in JWT token claims
  - Test admin user can access protected admin functionality
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 17. Test role-based access control functionality



  - Verify admin users can access /admin routes (when implemented)
  - Test that regular users are redirected from admin routes
  - Confirm RLS policies work correctly with Supabase Auth JWT tokens
  - Validate role checking functions work in both client and server contexts
  - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 6.5, 6.6_

- [x] 18. Implement comprehensive error handling



  - Add error handling for all authentication operations (login, register, logout)
  - Create user-friendly error messages for common auth failures
  - Implement retry logic for network-related authentication errors
  - Add error logging for debugging authentication issues
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [ ] 19. Test session management and persistence
  - Verify user sessions persist across browser refreshes
  - Test session persistence across browser restarts
  - Confirm automatic session refresh works correctly
  - Validate session synchronization across multiple browser tabs
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [ ] 20. Perform end-to-end authentication testing
  - Test complete user registration flow with role assignment
  - Verify login flow works with proper session creation
  - Test logout functionality with complete session cleanup
  - Validate middleware protection works on all route types
  - Confirm admin user creation and role verification process
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10_

## Task Dependencies

### Sequential Dependencies
- Tasks 1-4 can be completed in parallel (foundation setup)
- Tasks 5-7 depend on tasks 2-3 (auth forms need client utilities)
- Tasks 8-9 depend on task 4 (middleware needs server utilities)
- Tasks 10-15 depend on tasks 2-4 (component updates need auth utilities)
- Tasks 16-20 depend on all previous tasks (testing requires complete implementation)

### Critical Path
1. **Foundation** (Tasks 1-4): Remove NextAuth, create Supabase utilities
2. **Authentication Flows** (Tasks 5-7): Update login/register/logout
3. **Route Protection** (Tasks 8-9): Implement middleware security
4. **Component Updates** (Tasks 10-15): Update all auth-dependent components
5. **Admin Setup** (Task 16): Create first admin user
6. **Testing & Validation** (Tasks 17-20): Comprehensive testing

## Testing Strategy

### Unit Testing (Per Task)
- Test authentication utility functions with mock Supabase responses
- Test React hooks with various authentication states
- Test RBAC guard components with different user roles
- Test middleware logic with various route and user scenarios

### Integration Testing (After Task Groups)
- Test complete authentication flows (register → login → logout)
- Test role assignment and verification across client/server
- Test route protection with different user types
- Test session management across browser interactions

### End-to-End Testing (Final Tasks)
- Test complete user journey from registration to admin access
- Test security scenarios (unauthorized access attempts)
- Test error handling and recovery scenarios
- Test performance under various authentication loads

## Success Criteria

### Functional Requirements
- [ ] Users can register, login, and logout using Supabase Auth
- [ ] Admin users can be created and verified
- [ ] Route protection works correctly for admin and user roles
- [ ] Session management persists across browser interactions
- [ ] All existing functionality continues to work with new auth system

### Security Requirements
- [ ] JWT tokens are properly validated server-side
- [ ] Role information cannot be tampered with by clients
- [ ] Admin routes are protected at multiple layers (middleware + components)
- [ ] RLS policies work correctly with Supabase Auth tokens
- [ ] Session security follows best practices (HTTP-only cookies, etc.)

### Performance Requirements
- [ ] Authentication operations complete within reasonable time limits
- [ ] Session validation doesn't significantly impact page load times
- [ ] Middleware processing doesn't create bottlenecks
- [ ] Client-side auth state updates are responsive

This implementation plan provides a clear roadmap for completing Phase 3 of the authentication migration, with each task building incrementally toward a fully functional Supabase Auth system with RBAC capabilities.