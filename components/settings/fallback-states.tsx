/**
 * Fallback states for Settings components
 * Loading, error, and empty states
 */

"use client";

import {
  AlertTriangle,
  Database,
  GitBranch,
  Key,
  LoaderIcon,
  RefreshCw,
  Settings,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type LoadingStateProps = {
  className?: string;
  message?: string;
};

export function SettingsLoadingState({
  className,
  message = "Loading settings...",
}: LoadingStateProps) {
  return (
    <div className={cn("container mx-auto px-4 py-4 sm:py-8", className)}>
      <div className="mx-auto max-w-4xl">
        {/* Header Skeleton */}
        <div className="mb-6 sm:mb-8">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Skeleton className="h-6 w-6 sm:h-8 sm:w-8" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </div>

        {/* Loading Message */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-2 py-8">
              <LoaderIcon className="h-5 w-5 animate-spin text-blue-600" />
              <span className="text-muted-foreground text-sm">{message}</span>
            </div>
          </CardContent>
        </Card>

        {/* Tab Skeletons */}
        <div className="mt-6 space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div className="flex flex-col items-center gap-2 p-4" key={i}>
                    <Skeleton className="h-5 w-5" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Content Skeletons */}
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-6 w-24" />
                </div>
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

type ErrorStateProps = {
  className?: string;
  error?: string;
  onRetry?: () => void;
  onReload?: () => void;
};

export function SettingsErrorState({
  className,
  error = "Failed to load settings",
  onRetry,
  onReload,
}: ErrorStateProps) {
  return (
    <div className={cn("container mx-auto px-4 py-4 sm:py-8", className)}>
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Settings Unavailable
            </CardTitle>
            <CardDescription>
              We encountered an issue loading your settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>

            <div className="flex flex-col gap-2 sm:flex-row">
              {onRetry && (
                <Button
                  className="flex items-center gap-2"
                  onClick={onRetry}
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
              )}
              {onReload && (
                <Button
                  className="flex items-center gap-2"
                  onClick={onReload}
                  variant="default"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reload Page
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type EmptyStateProps = {
  className?: string;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
};

export function SettingsEmptyState({
  className,
  title = "No Settings Configured",
  description = "Start by adding your API keys and integrations to get the most out of the platform.",
  action,
}: EmptyStateProps) {
  return (
    <div className={cn("container mx-auto px-4 py-4 sm:py-8", className)}>
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Settings className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
            <h3 className="mb-2 font-semibold text-lg">{title}</h3>
            <p className="mb-6 text-muted-foreground">{description}</p>

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col items-center gap-2 rounded-lg border p-4">
                <Key className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-sm">API Keys</span>
                <span className="text-center text-muted-foreground text-xs">
                  Configure AI provider credentials
                </span>
              </div>
              <div className="flex flex-col items-center gap-2 rounded-lg border p-4">
                <GitBranch className="h-5 w-5 text-green-600" />
                <span className="font-medium text-sm">Integrations</span>
                <span className="text-center text-muted-foreground text-xs">
                  Connect external services
                </span>
              </div>
              <div className="flex flex-col items-center gap-2 rounded-lg border p-4">
                <Database className="h-5 w-5 text-purple-600" />
                <span className="font-medium text-sm">Storage</span>
                <span className="text-center text-muted-foreground text-xs">
                  Manage data preferences
                </span>
              </div>
            </div>

            {action && (
              <Button className="w-full sm:w-auto" onClick={action.onClick}>
                {action.label}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type NetworkStateProps = {
  className?: string;
  isOnline: boolean;
  onRetry?: () => void;
};

export function NetworkState({
  className,
  isOnline,
  onRetry,
}: NetworkStateProps) {
  if (isOnline) {
    return null;
  }

  return (
    <div className={cn("fixed top-4 right-4 z-50", className)}>
      <Alert className="w-80" variant="destructive">
        <WifiOff className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>You're offline. Some features may not work.</span>
          {onRetry && (
            <Button
              className="ml-2 h-6 px-2"
              onClick={onRetry}
              size="sm"
              variant="outline"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
}

export function ConnectedState({ className }: { className?: string }) {
  return (
    <div className={cn("fixed top-4 right-4 z-50", className)}>
      <Alert className="w-80 border-green-200 bg-green-50 text-green-800">
        <Wifi className="h-4 w-4 text-green-600" />
        <AlertDescription>
          Connection restored. All features are available.
        </AlertDescription>
      </Alert>
    </div>
  );
}

type ComponentLoadingProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
};

export function ComponentLoading({
  className,
  size = "md",
}: ComponentLoadingProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  return (
    <div className={cn("flex items-center justify-center p-4", className)}>
      <LoaderIcon
        className={cn("animate-spin text-muted-foreground", sizeClasses[size])}
      />
    </div>
  );
}
