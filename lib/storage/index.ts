/**
 * Storage utilities for API keys and integrations
 * 
 * This module provides client-side storage for API keys and integration tokens.
 * Data is stored as plain text in localStorage for MVP simplicity.
 */

// Export types
export type {
  LocalStorageSchema,
  APIKeyState,
  GitHubState,
  VerificationResult,
  GitHubVerificationResult,
  APIProvider,
  StorageManager,
  StorageEvent
} from './types';

// Export main storage manager
export { localStorageManager } from './local-storage-manager';

// Export helper functions
export { 
  apiKeyHelpers,
  githubHelpers,
  storageHelpers,
  storage
} from './helpers';

// Re-export for convenience
export { localStorageManager as storageManager } from './local-storage-manager';