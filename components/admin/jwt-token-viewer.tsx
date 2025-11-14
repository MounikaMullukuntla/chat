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

"use client";

import { useEffect, useState } from "react";
import { useAuth, useRole } from "@/lib/auth/hooks";
import { createClient } from "@/lib/db/supabase-client";

type JWTClaims = {
  sub: string;
  email: string;
  user_metadata: {
    role: "admin" | "user";
    isActive: boolean;
    settings?: any;
  };
  app_metadata: any;
  aud: string;
  exp: number;
  iat: number;
  iss: string;
  [key: string]: any;
};

export function JWTTokenViewer() {
  const { user, session } = useAuth();
  const { role, isAdmin } = useRole();
  const [tokenClaims, setTokenClaims] = useState<JWTClaims | null>(null);
  const [rawToken, setRawToken] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function getTokenClaims() {
      try {
        const supabase = createClient();

        // Use getSession() only to get the access token for display purposes
        // The actual user authentication is handled by the useAuth hook
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        if (!currentSession?.access_token) {
          setError("No access token found");
          return;
        }

        // Store raw token (first 50 chars for security)
        setRawToken(`${currentSession.access_token.substring(0, 50)}...`);

        // Decode JWT token manually (just for display - don't use for auth decisions)
        try {
          const tokenParts = currentSession.access_token.split(".");
          if (tokenParts.length !== 3) {
            throw new Error("Invalid JWT format");
          }

          // Decode the payload (second part)
          const payload = tokenParts[1];
          const decodedPayload = JSON.parse(
            atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
          );

          setTokenClaims(decodedPayload);
          setError("");
        } catch (decodeError) {
          setError("Failed to decode JWT token");
          console.error("JWT decode error:", decodeError);
        }
      } catch (err) {
        setError("Failed to get session");
        console.error("Session error:", err);
      }
    }

    // Only get token claims if we have an authenticated user from useAuth
    if (session && user) {
      getTokenClaims();
    }
  }, [session, user]);

  if (!session || !user) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
        <p className="text-yellow-800 dark:text-yellow-200">
          No active session found. Please log in to view JWT token claims.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Auth Hook Results */}
      <div className="rounded-lg bg-white p-6 shadow-md dark:bg-gray-800">
        <h3 className="mb-4 font-semibold text-gray-900 text-lg dark:text-white">
          Client-Side Auth State
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block font-medium text-gray-700 text-sm dark:text-gray-300">
              Role (from useAuth)
            </label>
            <p
              className={`rounded px-3 py-2 font-semibold ${
                role === "admin"
                  ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                  : "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
              }`}
            >
              {role?.toUpperCase() || "UNKNOWN"}
            </p>
          </div>
          <div>
            <label className="mb-1 block font-medium text-gray-700 text-sm dark:text-gray-300">
              Is Admin (computed)
            </label>
            <p
              className={`rounded px-3 py-2 font-semibold ${
                isAdmin
                  ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                  : "bg-gray-50 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
              }`}
            >
              {isAdmin ? "TRUE" : "FALSE"}
            </p>
          </div>
          <div>
            <label className="mb-1 block font-medium text-gray-700 text-sm dark:text-gray-300">
              User ID
            </label>
            <p className="rounded bg-gray-50 px-3 py-2 font-mono text-gray-900 text-xs dark:bg-gray-700 dark:text-white">
              {user.id.substring(0, 8)}...
            </p>
          </div>
        </div>
      </div>

      {/* JWT Token Claims */}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-red-800 dark:text-red-200">Error: {error}</p>
        </div>
      ) : tokenClaims ? (
        <div className="rounded-lg bg-white p-6 shadow-md dark:bg-gray-800">
          <h3 className="mb-4 font-semibold text-gray-900 text-lg dark:text-white">
            JWT Token Claims Verification
          </h3>

          {/* Key Claims Summary */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block font-medium text-gray-700 text-sm dark:text-gray-300">
                Role in JWT
              </label>
              <p
                className={`rounded px-3 py-2 font-semibold ${
                  tokenClaims.user_metadata?.role === "admin"
                    ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                    : "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                }`}
              >
                {tokenClaims.user_metadata?.role?.toUpperCase() || "NOT SET"}
              </p>
            </div>
            <div>
              <label className="mb-1 block font-medium text-gray-700 text-sm dark:text-gray-300">
                Token Expires
              </label>
              <p className="rounded bg-gray-50 px-3 py-2 text-gray-900 text-sm dark:bg-gray-700 dark:text-white">
                {new Date(tokenClaims.exp * 1000).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Verification Results */}
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
            <h4 className="mb-3 font-semibold text-blue-900 dark:text-blue-100">
              JWT Token Verification Results
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <span
                  className={
                    tokenClaims.user_metadata?.role === "admin"
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  {tokenClaims.user_metadata?.role === "admin" ? "✅" : "❌"}
                </span>
                <span className="text-blue-800 dark:text-blue-200">
                  Admin role present in user_metadata:{" "}
                  {tokenClaims.user_metadata?.role || "none"}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span
                  className={
                    tokenClaims.sub === user.id
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  {tokenClaims.sub === user.id ? "✅" : "❌"}
                </span>
                <span className="text-blue-800 dark:text-blue-200">
                  Token subject matches user ID
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span
                  className={
                    tokenClaims.email === user.email
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  {tokenClaims.email === user.email ? "✅" : "❌"}
                </span>
                <span className="text-blue-800 dark:text-blue-200">
                  Token email matches user email
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span
                  className={
                    tokenClaims.exp > Date.now() / 1000
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  {tokenClaims.exp > Date.now() / 1000 ? "✅" : "❌"}
                </span>
                <span className="text-blue-800 dark:text-blue-200">
                  Token is not expired
                </span>
              </div>
            </div>
          </div>

          {/* Raw Token Preview */}
          <div className="mb-4">
            <label className="mb-2 block font-medium text-gray-700 text-sm dark:text-gray-300">
              Access Token (truncated for security)
            </label>
            <p className="rounded border bg-gray-50 p-3 font-mono text-gray-600 text-xs dark:bg-gray-700 dark:text-gray-400">
              {rawToken}
            </p>
          </div>

          {/* Full Claims Object */}
          <div>
            <label className="mb-2 block font-medium text-gray-700 text-sm dark:text-gray-300">
              Complete JWT Claims
            </label>
            <pre className="overflow-x-auto rounded-lg bg-gray-50 p-4 text-xs dark:bg-gray-700">
              <code className="text-gray-900 dark:text-white">
                {JSON.stringify(tokenClaims, null, 2)}
              </code>
            </pre>
          </div>
        </div>
      ) : (
        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
          <p className="text-gray-600 dark:text-gray-400">
            Loading JWT token claims...
          </p>
        </div>
      )}
    </div>
  );
}
