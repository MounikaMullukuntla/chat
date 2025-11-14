/**
 * Toast notification component for settings
 */

"use client";

import { AlertTriangle, CheckCircle, Info, X, XCircle } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ToastNotification } from "@/hooks/use-toast-notifications";
import { cn } from "@/lib/utils";

type ToastNotificationsProps = {
  notifications: ToastNotification[];
  onRemove: (id: string) => void;
};

export function ToastNotifications({
  notifications,
  onRemove,
}: ToastNotificationsProps) {
  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed right-4 bottom-4 z-50 max-w-sm space-y-2">
      {notifications.map((notification) => (
        <ToastItem
          key={notification.id}
          notification={notification}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

type ToastItemProps = {
  notification: ToastNotification;
  onRemove: (id: string) => void;
};

function ToastItem({ notification, onRemove }: ToastItemProps) {
  const { id, type, title, message, action } = notification;

  useEffect(() => {
    // Auto-remove after duration if specified
    if (notification.duration && notification.duration > 0) {
      const timer = setTimeout(() => {
        onRemove(id);
      }, notification.duration);

      return () => clearTimeout(timer);
    }
  }, [id, notification.duration, onRemove]);

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case "info":
        return <Info className="h-4 w-4 text-blue-600" />;
      default:
        return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  const getCardClasses = () => {
    switch (type) {
      case "success":
        return "border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800";
      case "error":
        return "border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800";
      case "warning":
        return "border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800";
      case "info":
        return "border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800";
      default:
        return "border-gray-200 bg-gray-50 dark:bg-gray-900/20 dark:border-gray-800";
    }
  };

  const getTitleClasses = () => {
    switch (type) {
      case "success":
        return "text-green-900 dark:text-green-100";
      case "error":
        return "text-red-900 dark:text-red-100";
      case "warning":
        return "text-yellow-900 dark:text-yellow-100";
      case "info":
        return "text-blue-900 dark:text-blue-100";
      default:
        return "text-gray-900 dark:text-gray-100";
    }
  };

  const getMessageClasses = () => {
    switch (type) {
      case "success":
        return "text-green-700 dark:text-green-300";
      case "error":
        return "text-red-700 dark:text-red-300";
      case "warning":
        return "text-yellow-700 dark:text-yellow-300";
      case "info":
        return "text-blue-700 dark:text-blue-300";
      default:
        return "text-gray-700 dark:text-gray-300";
    }
  };

  return (
    <Card
      className={cn(
        "slide-in-from-right-full w-full animate-in shadow-lg duration-300",
        getCardClasses()
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex-shrink-0">{getIcon()}</div>

          <div className="min-w-0 flex-1">
            <div className={cn("font-medium text-sm", getTitleClasses())}>
              {title}
            </div>
            {message && (
              <div className={cn("mt-1 text-xs", getMessageClasses())}>
                {message}
              </div>
            )}
            {action && (
              <Button
                className="mt-2 h-6 px-2 text-xs"
                onClick={action.onClick}
                size="sm"
                variant="outline"
              >
                {action.label}
              </Button>
            )}
          </div>

          <Button
            aria-label="Dismiss notification"
            className="h-6 w-6 flex-shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => onRemove(id)}
            size="icon"
            variant="ghost"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
