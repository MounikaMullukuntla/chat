/**
 * Storage utilities for API keys and integrations
 *
 * This module provides client-side storage for API keys and integration tokens.
 * Data is stored as plain text in localStorage for MVP simplicity.
 */

// Export helper functions
export {
  apiKeyHelpers,
  githubHelpers,
  storage,
  storageHelpers,
} from "./helpers";
// Export main storage manager
// Re-export for convenience
export {
  localStorageManager,
  localStorageManager as storageManager,
} from "./local-storage-manager";
// Export types
export type {
  APIKeyState,
  APIProvider,
  GitHubState,
  GitHubVerificationResult,
  LocalStorageSchema,
  StorageEvent,
  StorageManager,
  VerificationResult,
} from "./types";
