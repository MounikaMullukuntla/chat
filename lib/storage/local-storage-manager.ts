/**
 * LocalStorageManager - Secure storage utility for API keys and integrations
 */

import type { 
  StorageManager, 
  APIProvider, 
  LocalStorageSchema,
  StorageEvent,
  StorageConfig,
  StorageQuotaInfo,
  StorageError
} from './types';
import { StorageErrorType } from './types';

class LocalStorageManager implements StorageManager {
  private static instance: LocalStorageManager;
  private readonly storagePrefix = 'settings_';
  private eventListeners: ((event: StorageEvent) => void)[] = [];
  private config: StorageConfig = {
    useSessionStorage: false,
    autoCleanupOnLogout: true,
    maxStorageSize: 5 * 1024 * 1024, // 5MB default
    enableEncryption: false
  };
  private cleanupListeners: (() => void)[] = [];

  private constructor() {
    this.setupAutoCleanup();
  }

  static getInstance(): LocalStorageManager {
    if (!LocalStorageManager.instance) {
      LocalStorageManager.instance = new LocalStorageManager();
    }
    return LocalStorageManager.instance;
  }

  /**
   * Get the appropriate storage object based on configuration
   */
  private getStorage(): Storage | null {
    try {
      const storage = this.config.useSessionStorage ? sessionStorage : localStorage;
      const test = '__storage_test__';
      storage.setItem(test, test);
      storage.removeItem(test);
      return storage;
    } catch {
      return null;
    }
  }

  /**
   * Check if storage is available
   */
  private isStorageAvailable(): boolean {
    return this.getStorage() !== null;
  }

  /**
   * Get storage key with prefix
   */
  private getStorageKey(key: keyof LocalStorageSchema): string {
    return `${this.storagePrefix}${key}`;
  }

  /**
   * Safely get data from storage
   */
  private getStorageData<T>(key: keyof LocalStorageSchema): T | null {
    const storage = this.getStorage();
    if (!storage) {
      this.emitStorageError(StorageErrorType.STORAGE_UNAVAILABLE, 'Storage is not available');
      return null;
    }

    try {
      const storageKey = this.getStorageKey(key);
      const data = storage.getItem(storageKey);
      
      if (!data) {
        return null;
      }

      const parsed = JSON.parse(data) as T;
      return parsed;
    } catch (error) {
      console.error(`Failed to get storage data for key ${key}:`, error);
      this.emitStorageError(StorageErrorType.DATA_CORRUPTION, `Failed to parse data for key ${key}`);
      return null;
    }
  }

