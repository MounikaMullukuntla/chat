# Requirements Document: Supabase Authentication Migration

## Introduction

This feature migrates the existing NextAuth.js authentication system to Supabase Auth, implementing Role-Based Access Control (RBAC) with admin and user roles. The migration will replace the current custom authentication flow with Supabase's managed authentication service while maintaining security and adding proper role-based access controls.

## Requirements

### Requirement 1: Remove NextAuth Dependencies

**User Story:** As a developer, I want to remove NextAuth.js dependencies so that the application uses Supabase Auth as the single authentication provider.

#### Acceptance Criteria

1. WHEN the migration is complete THEN the `next-auth` package SHALL be uninstalled from the project
2. WHEN the migration is complete THEN the `app/(auth)/auth.ts` file SHALL be removed
3. WHEN the migration is complete THEN the `app/(auth)/auth.config.ts` file SHALL be removed
4. WHEN the migration is complete THEN all NextAuth imports and references SHALL be removed from the codebase
5. WHEN the migration is complete THEN the application SHALL build successfully without NextAuth dependencies

### Requirement 2: Implement Supabase Authentication Flows

**User Story:** As a user, I want to authenticate using Supabase Auth so that I can securely access the application with proper session management.

#### Acceptance Criteria

1. WHEN a user visits the login page THEN they SHALL see a Supabase Auth login form
2. WHEN a user enters valid credentials THEN they SHALL be authenticated and redirected to the main application
3. WHEN a user enters invalid credentials THEN they SHALL see an appropriate error message
4. WHEN a new user registers THEN their account SHALL be created in Supabase Auth with default user role
5. WHEN a user logs out THEN their session SHALL be terminated and they SHALL be redirected to the login page
6. WHEN a user's session expires THEN they SHALL be automatically redirected to the login page
7. WHEN the migration is complete THEN guest user functionality SHALL be removed (no longer needed)

### Requirement 3: Implement Role-Based Access Control (RBAC)

**User Story:** As an administrator, I want role-based access control so that only admin users can access administrative features while regular users are restricted to standard functionality.

#### Acceptance Criteria

1. WHEN a user registers THEN their role SHALL default to 'user' in the user_metadata
2. WHEN an admin user is created THEN their role SHALL be set to 'admin' in the user_metadata
3. WHEN a user accesses any route THEN the middleware SHALL check their authentication status
4. WHEN an unauthenticated user accesses a protected route THEN they SHALL be redirected to the login page
5. WHEN a non-admin user attempts to access `/admin/*` routes THEN they SHALL be redirected to the home page
6. WHEN an admin user accesses `/admin/*` routes THEN they SHALL be granted access
7. WHEN the user's role is checked THEN it SHALL be extracted from the JWT token user_metadata
8. WHEN RLS policies are applied THEN they SHALL correctly identify user roles from the JWT token

### Requirement 4: Create Middleware Protection

**User Story:** As a system administrator, I want server-side route protection so that unauthorized access attempts are blocked at the middleware level before reaching page components.

#### Acceptance Criteria

1. WHEN middleware is implemented THEN it SHALL run on all protected routes
2. WHEN middleware checks authentication THEN it SHALL use Supabase's `getSession()` method
3. WHEN middleware detects an unauthenticated user on protected routes THEN it SHALL redirect to `/login`
4. WHEN middleware detects a non-admin user on admin routes THEN it SHALL redirect to `/`
5. WHEN middleware processes a request THEN it SHALL properly handle Supabase cookies for SSR
6. WHEN middleware runs THEN it SHALL not interfere with public routes like `/login`, `/register`, and `/`

### Requirement 5: Update Authentication Checks

**User Story:** As a developer, I want all existing authentication checks updated so that they work seamlessly with Supabase Auth instead of NextAuth.

#### Acceptance Criteria

