/**
 * Unit tests for LocalStorageManager
 * Tests API key storage, retrieval, deletion, and settings persistence
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { APIProvider } from "@/lib/storage/types";

// Mock localStorage that properly mimics the browser Storage interface
class LocalStorageMock implements Storage {
  private store: Record<string, string> = {};

  clear() {
    // Clear all keys from both store and the object itself
    Object.keys(this.store).forEach((key) => {
      delete (this as any)[key];
    });
    this.store = {};
  }

  getItem(key: string) {
    return this.store[key] || null;
  }

  setItem(key: string, value: string) {
    this.store[key] = value;
    // Also set as a property on the object itself so Object.keys() works
    (this as any)[key] = value;
  }

  removeItem(key: string) {
    delete this.store[key];
    delete (this as any)[key];
  }

  get length() {
    return Object.keys(this.store).length;
  }

  key(index: number) {
    const keys = Object.keys(this.store);
    return keys[index] || null;
  }
}

// Setup global localStorage mock
const localStorageMock = new LocalStorageMock();
Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// Import after mocking

let localStorageManager: any;

describe("LocalStorageManager", () => {
  beforeEach(async () => {
    // Clear localStorage before each test
    localStorageMock.clear();

    // Clear module cache to get fresh instance
    vi.resetModules();

    // Import fresh module
    const module = await import("@/lib/storage/local-storage-manager");
    localStorageManager = (module as any).localStorageManager;
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe("API Key Storage", () => {
    it("should store an API key for a provider", () => {
      const provider: APIProvider = "google";
      const apiKey = "test-google-api-key-123";

      localStorageManager.setAPIKey(provider, apiKey);

      // Verify the key was stored
      const storedKey = localStorageManager.getAPIKey(provider);
      expect(storedKey).toBe(apiKey);
    });

    it("should store API keys for multiple providers", () => {
      const googleKey = "google-key-123";
      const anthropicKey = "anthropic-key-456";
      const openaiKey = "openai-key-789";

      localStorageManager.setAPIKey("google", googleKey);
      localStorageManager.setAPIKey("anthropic", anthropicKey);
      localStorageManager.setAPIKey("openai", openaiKey);

      expect(localStorageManager.getAPIKey("google")).toBe(googleKey);
      expect(localStorageManager.getAPIKey("anthropic")).toBe(anthropicKey);
      expect(localStorageManager.getAPIKey("openai")).toBe(openaiKey);
    });

    it("should update an existing API key", () => {
      const provider: APIProvider = "google";
      const oldKey = "old-key-123";
      const newKey = "new-key-456";

      localStorageManager.setAPIKey(provider, oldKey);
      expect(localStorageManager.getAPIKey(provider)).toBe(oldKey);

      localStorageManager.setAPIKey(provider, newKey);
      expect(localStorageManager.getAPIKey(provider)).toBe(newKey);
    });

    it("should emit an event when API key is stored", () => {
      const provider: APIProvider = "google";
      const apiKey = "test-key";
      const eventListener = vi.fn();

      localStorageManager.addEventListener(eventListener);
      localStorageManager.setAPIKey(provider, apiKey);

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "api-key-updated",
          provider,
          timestamp: expect.any(Number),
        })
      );

      localStorageManager.removeEventListener(eventListener);
    });

    it("should treat empty string as no API key (security feature)", () => {
      const provider: APIProvider = "google";
      const emptyKey = "";

      localStorageManager.setAPIKey(provider, emptyKey);
      // Empty strings are treated as falsy and return null for security
      expect(localStorageManager.getAPIKey(provider)).toBeNull();
    });
  });

  describe("API Key Retrieval", () => {
    it("should retrieve a stored API key", () => {
      const provider: APIProvider = "anthropic";
      const apiKey = "anthropic-test-key-789";

      localStorageManager.setAPIKey(provider, apiKey);
      const retrieved = localStorageManager.getAPIKey(provider);

      expect(retrieved).toBe(apiKey);
    });

    it("should return null for non-existent API key", () => {
      const provider: APIProvider = "openai";
      const retrieved = localStorageManager.getAPIKey(provider);

      expect(retrieved).toBeNull();
    });

    it("should retrieve correct key for each provider independently", () => {
      localStorageManager.setAPIKey("google", "google-123");
      localStorageManager.setAPIKey("anthropic", "anthropic-456");

      expect(localStorageManager.getAPIKey("google")).toBe("google-123");
      expect(localStorageManager.getAPIKey("anthropic")).toBe("anthropic-456");
      expect(localStorageManager.getAPIKey("openai")).toBeNull();
    });

    it("should retrieve all API keys", () => {
      localStorageManager.setAPIKey("google", "google-key");
      localStorageManager.setAPIKey("anthropic", "anthropic-key");

      const allKeys = localStorageManager.getAllAPIKeys();

      expect(allKeys).toEqual({
        google: "google-key",
        anthropic: "anthropic-key",
      });
    });

    it("should return empty object when no API keys exist", () => {
      const allKeys = localStorageManager.getAllAPIKeys();
      expect(allKeys).toEqual({});
    });

    it("should handle corrupted data gracefully", () => {
      // Directly set corrupted data in localStorage
      localStorageMock.setItem("settings_api-keys", "invalid-json{");

      const retrieved = localStorageManager.getAPIKey("google");
      expect(retrieved).toBeNull();
    });
  });

  describe("API Key Deletion", () => {
    it("should delete an API key for a provider", () => {
      const provider: APIProvider = "google";
      const apiKey = "test-key-to-delete";

      localStorageManager.setAPIKey(provider, apiKey);
      expect(localStorageManager.getAPIKey(provider)).toBe(apiKey);

      localStorageManager.removeAPIKey(provider);
      expect(localStorageManager.getAPIKey(provider)).toBeNull();
    });

    it("should delete only the specified provider key", () => {
      localStorageManager.setAPIKey("google", "google-key");
      localStorageManager.setAPIKey("anthropic", "anthropic-key");
      localStorageManager.setAPIKey("openai", "openai-key");

      localStorageManager.removeAPIKey("google");

      expect(localStorageManager.getAPIKey("google")).toBeNull();
      expect(localStorageManager.getAPIKey("anthropic")).toBe("anthropic-key");
      expect(localStorageManager.getAPIKey("openai")).toBe("openai-key");
    });

    it("should emit an event when API key is removed", () => {
      const provider: APIProvider = "anthropic";
      const eventListener = vi.fn();

      localStorageManager.setAPIKey(provider, "test-key");
      localStorageManager.addEventListener(eventListener);
      localStorageManager.removeAPIKey(provider);

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "api-key-removed",
          provider,
          timestamp: expect.any(Number),
        })
      );

      localStorageManager.removeEventListener(eventListener);
    });

    it("should handle deletion of non-existent API key gracefully", () => {
      const provider: APIProvider = "openai";

      // Should not throw error
      expect(() => {
        localStorageManager.removeAPIKey(provider);
      }).not.toThrow();

      expect(localStorageManager.getAPIKey(provider)).toBeNull();
    });

    it("should preserve other keys when deleting one provider", () => {
      localStorageManager.setAPIKey("google", "google-key");
      localStorageManager.setAPIKey("anthropic", "anthropic-key");

      localStorageManager.removeAPIKey("google");

      const allKeys = localStorageManager.getAllAPIKeys();
      expect(allKeys).toEqual({
        anthropic: "anthropic-key",
      });
    });
  });

  describe("Settings Persistence", () => {
    it("should persist GitHub PAT to storage", () => {
      const token = "github-pat-test-token-123";

      localStorageManager.setGitHubPAT(token);
      const retrieved = localStorageManager.getGitHubPAT();

      expect(retrieved).toBe(token);
    });

    it("should persist GitHub integration data", () => {
      const token = "github-token-456";
      const userData = {
        login: "testuser",
        name: "Test User",
        avatar_url: "https://example.com/avatar.png",
      };

      localStorageManager.setGitHubPAT(token);
      localStorageManager.updateGitHubIntegration({
        user: userData,
        lastVerified: new Date().toISOString(),
      });

      const integration = localStorageManager.getGitHubIntegration();

      expect(integration).toMatchObject({
        token,
        user: userData,
        lastVerified: expect.any(String),
      });
    });

    it("should emit event when GitHub PAT is updated", () => {
      const token = "github-token";
      const eventListener = vi.fn();

      localStorageManager.addEventListener(eventListener);
      localStorageManager.setGitHubPAT(token);

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "github-pat-updated",
          timestamp: expect.any(Number),
        })
      );

      localStorageManager.removeEventListener(eventListener);
    });

    it("should persist data across operations", () => {
      // Set multiple pieces of data
      localStorageManager.setAPIKey("google", "google-key");
      localStorageManager.setAPIKey("anthropic", "anthropic-key");
      localStorageManager.setGitHubPAT("github-token");

      // Verify all data persists
      expect(localStorageManager.getAPIKey("google")).toBe("google-key");
      expect(localStorageManager.getAPIKey("anthropic")).toBe("anthropic-key");
      expect(localStorageManager.getGitHubPAT()).toBe("github-token");
    });

    it("should handle complex nested data structures", () => {
      const token = "github-token";
      const repositories = [
        {
          name: "repo1",
          full_name: "user/repo1",
          private: false,
          permissions: { admin: true, push: true, pull: true },
        },
        {
          name: "repo2",
          full_name: "user/repo2",
          private: true,
          permissions: { admin: false, push: true, pull: true },
        },
      ];

      localStorageManager.setGitHubPAT(token);
      localStorageManager.updateGitHubIntegration({
        repositories,
        scopes: ["repo", "user"],
      });

      const integration = localStorageManager.getGitHubIntegration();

      expect(integration?.repositories).toEqual(repositories);
      expect(integration?.scopes).toEqual(["repo", "user"]);
    });

    it("should clear all data with clearAll()", () => {
      // Set various data
      localStorageManager.setAPIKey("google", "google-key");
      localStorageManager.setAPIKey("anthropic", "anthropic-key");
      localStorageManager.setGitHubPAT("github-token");

      // Verify data exists
      expect(localStorageManager.hasData()).toBe(true);

      // Clear all
      localStorageManager.clearAll();

      // Verify all data is gone
      expect(localStorageManager.getAPIKey("google")).toBeNull();
      expect(localStorageManager.getAPIKey("anthropic")).toBeNull();
      expect(localStorageManager.getGitHubPAT()).toBeNull();
      expect(localStorageManager.hasData()).toBe(false);
    });

    it("should emit event when storage is cleared", () => {
      const eventListener = vi.fn();

      localStorageManager.setAPIKey("google", "test-key");
      localStorageManager.addEventListener(eventListener);
      localStorageManager.clearAll();

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "storage-cleared",
          timestamp: expect.any(Number),
        })
      );

      localStorageManager.removeEventListener(eventListener);
    });
  });

  describe("Settings Retrieval", () => {
    it("should retrieve GitHub PAT from storage", () => {
      const token = "stored-github-token";

      localStorageManager.setGitHubPAT(token);
      const retrieved = localStorageManager.getGitHubPAT();

      expect(retrieved).toBe(token);
    });

    it("should return null for non-existent GitHub PAT", () => {
      const retrieved = localStorageManager.getGitHubPAT();
      expect(retrieved).toBeNull();
    });

    it("should retrieve GitHub integration data", () => {
      const integrationData = {
        token: "github-token",
        user: {
          login: "testuser",
          name: "Test User",
        },
        lastVerified: new Date().toISOString(),
      };

      localStorageManager.setGitHubPAT(integrationData.token);
      localStorageManager.updateGitHubIntegration({
        user: integrationData.user,
        lastVerified: integrationData.lastVerified,
      });

      const retrieved = localStorageManager.getGitHubIntegration();

      expect(retrieved).toMatchObject(integrationData);
    });

    it("should return null for non-existent GitHub integration", () => {
      const retrieved = localStorageManager.getGitHubIntegration();
      expect(retrieved).toBeNull();
    });

    it("should check if storage has any data", () => {
      expect(localStorageManager.hasData()).toBe(false);

      localStorageManager.setAPIKey("google", "test-key");
      expect(localStorageManager.hasData()).toBe(true);

      localStorageManager.removeAPIKey("google");
      expect(localStorageManager.hasData()).toBe(false);

      localStorageManager.setGitHubPAT("token");
      expect(localStorageManager.hasData()).toBe(true);
    });

    it("should retrieve configuration", () => {
      const config = localStorageManager.getConfig();

      expect(config).toMatchObject({
        useSessionStorage: expect.any(Boolean),
        autoCleanupOnLogout: expect.any(Boolean),
        maxStorageSize: expect.any(Number),
        enableEncryption: expect.any(Boolean),
      });
    });

    it("should update and retrieve configuration", () => {
      const newConfig = {
        useSessionStorage: true,
        maxStorageSize: 10 * 1024 * 1024, // 10MB
      };

      localStorageManager.configure(newConfig);
      const config = localStorageManager.getConfig();

      expect(config.useSessionStorage).toBe(true);
      expect(config.maxStorageSize).toBe(10 * 1024 * 1024);
    });
  });

  describe("Storage Health and Quota", () => {
    it("should check storage health", () => {
      const health = localStorageManager.checkStorageHealth();

      expect(health).toHaveProperty("healthy");
      expect(health).toHaveProperty("errors");
      expect(Array.isArray(health.errors)).toBe(true);
    });

    it("should return healthy status for empty storage", () => {
      const health = localStorageManager.checkStorageHealth();

      expect(health.healthy).toBe(true);
      expect(health.errors.length).toBe(0);
    });

    it("should get storage quota information", () => {
      const quota = localStorageManager.getStorageQuota();

      if (quota) {
        expect(quota).toHaveProperty("used");
        expect(quota).toHaveProperty("available");
        expect(quota).toHaveProperty("total");
        expect(quota).toHaveProperty("percentage");
        expect(quota.used).toBeGreaterThanOrEqual(0);
        expect(quota.available).toBeGreaterThanOrEqual(0);
        expect(quota.total).toBeGreaterThan(0);
        expect(quota.percentage).toBeGreaterThanOrEqual(0);
        expect(quota.percentage).toBeLessThanOrEqual(100);
      }
    });
  });

  describe("Event Listeners", () => {
    it("should add and trigger event listeners", () => {
      const listener = vi.fn();

      localStorageManager.addEventListener(listener);
      localStorageManager.setAPIKey("google", "test-key");

      expect(listener).toHaveBeenCalled();

      localStorageManager.removeEventListener(listener);
    });

    it("should remove event listeners", () => {
      const listener = vi.fn();

      localStorageManager.addEventListener(listener);
      localStorageManager.removeEventListener(listener);
      localStorageManager.setAPIKey("google", "test-key");

      expect(listener).not.toHaveBeenCalled();
    });

    it("should support multiple event listeners", () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      localStorageManager.addEventListener(listener1);
      localStorageManager.addEventListener(listener2);
      localStorageManager.setAPIKey("google", "test-key");

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();

      localStorageManager.removeEventListener(listener1);
      localStorageManager.removeEventListener(listener2);
    });
  });

  describe("GitHub PAT Operations", () => {
    it("should remove GitHub PAT", () => {
      const token = "github-token-to-remove";

      localStorageManager.setGitHubPAT(token);
      expect(localStorageManager.getGitHubPAT()).toBe(token);

      localStorageManager.removeGitHubPAT();
      expect(localStorageManager.getGitHubPAT()).toBeNull();
    });

    it("should emit event when GitHub PAT is removed", () => {
      const eventListener = vi.fn();

      localStorageManager.setGitHubPAT("token");
      localStorageManager.addEventListener(eventListener);
      localStorageManager.removeGitHubPAT();

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "github-pat-removed",
          timestamp: expect.any(Number),
        })
      );

      localStorageManager.removeEventListener(eventListener);
    });

    it("should handle removal of non-existent GitHub PAT gracefully", () => {
      expect(() => {
        localStorageManager.removeGitHubPAT();
      }).not.toThrow();
    });
  });

  describe("Edge Cases", () => {
    it("should handle storage with special characters in keys", () => {
      const specialKey = "key-with-special-chars-!@#$%^&*()";
      localStorageManager.setAPIKey("google", specialKey);

      expect(localStorageManager.getAPIKey("google")).toBe(specialKey);
    });

    it("should handle very long API keys", () => {
      const longKey = "a".repeat(1000);
      localStorageManager.setAPIKey("google", longKey);

      expect(localStorageManager.getAPIKey("google")).toBe(longKey);
    });

    it("should handle unicode characters in data", () => {
      const unicodeData = "🔑 API Key with emoji 中文 العربية";
      localStorageManager.setAPIKey("google", unicodeData);

      expect(localStorageManager.getAPIKey("google")).toBe(unicodeData);
    });

    it("should maintain data integrity across multiple operations", () => {
      // Perform multiple operations
      localStorageManager.setAPIKey("google", "google-1");
      localStorageManager.setAPIKey("anthropic", "anthropic-1");
      localStorageManager.setGitHubPAT("github-1");

      localStorageManager.setAPIKey("google", "google-2");
      localStorageManager.removeAPIKey("anthropic");
      localStorageManager.setGitHubPAT("github-2");

      localStorageManager.setAPIKey("openai", "openai-1");

      // Verify final state
      expect(localStorageManager.getAPIKey("google")).toBe("google-2");
      expect(localStorageManager.getAPIKey("anthropic")).toBeNull();
      expect(localStorageManager.getAPIKey("openai")).toBe("openai-1");
      expect(localStorageManager.getGitHubPAT()).toBe("github-2");
    });
  });
});
