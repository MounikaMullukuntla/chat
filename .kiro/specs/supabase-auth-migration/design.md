# Design Document: Supabase Authentication Migration

## Overview

This design document outlines the migration from NextAuth.js to Supabase Auth, implementing a comprehensive Role-Based Access Control (RBAC) system. The migration will replace the existing authentication infrastructure while maintaining security and adding proper admin/user role separation.

The design focuses on three main areas:
1. **Authentication Flow Replacement** - Migrating from NextAuth to Supabase Auth
2. **RBAC Implementation** - Adding role-based access control with admin/user roles
3. **Security Enhancement** - Implementing server-side route protection and RLS integration

## Architecture

### Current Architecture (NextAuth.js)
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client App    │───▶│   NextAuth.js    │───▶│  Vercel Postgres │
│                 │    │                  │    │   (User table)   │
│ - Login/Register│    │ - JWT Tokens     │    │                 │
│ - Session Mgmt  │    │ - Session Store  │    │ - User records  │
│ - Guest Mode    │    │ - Credentials    │    │ - Passwords     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### New Architecture (Supabase Auth)
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client App    │───▶│   Supabase Auth  │───▶│  Supabase DB    │
│                 │    │                  │    │                 │
│ - Login/Register│    │ - JWT Tokens     │    │ - auth.users    │
│ - Session Mgmt  │    │ - Session Store  │    │ - RLS Policies  │
│ - RBAC Guards   │    │ - User Metadata  │    │ - App Tables    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   Middleware     │
                       │                  │
                       │ - Route Protection│
                       │ - Role Validation│
                       │ - Session Check  │
                       └──────────────────┘
```

## Components and Interfaces

### 1. Authentication Client Layer

#### Supabase Auth Client (`lib/auth/client.ts`)
```typescript
interface AuthClient {
  // Authentication methods
  signUp(email: string, password: string, metadata?: UserMetadata): Promise<AuthResponse>
  signIn(email: string, password: string): Promise<AuthResponse>
  signOut(): Promise<void>
  
  // Session management
  getSession(): Promise<Session | null>
  getUser(): Promise<User | null>
  
  // Role management
  getUserRole(): Promise<'admin' | 'user'>
  isAdmin(): Promise<boolean>
  
  // Event listeners
  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void): void
}

interface UserMetadata {
  role: 'admin' | 'user'
  isActive: boolean
  settings?: {
    theme?: string
    defaultModel?: string
    notifications?: boolean
  }
}
```

#### Authentication Hooks (`lib/auth/hooks.ts`)
```typescript
// Client-side hooks for React components
export function useAuth(): {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export function useRole(): {
  role: 'admin' | 'user' | null
  isAdmin: boolean
  loading: boolean
}

export function useRequireAuth(): {
  user: User
  session: Session
  role: 'admin' | 'user'
}
```

### 2. Server-Side Authentication Layer

#### Server Auth Utilities (`lib/auth/server.ts`)
```typescript
interface ServerAuth {
  // Server-side authentication
  getCurrentUser(): Promise<User | null>
  getSession(): Promise<Session | null>
  requireAuth(): Promise<{ user: User; session: Session }>
  requireAdmin(): Promise<{ user: User; session: Session; role: 'admin' }>
  
  // Role checking
  getUserRole(user?: User): Promise<'admin' | 'user'>
  isAdmin(user?: User): Promise<boolean>
  
  // Session validation
  validateSession(request: Request): Promise<Session | null>
}
```

### 3. Middleware Protection Layer

#### Route Protection Middleware (`middleware.ts`)
```typescript
interface MiddlewareConfig {
  // Route patterns
  publicRoutes: string[]
  protectedRoutes: string[]
  adminRoutes: string[]
  
  // Redirect URLs
  loginUrl: string
  homeUrl: string
  unauthorizedUrl: string
}

interface MiddlewareResponse {
  // Response types
  allow(): NextResponse
  redirect(url: string): NextResponse
  unauthorized(): NextResponse
}
```

### 4. RBAC Guard Components

#### Client-Side Guards (`components/auth/rbac-guards.tsx`)
```typescript
interface RBACGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  redirectTo?: string
}

