/**
 * Hook for monitoring network connectivity status
 */

"use client";

import { useEffect, useState } from "react";

type NetworkStatus = {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string | null;
  effectiveType: string | null;
};

export function useNetworkStatus(): NetworkStatus {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    isSlowConnection: false,
    connectionType: null,
    effectiveType: null,
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const updateNetworkStatus = () => {
      const connection =
        (navigator as any).connection ||
        (navigator as any).mozConnection ||
        (navigator as any).webkitConnection;

      const isOnline = navigator.onLine;
      let isSlowConnection = false;
      let connectionType = null;
      let effectiveType = null;

      if (connection) {
        connectionType = connection.type || null;
        effectiveType = connection.effectiveType || null;

        // Consider 2G or slow-2g as slow connections
        isSlowConnection =
          effectiveType === "2g" || effectiveType === "slow-2g";
      }

      setNetworkStatus({
        isOnline,
        isSlowConnection,
        connectionType,
        effectiveType,
      });
    };

    // Initial check
    updateNetworkStatus();

    // Listen for online/offline events
    const handleOnline = () => updateNetworkStatus();
    const handleOffline = () => updateNetworkStatus();

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Listen for connection changes if supported
    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    if (connection) {
      connection.addEventListener("change", updateNetworkStatus);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);

      if (connection) {
        connection.removeEventListener("change", updateNetworkStatus);
      }
    };
  }, []);

  return networkStatus;
}

/**
 * Hook for retrying operations when network comes back online
 */
export function useNetworkRetry(retryFn: () => void | Promise<void>) {
  const { isOnline } = useNetworkStatus();
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
    } else if (wasOffline && isOnline) {
      // Network came back online, retry the operation
      setWasOffline(false);
      retryFn();
    }
  }, [isOnline, wasOffline, retryFn]);

  return { isOnline, wasOffline };
}