  /**
   * Safely set data to storage
   */
  private setStorageData<T>(key: keyof LocalStorageSchema, data: T): void {
    const storage = this.getStorage();
    if (!storage) {
      this.emitStorageError(StorageErrorType.STORAGE_UNAVAILABLE, 'Storage is not available');
      return;
    }

    try {
      const storageKey = this.getStorageKey(key);
      const jsonData = JSON.stringify(data);
      
      // Check storage quota before setting
      const quotaInfo = this.getStorageQuota();
      if (quotaInfo && jsonData.length > quotaInfo.available) {
        this.emitStorageError(StorageErrorType.QUOTA_EXCEEDED, 'Storage quota exceeded');
        return;
      }
      
      storage.setItem(storageKey, jsonData);
    } catch (error) {
      console.error(`Failed to set storage data for key ${key}:`, error);
      
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        this.emitStorageError(StorageErrorType.QUOTA_EXCEEDED, 'Storage quota exceeded');
      } else {
        this.emitStorageError(StorageErrorType.UNKNOWN_ERROR, `Failed to set data for key ${key}`);
      }
    }
  }

  /**
   * Emit storage event to listeners
   */
  private emitEvent(event: StorageEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Storage event listener error:', error);
      }
    });
  }

  /**
   * Emit storage error event
   */
  private emitStorageError(type: StorageErrorType, message: string, details?: any): void {
    this.emitEvent({
      type: 'storage-error',
      timestamp: Date.now(),
      error: `${type}: ${message}`
    });
  }

  /**
   * Get API key for a specific provider
   */
  getAPIKey(provider: APIProvider): string | null {
    const apiKeys = this.getStorageData<LocalStorageSchema['api-keys']>('api-keys');
    console.log(`🗄️ [DEBUG] LocalStorage API keys data:`, {
      hasApiKeysData: !!apiKeys,
      availableProviders: apiKeys ? Object.keys(apiKeys) : [],
      requestedProvider: provider,
      hasRequestedKey: !!(apiKeys?.[provider])
    });
    return apiKeys?.[provider] || null;
  }

  /**
   * Set API key for a specific provider
   */
  setAPIKey(provider: APIProvider, key: string): void {
    const apiKeys = this.getStorageData<LocalStorageSchema['api-keys']>('api-keys') || {};
    apiKeys[provider] = key;
    this.setStorageData('api-keys', apiKeys);
    
    this.emitEvent({
      type: 'api-key-updated',
      provider,
      timestamp: Date.now()
    });
  }

  /**
   * Remove API key for a specific provider
   */
  removeAPIKey(provider: APIProvider): void {
    const apiKeys = this.getStorageData<LocalStorageSchema['api-keys']>('api-keys');
    if (apiKeys && apiKeys[provider]) {
      delete apiKeys[provider];
      this.setStorageData('api-keys', apiKeys);
      
      this.emitEvent({
        type: 'api-key-removed',
        provider,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Get GitHub Personal Access Token
   */
  getGitHubPAT(): string | null {
    const integrations = this.getStorageData<LocalStorageSchema['integrations']>('integrations');
    return integrations?.github?.token || null;
  }

  /**
   * Set GitHub Personal Access Token
   */
  setGitHubPAT(token: string): void {
    const integrations = this.getStorageData<LocalStorageSchema['integrations']>('integrations') || {};
    
    if (!integrations.github) {
      integrations.github = { token };
    } else {
      integrations.github.token = token;
    }
    
    this.setStorageData('integrations', integrations);
    
    this.emitEvent({
      type: 'github-pat-updated',
      timestamp: Date.now()
    });
  }

  /**
   * Remove GitHub Personal Access Token
   */
  removeGitHubPAT(): void {
    const integrations = this.getStorageData<LocalStorageSchema['integrations']>('integrations');
    if (integrations?.github) {
      delete integrations.github;
      this.setStorageData('integrations', integrations);
      
      this.emitEvent({
        type: 'github-pat-removed',
        timestamp: Date.now()
      });
    }
  }

  /**
   * Get GitHub integration data
   */
  getGitHubIntegration(): LocalStorageSchema['integrations']['github'] | null {
    const integrations = this.getStorageData<LocalStorageSchema['integrations']>('integrations');
    return integrations?.github || null;
  }

  /**
   * Update GitHub integration data (user info, last verified, etc.)
   */
  updateGitHubIntegration(data: Partial<LocalStorageSchema['integrations']['github']>): void {
    const integrations = this.getStorageData<LocalStorageSchema['integrations']>('integrations') || {};
    
    if (integrations.github) {
      integrations.github = { ...integrations.github, ...data };
      this.setStorageData('integrations', integrations);
    }
  }

  /**
   * Get all API keys
   */
  getAllAPIKeys(): LocalStorageSchema['api-keys'] {
    return this.getStorageData<LocalStorageSchema['api-keys']>('api-keys') || {};
  }

  /**
   * Clear all stored data
   */
  clearAll(): void {
    const storage = this.getStorage();
    if (!storage) {
      return;
    }

    try {
      const keysToRemove = Object.keys(storage).filter(key => 
        key.startsWith(this.storagePrefix)
      );
      
      keysToRemove.forEach(key => storage.removeItem(key));
      
      this.emitEvent({
        type: 'storage-cleared',
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Failed to clear storage:', error);
      this.emitStorageError(StorageErrorType.UNKNOWN_ERROR, 'Failed to clear storage');
    }
  }

  /**
   * Add event listener for storage changes
   */
  addEventListener(listener: (event: StorageEvent) => void): void {
    this.eventListeners.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: (event: StorageEvent) => void): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * Check if storage has any data
   */
  hasData(): boolean {
    const apiKeys = this.getAllAPIKeys();
    const githubPAT = this.getGitHubPAT();
    
    return Object.keys(apiKeys).length > 0 || !!githubPAT;
  }

  /**
   * Setup automatic cleanup on logout
   */
  setupAutoCleanup(): void {
    if (!this.config.autoCleanupOnLogout) {
      return;
    }

    // Listen for beforeunload event to detect potential logout
    const handleBeforeUnload = () => {
      // Only clear if using sessionStorage or if explicitly configured
      if (this.config.useSessionStorage) {
        this.clearAll();
      }
    };

    // Listen for storage events from other tabs (logout detection)
    const handleStorageEvent = (event: Event) => {
      // Handle browser storage events (different from our custom StorageEvent type)
      if (event instanceof StorageEvent) {
        // This is a browser StorageEvent, not our custom type
        // Additional cleanup if needed
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('storage', handleStorageEvent);
      
      this.cleanupListeners.push(() => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('storage', handleStorageEvent);
      });
    }
  }

  /**
   * Manually trigger cleanup on logout
   */
  cleanupOnLogout(): void {
    if (this.config.autoCleanupOnLogout) {
      this.clearAll();
    }
  }

  /**
   * Get storage quota information
   */
  getStorageQuota(): StorageQuotaInfo | null {
    if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.estimate) {
      return null;
    }

    try {
      // This is async but we'll return a sync version for now
      // In a real implementation, you might want to cache this or make it async
      const storage = this.getStorage();
      if (!storage) {
        return null;
      }

      // Estimate current usage by calculating size of our data
      let used = 0;
      Object.keys(storage).forEach(key => {
        if (key.startsWith(this.storagePrefix)) {
          const value = storage.getItem(key);
          if (value) {
            used += key.length + value.length;
          }
        }
      });

      // Use a reasonable estimate for total available storage
      const total = this.config.maxStorageSize || 5 * 1024 * 1024; // 5MB default
      const available = Math.max(0, total - used);
      const percentage = (used / total) * 100;

      return {
        used,
        available,
        total,
        percentage
      };
    } catch (error) {
      console.error('Failed to get storage quota:', error);
      return null;
    }
  }

  /**
   * Check storage health and return any errors
   */
  checkStorageHealth(): { healthy: boolean; errors: StorageError[] } {
    const errors: StorageError[] = [];

    // Check if storage is available
    if (!this.isStorageAvailable()) {
      errors.push({
        type: StorageErrorType.STORAGE_UNAVAILABLE,
        message: 'Storage is not available'
      });
    }

    // Check quota
    const quota = this.getStorageQuota();
    if (quota && quota.percentage > 90) {
      errors.push({
        type: StorageErrorType.QUOTA_EXCEEDED,
        message: `Storage is ${quota.percentage.toFixed(1)}% full`,
        details: quota
      });
    }

    // Check for data corruption by trying to parse stored data
    try {
      const apiKeys = this.getStorageData<LocalStorageSchema['api-keys']>('api-keys');
      const integrations = this.getStorageData<LocalStorageSchema['integrations']>('integrations');
      
      // Basic validation
      if (apiKeys && typeof apiKeys !== 'object') {
        errors.push({
          type: StorageErrorType.DATA_CORRUPTION,
          message: 'API keys data is corrupted'
        });
      }
      
      if (integrations && typeof integrations !== 'object') {
        errors.push({
          type: StorageErrorType.DATA_CORRUPTION,
          message: 'Integrations data is corrupted'
        });
      }
    } catch (error) {
      errors.push({
        type: StorageErrorType.DATA_CORRUPTION,
        message: 'Failed to validate stored data',
        details: error
      });
    }

    return {
      healthy: errors.length === 0,
      errors
    };
  }

  /**
   * Configure storage manager
   */
  configure(config: Partial<StorageConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Re-setup cleanup if configuration changed
    if (config.autoCleanupOnLogout !== undefined) {
      // Clean up existing listeners
      this.cleanupListeners.forEach(cleanup => cleanup());
      this.cleanupListeners = [];
      
      // Setup new listeners
      this.setupAutoCleanup();
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): StorageConfig {
    return { ...this.config };
  }
}

export const localStorageManager = LocalStorageManager.getInstance();