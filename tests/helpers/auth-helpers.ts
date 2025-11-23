/**
 * Authentication helpers for E2E testing with Playwright
 * Provides utilities for setting up authenticated sessions
 */

import type { Page } from "@playwright/test";
import { createTestSupabaseClient } from "./db-helpers";

/**
 * Create a test user with specified role
 */
export async function createTestUserWithRole(
  email: string,
  password: string,
  role: "admin" | "user" = "user"
) {
  const supabase = createTestSupabaseClient();

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role,
      isActive: true,
    },
  });

  if (error) {
    throw error;
  }
  return data.user;
}

/**
 * Login as a user and set up authentication state in Playwright
 */
export async function loginAsUser(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  const supabase = createTestSupabaseClient();

  // Sign in the user
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }
  if (!data.session) {
    throw new Error("No session created");
  }

  // Set up authentication cookies/state in the browser
  // Supabase uses cookies for session management
  await page.goto("/");

  // Set the session in localStorage (Supabase client-side auth)
  await page.evaluate((session) => {
    // Supabase stores session in localStorage
    localStorage.setItem(
      `sb-${window.location.hostname.split(".")[0]}-auth-token`,
      JSON.stringify(session)
    );
  }, data.session);

  // Also set cookies if needed
  const cookies = [
    {
      name: "sb-access-token",
      value: data.session.access_token,
      domain: new URL(page.url()).hostname,
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax" as const,
    },
    {
      name: "sb-refresh-token",
      value: data.session.refresh_token,
      domain: new URL(page.url()).hostname,
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax" as const,
    },
  ];

  await page.context().addCookies(cookies);

  // Reload page to apply authentication
  await page.reload();
}

/**
 * Logout the current user
 */
export async function logout(page: Page): Promise<void> {
  await page.evaluate(() => {
    // Clear Supabase session from localStorage
    Object.keys(localStorage).forEach((key) => {
      if (key.includes("sb-") && key.includes("-auth-token")) {
        localStorage.removeItem(key);
      }
    });
  });

  // Clear cookies
  await page.context().clearCookies();

  // Reload page
  await page.reload();
}

/**
 * Delete a test user by ID
 */
export async function deleteTestUserById(userId: string): Promise<void> {
  const supabase = createTestSupabaseClient();
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) {
    throw error;
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    // Check if Supabase session exists in localStorage
    const keys = Object.keys(localStorage);
    return keys.some(
      (key) => key.includes("sb-") && key.includes("-auth-token")
    );
  });
}