// Component guards
export function RequireAuth({ children, fallback, redirectTo }: RBACGuardProps): JSX.Element
export function RequireAdmin({ children, fallback, redirectTo }: RBACGuardProps): JSX.Element
export function AdminOnly({ children }: { children: React.ReactNode }): JSX.Element | null
export function UserOnly({ children }: { children: React.ReactNode }): JSX.Element | null
```

### 5. Authentication Forms

#### Login/Register Components (`components/auth/`)
```typescript
interface AuthFormProps {
  mode: 'login' | 'register'
  onSuccess?: (user: User) => void
  onError?: (error: Error) => void
  redirectTo?: string
}

interface AuthFormState {
  email: string
  password: string
  confirmPassword?: string
  loading: boolean
  error: string | null
}
```

## Data Models

### User Metadata Structure
```typescript
interface SupabaseUserMetadata {
  role: 'admin' | 'user'
  isActive: boolean
  settings: {
    theme: 'light' | 'dark' | 'system'
    defaultModel: string
    notifications: boolean
  }
  createdAt: string
  lastLoginAt?: string
}
```

### Session Structure
```typescript
interface SupabaseSession {
  access_token: string
  refresh_token: string
  expires_in: number
  expires_at: number
  token_type: 'bearer'
  user: {
    id: string
    email: string
    user_metadata: SupabaseUserMetadata
    app_metadata: {
      provider: string
      providers: string[]
    }
  }
}
```

### JWT Token Claims
```typescript
interface JWTClaims {
  sub: string // user ID
  email: string
  user_metadata: {
    role: 'admin' | 'user'
    isActive: boolean
    settings: object
  }
  app_metadata: object
  aud: string
  exp: number
  iat: number
  iss: string
}
```

## Error Handling

### Error Types and Handling Strategy

#### Authentication Errors
```typescript
enum AuthErrorType {
  INVALID_CREDENTIALS = 'invalid_credentials',
  USER_NOT_FOUND = 'user_not_found',
  EMAIL_ALREADY_EXISTS = 'email_already_exists',
  WEAK_PASSWORD = 'weak_password',
  SESSION_EXPIRED = 'session_expired',
  UNAUTHORIZED = 'unauthorized',
  FORBIDDEN = 'forbidden',
  NETWORK_ERROR = 'network_error',
  UNKNOWN_ERROR = 'unknown_error'
}

