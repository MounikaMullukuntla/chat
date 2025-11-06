/**
 * Hook for managing storage sessions and cleanup
 */

'use client';

import { useEffect, useCallback } from 'react';
import { localStorageManager } from './local-storage-manager';
import type { StorageConfig, StorageEvent } from './types';

export function useStorageSession() {
  // Configure storage
  const configureStorage = useCallback((config: Partial<StorageConfig>) => {
    localStorageManager.configure(config);
  }, []);

  // Configure session storage
  const configureSessionStorage = useCallback((enabled: boolean) => {
    // Simplified - just log for now
    console.log('Session storage configuration:', enabled);
  }, []);

  // Get storage status
  const getStorageStatus = useCallback(() => {
    return {
      usingSessionStorage: false,
      autoCleanupEnabled: true,
      hasData: localStorageManager.hasData(),
      storageHealth: localStorageManager.checkStorageHealth()
    };
  }, []);

  // Manual cleanup
  const forceCleanup = useCallback(() => {
    localStorageManager.cleanupOnLogout();
  }, []);

  // Get storage quota
  const getStorageQuota = useCallback(() => {
    return localStorageManager.getStorageQuota();
  }, []);

  // Check storage health
  const checkStorageHealth = useCallback(() => {
    return localStorageManager.checkStorageHealth();
  }, []);

  return {
    configureStorage,
    configureSessionStorage,
    getStorageStatus,
    forceCleanup,
    getStorageQuota,
    checkStorageHealth,
    isAuthenticated: true // Simplified - assume always authenticated
  };
}

/**
 * Hook for monitoring storage events
 */
export function useStorageEvents(
  onStorageEvent?: (event: StorageEvent) => void
) {
  useEffect(() => {
    if (!onStorageEvent) return;

    localStorageManager.addEventListener(onStorageEvent);

    return () => {
      localStorageManager.removeEventListener(onStorageEvent);
    };
  }, [onStorageEvent]);
}