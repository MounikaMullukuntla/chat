/**
 * JWT Token Viewer Component
 * 
 * Client-side component to display and verify JWT token claims.
 * Used for testing that admin role appears correctly in JWT token.
 * 
 * Security Note: This component uses getSession() only for displaying
 * the JWT token contents for debugging purposes. All actual authentication
 * decisions are made using the authenticated user from useAuth hook.
 */

'use client'

import { useEffect, useState } from 'react'
import { useAuth, useRole } from '@/lib/auth/hooks'
import { createClient } from '@/lib/db/supabase-client'

interface JWTClaims {
  sub: string
  email: string
  user_metadata: {
    role: 'admin' | 'user'
    isActive: boolean
    settings?: any
  }
  app_metadata: any
  aud: string
  exp: number
  iat: number
  iss: string
  [key: string]: any
}

export function JWTTokenViewer() {
  const { user, session } = useAuth()
  const { role, isAdmin } = useRole()
  const [tokenClaims, setTokenClaims] = useState<JWTClaims | null>(null)
  const [rawToken, setRawToken] = useState<string>('')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    async function getTokenClaims() {
      try {
        const supabase = createClient()
        
        // Use getSession() only to get the access token for display purposes
        // The actual user authentication is handled by the useAuth hook
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        
        if (!currentSession?.access_token) {
          setError('No access token found')
          return
        }

        // Store raw token (first 50 chars for security)
        setRawToken(currentSession.access_token.substring(0, 50) + '...')

        // Decode JWT token manually (just for display - don't use for auth decisions)
        try {
          const tokenParts = currentSession.access_token.split('.')
          if (tokenParts.length !== 3) {
            throw new Error('Invalid JWT format')
          }

          // Decode the payload (second part)
          const payload = tokenParts[1]
          const decodedPayload = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
          
          setTokenClaims(decodedPayload)
          setError('')
        } catch (decodeError) {
          setError('Failed to decode JWT token')
          console.error('JWT decode error:', decodeError)
        }
      } catch (err) {
        setError('Failed to get session')
        console.error('Session error:', err)
      }
    }

    // Only get token claims if we have an authenticated user from useAuth
    if (session && user) {
      getTokenClaims()
    }
  }, [session, user])

  if (!session || !user) {
    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <p className="text-yellow-800 dark:text-yellow-200">
          No active session found. Please log in to view JWT token claims.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Auth Hook Results */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Client-Side Auth State
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Role (from useAuth)
            </label>
            <p className={`px-3 py-2 rounded font-semibold ${
              role === 'admin' 
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' 
                : 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
            }`}>
              {role?.toUpperCase() || 'UNKNOWN'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Is Admin (computed)
            </label>
            <p className={`px-3 py-2 rounded font-semibold ${
              isAdmin 
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' 
                : 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700'
            }`}>
              {isAdmin ? 'TRUE' : 'FALSE'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              User ID
            </label>
            <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded font-mono text-xs">
              {user.id.substring(0, 8)}...
            </p>
          </div>
        </div>
      </div>

      {/* JWT Token Claims */}
      {error ? (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200">
            Error: {error}
          </p>
        </div>
      ) : tokenClaims ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            JWT Token Claims Verification
          </h3>
          
          {/* Key Claims Summary */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Role in JWT
              </label>
              <p className={`px-3 py-2 rounded font-semibold ${
                tokenClaims.user_metadata?.role === 'admin' 
                  ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' 
                  : 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
              }`}>
                {tokenClaims.user_metadata?.role?.toUpperCase() || 'NOT SET'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Token Expires
              </label>
              <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded text-sm">
                {new Date(tokenClaims.exp * 1000).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Verification Results */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
              JWT Token Verification Results
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <span className={tokenClaims.user_metadata?.role === 'admin' ? 'text-green-600' : 'text-red-600'}>
                  {tokenClaims.user_metadata?.role === 'admin' ? '✅' : '❌'}
                </span>
                <span className="text-blue-800 dark:text-blue-200">
                  Admin role present in user_metadata: {tokenClaims.user_metadata?.role || 'none'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={tokenClaims.sub === user.id ? 'text-green-600' : 'text-red-600'}>
                  {tokenClaims.sub === user.id ? '✅' : '❌'}
                </span>
                <span className="text-blue-800 dark:text-blue-200">
                  Token subject matches user ID
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={tokenClaims.email === user.email ? 'text-green-600' : 'text-red-600'}>
                  {tokenClaims.email === user.email ? '✅' : '❌'}
                </span>
                <span className="text-blue-800 dark:text-blue-200">
                  Token email matches user email
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={tokenClaims.exp > Date.now() / 1000 ? 'text-green-600' : 'text-red-600'}>
                  {tokenClaims.exp > Date.now() / 1000 ? '✅' : '❌'}
                </span>
                <span className="text-blue-800 dark:text-blue-200">
                  Token is not expired
                </span>
              </div>
            </div>
          </div>

          {/* Raw Token Preview */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Access Token (truncated for security)
            </label>
            <p className="text-xs font-mono bg-gray-50 dark:bg-gray-700 p-3 rounded border text-gray-600 dark:text-gray-400">
              {rawToken}
            </p>
          </div>

          {/* Full Claims Object */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Complete JWT Claims
            </label>
            <pre className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg overflow-x-auto text-xs">
              <code className="text-gray-900 dark:text-white">
                {JSON.stringify(tokenClaims, null, 2)}
              </code>
            </pre>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-gray-600 dark:text-gray-400">
            Loading JWT token claims...
          </p>
        </div>
      )}
    </div>
  )
}