/**
 * Hook for managing toast notifications in settings
 */

"use client";

import { useCallback, useState } from "react";

export type ToastNotification = {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
};

export function useToastNotifications() {
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const addNotification = useCallback(
    (notification: Omit<ToastNotification, "id">) => {
      const id = Math.random().toString(36).substr(2, 9);
      const newNotification: ToastNotification = {
        ...notification,
        id,
        duration: notification.duration ?? 5000,
      };

      setNotifications((prev) => [...prev, newNotification]);

      // Auto-remove after duration
      if (newNotification.duration && newNotification.duration > 0) {
        setTimeout(() => {
          removeNotification(id);
        }, newNotification.duration);
      }

      return id;
    },
    [removeNotification]
  );

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Convenience methods
  const success = useCallback(
    (title: string, message?: string, options?: Partial<ToastNotification>) => {
      return addNotification({ type: "success", title, message, ...options });
    },
    [addNotification]
  );

  const error = useCallback(
    (title: string, message?: string, options?: Partial<ToastNotification>) => {
      return addNotification({
        type: "error",
        title,
        message,
        duration: 8000,
        ...options,
      });
    },
    [addNotification]
  );

  const warning = useCallback(
    (title: string, message?: string, options?: Partial<ToastNotification>) => {
      return addNotification({ type: "warning", title, message, ...options });
    },
    [addNotification]
  );

  const info = useCallback(
    (title: string, message?: string, options?: Partial<ToastNotification>) => {
      return addNotification({ type: "info", title, message, ...options });
    },
    [addNotification]
  );

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    success,
    error,
    warning,
    info,
  };
}