interface AuthError {
  type: AuthErrorType
  message: string
  details?: any
}
```

#### Error Handling Patterns
1. **Client-Side Errors**: Display user-friendly messages with retry options
2. **Server-Side Errors**: Log errors and return appropriate HTTP status codes
3. **Middleware Errors**: Graceful fallback with proper redirects
4. **Network Errors**: Retry logic with exponential backoff

## Testing Strategy

### Unit Testing
- **Authentication utilities**: Test all auth helper functions
- **RBAC guards**: Test role-based component rendering
- **Middleware logic**: Test route protection scenarios
- **Error handling**: Test all error scenarios

### Integration Testing
- **Authentication flows**: End-to-end login/register/logout
- **Role assignment**: Test admin user creation and role persistence
- **Route protection**: Test middleware protection on all route types
- **Session management**: Test session persistence and refresh

### Security Testing
- **JWT validation**: Test token tampering detection
- **Role escalation**: Test that users cannot fake admin role
- **Session security**: Test session hijacking prevention
- **RLS integration**: Test database-level access controls

## Implementation Plan

### Phase 1: Remove NextAuth Dependencies
1. **Uninstall NextAuth package**
   ```bash
   npm uninstall next-auth
   ```

2. **Remove NextAuth files**
   - Delete `app/(auth)/auth.ts`
   - Delete `app/(auth)/auth.config.ts`
   - Remove NextAuth imports from all files

3. **Update package.json scripts**
   - Remove any NextAuth-related build steps

### Phase 2: Implement Supabase Auth Client
1. **Create auth client utilities** (`lib/auth/client.ts`)
   - Implement Supabase client wrapper
   - Add authentication methods
   - Add role management functions

2. **Create auth hooks** (`lib/auth/hooks.ts`)
   - Implement `useAuth()` hook
   - Implement `useRole()` hook
   - Implement `useRequireAuth()` hook

3. **Create server auth utilities** (`lib/auth/server.ts`)
   - Implement server-side auth functions
   - Add session validation
   - Add role checking functions

### Phase 3: Update Authentication Forms
1. **Update login page** (`app/(auth)/login/page.tsx`)
   - Replace NextAuth signIn with Supabase signIn
   - Update form handling and validation
   - Add proper error handling

2. **Update register page** (`app/(auth)/register/page.tsx`)
   - Replace NextAuth registration with Supabase signUp
   - Add role assignment during registration
   - Update form handling and validation

3. **Create logout functionality**
   - Replace NextAuth signOut with Supabase signOut
   - Update sign-out form component
   - Clear session and redirect properly

### Phase 4: Implement RBAC Middleware
1. **Create new middleware** (`middleware.ts`)
   - Replace NextAuth getToken with Supabase getSession
   - Add role-based route protection
   - Implement proper redirects for unauthorized access

2. **Configure route protection**
   - Define public, protected, and admin routes
   - Set up proper redirect URLs
   - Test all route protection scenarios

### Phase 5: Update Application Components
1. **Update session usage**
   - Replace `useSession` with Supabase auth hooks
   - Update server components to use Supabase auth
   - Update API routes to use Supabase session validation

2. **Create RBAC guard components**
   - Implement `RequireAuth` component
   - Implement `RequireAdmin` component
   - Implement `AdminOnly` and `UserOnly` components

3. **Update navigation and UI**
   - Update sidebar user navigation
   - Add admin indicators for admin users
   - Update any auth-dependent UI components

### Phase 6: Admin User Creation and Testing
1. **Create first admin user**
   - Sign up through normal registration flow
   - Update user metadata via Supabase Dashboard or API
   - Verify admin role appears in JWT token

2. **Test authentication flows**
   - Test user registration and login
   - Test admin role assignment and verification
   - Test route protection for admin and user roles
   - Test session persistence and refresh

3. **Verify RLS integration**
   - Test that RLS policies work with Supabase Auth
   - Verify admin users can access admin-only data
   - Verify regular users are restricted appropriately

## Security Considerations

### Authentication Security
- **Password Security**: Managed entirely by Supabase (no local password handling)
- **JWT Security**: Tokens signed by Supabase, validated server-side
- **Session Security**: HTTP-only cookies, secure transmission
- **Role Security**: Roles stored in JWT claims, not client-side storage

### Authorization Security
- **Server-Side Validation**: All role checks performed server-side
- **Middleware Protection**: Routes protected at middleware level
- **RLS Integration**: Database-level access control via RLS policies
- **Admin Protection**: Multi-layer admin route protection

### Data Security
- **User Data**: Stored in Supabase auth.users (encrypted)
- **Session Data**: Managed by Supabase (secure storage)
- **Role Data**: Stored in JWT user_metadata (tamper-proof)
- **API Security**: All API routes validate Supabase sessions

## Migration Checklist

### Pre-Migration
- [ ] Backup current user data (if any)
- [ ] Document current authentication flows
- [ ] Set up Supabase project and configure auth
- [ ] Test Supabase auth in development environment

### During Migration
- [ ] Remove NextAuth dependencies and files
- [ ] Implement Supabase auth client and utilities
- [ ] Update all authentication forms and flows
- [ ] Implement RBAC middleware and guards
- [ ] Update all components using authentication
- [ ] Create first admin user and test access

### Post-Migration
- [ ] Verify all authentication flows work correctly
- [ ] Test role-based access control thoroughly
- [ ] Verify session management and persistence
- [ ] Test error handling and edge cases
- [ ] Update documentation and deployment guides
- [ ] Monitor for any authentication issues in production

## Performance Considerations

### Client-Side Performance
- **Lazy Loading**: Auth components loaded only when needed
- **Caching**: User session cached in memory for quick access
- **Optimistic Updates**: UI updates optimistically during auth operations

### Server-Side Performance
- **Session Caching**: Sessions cached to reduce Supabase API calls
- **Middleware Efficiency**: Minimal processing in middleware for performance
- **Database Optimization**: Efficient queries for user and role data

### Network Performance
- **Token Refresh**: Automatic token refresh to minimize auth API calls
- **Request Batching**: Batch auth-related requests where possible
- **CDN Integration**: Static auth assets served via CDN

This design provides a comprehensive foundation for migrating from NextAuth.js to Supabase Auth while implementing robust RBAC functionality. The architecture ensures security, performance, and maintainability while providing a smooth user experience.