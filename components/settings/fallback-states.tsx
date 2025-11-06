/**
 * Fallback states for Settings components
 * Loading, error, and empty states
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  LoaderIcon, 
  AlertTriangle, 
  RefreshCw, 
  Settings, 
  Key, 
  GitBranch,
  Database,
  Wifi,
  WifiOff
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  className?: string;
  message?: string;
}

export function SettingsLoadingState({ className, message = "Loading settings..." }: LoadingStateProps) {
  return (
    <div className={cn("container mx-auto px-4 py-4 sm:py-8", className)}>
      <div className="max-w-4xl mx-auto">
        {/* Header Skeleton */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
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
              <span className="text-sm text-muted-foreground">{message}</span>
            </div>
          </CardContent>
        </Card>

        {/* Tab Skeletons */}
        <div className="mt-6 space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex flex-col items-center gap-2 p-4">
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

interface ErrorStateProps {
  className?: string;
  error?: string;
  onRetry?: () => void;
  onReload?: () => void;
}

export function SettingsErrorState({ 
  className, 
  error = "Failed to load settings", 
  onRetry,
  onReload 
}: ErrorStateProps) {
  return (
    <div className={cn("container mx-auto px-4 py-4 sm:py-8", className)}>
      <div className="max-w-2xl mx-auto">
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

            <div className="flex flex-col sm:flex-row gap-2">
              {onRetry && (
                <Button
                  onClick={onRetry}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
              )}
              {onReload && (
                <Button
                  onClick={onReload}
                  variant="default"
                  className="flex items-center gap-2"
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

interface EmptyStateProps {
  className?: string;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function SettingsEmptyState({ 
  className,
  title = "No Settings Configured",
  description = "Start by adding your API keys and integrations to get the most out of the platform.",
  action
}: EmptyStateProps) {
  return (
    <div className={cn("container mx-auto px-4 py-4 sm:py-8", className)}>
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <Settings className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <p className="text-muted-foreground mb-6">{description}</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
                <Key className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium">API Keys</span>
                <span className="text-xs text-muted-foreground text-center">
                  Configure AI provider credentials
                </span>
              </div>
              <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
                <GitBranch className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium">Integrations</span>
                <span className="text-xs text-muted-foreground text-center">
                  Connect external services
                </span>
              </div>
              <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
                <Database className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium">Storage</span>
                <span className="text-xs text-muted-foreground text-center">
                  Manage data preferences
                </span>
              </div>
            </div>

            {action && (
              <Button onClick={action.onClick} className="w-full sm:w-auto">
                {action.label}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface NetworkStateProps {
  className?: string;
  isOnline: boolean;
  onRetry?: () => void;
}

export function NetworkState({ className, isOnline, onRetry }: NetworkStateProps) {
  if (isOnline) {
    return null;
  }

  return (
    <div className={cn("fixed top-4 right-4 z-50", className)}>
      <Alert variant="destructive" className="w-80">
        <WifiOff className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>You're offline. Some features may not work.</span>
          {onRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
              className="ml-2 h-6 px-2"
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

interface ComponentLoadingProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ComponentLoading({ className, size = 'md' }: ComponentLoadingProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  return (
    <div className={cn("flex items-center justify-center p-4", className)}>
      <LoaderIcon className={cn("animate-spin text-muted-foreground", sizeClasses[size])} />
    </div>
  );
}