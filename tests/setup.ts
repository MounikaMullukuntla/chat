/**
 * Global test setup file for Vitest
 * This file is loaded before all tests via vitest.config.ts
 */

import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll, vi } from "vitest";

// Clean up after each test
afterEach(() => {
  cleanup();
});

// Mock CSS imports
vi.mock("*.css", () => ({}));
vi.mock("*.scss", () => ({}));

// Mock katex to avoid CSS import issues
vi.mock("katex", () => ({
  default: {
    render: vi.fn(),
  },
  renderToString: vi.fn(() => ""),
}));

// Mock katex CSS imports
vi.mock("katex/dist/katex.min.css", () => ({}));

// Mock mermaid to avoid CSS import issues
vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(() => Promise.resolve({ svg: "" })),
  },
}));
// Mock server-only module (allows testing of server components)
vi.mock("server-only", () => ({}));

// Setup global test environment
beforeAll(() => {
  // Load environment variables from .env.test file
  // This ensures test credentials are available
  // NOTE: For real API testing, set GOOGLE_AI_API_KEY in your .env.test file

  // Supabase configuration - use .env.test values or fallback to localhost
  process.env.NEXT_PUBLIC_SUPABASE_URL =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "test-anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY || "test-service-role-key";
  process.env.POSTGRES_URL =
    process.env.POSTGRES_URL ||
    "postgresql://postgres:postgres@localhost:54321/postgres";
  process.env.NEXT_PUBLIC_SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // Google AI API Key for real API testing
  // Set this in .env.test for integration/E2E tests
  if (!process.env.GOOGLE_AI_API_KEY) {
    console.warn(
      "⚠️  GOOGLE_AI_API_KEY not set - Real API tests will be skipped"
    );
  }

  // Log configuration for debugging (without exposing secrets)
  console.log("Test Environment Configuration:");
  console.log(
    `  - Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`
  );
  console.log(
    `  - Has Supabase Anon Key: ${!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
  );
  console.log(
    `  - Has Service Role Key: ${!!process.env.SUPABASE_SERVICE_ROLE_KEY}`
  );
  console.log(`  - Has Google AI Key: ${!!process.env.GOOGLE_AI_API_KEY}`);

  // Mock Next.js router
  vi.mock("next/navigation", () => ({
    useRouter: vi.fn(() => ({
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      pathname: "/",
      query: {},
    })),
    usePathname: vi.fn(() => "/"),
    useSearchParams: vi.fn(() => new URLSearchParams()),
    redirect: vi.fn(),
  }));

  // Mock Next.js headers
  vi.mock("next/headers", () => ({
    headers: vi.fn(() => new Headers()),
    cookies: vi.fn(() => ({
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    })),
  }));

  // Mock window.matchMedia
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock IntersectionObserver
  global.IntersectionObserver = class IntersectionObserver {
    disconnect() {}
    observe() {}
    takeRecords() {
      return [];
    }
    unobserve() {}
  } as any;

  // Mock ResizeObserver
  global.ResizeObserver = class ResizeObserver {
    disconnect() {}
    observe() {}
    unobserve() {}
  } as any;
});