1. WHEN server components check authentication THEN they SHALL use `getCurrentUser()` from Supabase client
2. WHEN client components check authentication THEN they SHALL use Supabase's `useUser()` hook
3. WHEN role checks are performed THEN they SHALL use the `getUserRole()` utility function
4. WHEN admin-only UI components are rendered THEN they SHALL use proper RBAC guards
5. WHEN API routes require authentication THEN they SHALL validate Supabase sessions
6. WHEN database queries are executed THEN they SHALL properly work with Supabase RLS policies

### Requirement 6: Admin User Creation

**User Story:** As a system administrator, I want to create the first admin user so that administrative functions can be accessed and managed.

#### Acceptance Criteria

1. WHEN the first admin user is created THEN they SHALL be able to sign up through the normal registration flow
2. WHEN an admin user is created THEN their `user_metadata` SHALL contain `{"role": "admin", "isActive": true}`
3. WHEN an admin user's JWT token is generated THEN it SHALL include the admin role in the claims
4. WHEN an admin user accesses admin routes THEN they SHALL be granted access
5. WHEN RLS policies are tested with admin user THEN they SHALL correctly allow access to admin-only data
6. WHEN the admin user is verified THEN they SHALL be able to access the `/admin` dashboard

### Requirement 7: Session Management

**User Story:** As a user, I want proper session management so that my authentication state persists across browser sessions and is securely handled.

#### Acceptance Criteria

1. WHEN a user logs in THEN their session SHALL be stored securely in HTTP-only cookies
2. WHEN a user refreshes the page THEN their authentication state SHALL persist
3. WHEN a user closes and reopens the browser THEN their session SHALL remain valid (if not expired)
4. WHEN a session expires THEN the user SHALL be automatically logged out
5. WHEN session refresh is needed THEN it SHALL happen automatically in the background
6. WHEN multiple tabs are open THEN authentication state SHALL be synchronized across tabs

### Requirement 8: Error Handling

**User Story:** As a user, I want clear error messages and proper error handling so that I understand what went wrong and how to resolve authentication issues.

#### Acceptance Criteria

1. WHEN authentication fails THEN the user SHALL see a clear, user-friendly error message
2. WHEN network errors occur during auth THEN the user SHALL see appropriate retry options
3. WHEN session validation fails THEN the error SHALL be logged and user redirected appropriately
4. WHEN middleware encounters errors THEN they SHALL be handled gracefully without breaking the application
5. WHEN Supabase service is unavailable THEN the user SHALL see a meaningful error message
6. WHEN rate limiting occurs THEN the user SHALL be informed about the temporary restriction

### Requirement 9: Security Compliance

**User Story:** As a security-conscious organization, I want the authentication system to follow security best practices so that user data and access controls are properly protected.

#### Acceptance Criteria

1. WHEN passwords are handled THEN they SHALL be managed entirely by Supabase (no local storage)
2. WHEN JWT tokens are used THEN they SHALL be properly validated and not tampered with
3. WHEN role information is accessed THEN it SHALL come from the secure JWT token, not client-side storage
4. WHEN admin routes are protected THEN the protection SHALL be enforced server-side
5. WHEN user sessions are managed THEN they SHALL use secure, HTTP-only cookies
6. WHEN authentication state changes THEN it SHALL be properly synchronized between client and server

### Requirement 10: Testing and Verification

**User Story:** As a developer, I want comprehensive testing of the authentication system so that all functionality works correctly and securely.

#### Acceptance Criteria

1. WHEN testing is performed THEN user registration SHALL work correctly
2. WHEN testing is performed THEN user login SHALL work correctly
3. WHEN testing is performed THEN user logout SHALL work correctly
4. WHEN testing is performed THEN admin role assignment SHALL work correctly
5. WHEN testing is performed THEN admin route protection SHALL work correctly
6. WHEN testing is performed THEN non-admin users SHALL be properly restricted
7. WHEN testing is performed THEN RLS policies SHALL correctly enforce data access controls
8. WHEN testing is performed THEN session persistence SHALL work across browser restarts
9. WHEN testing is performed THEN middleware protection SHALL work on all protected routes
10. WHEN testing is performed THEN error scenarios SHALL be handled gracefully