/**
 * Mock Supabase client for testing
 */

import { vi } from "vitest";

export const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
    getSession: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(),
    admin: {
      createUser: vi.fn(),
      deleteUser: vi.fn(),
    },
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
  })),
  rpc: vi.fn(),
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(),
      download: vi.fn(),
      remove: vi.fn(),
      list: vi.fn(),
    })),
  },
};

export const createMockSupabaseClient = () => mockSupabaseClient;
