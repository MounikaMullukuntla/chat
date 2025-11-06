/**
 * Storage Management Section - Advanced storage configuration and monitoring
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useStorageSession, useStorageEvents } from '@/lib/storage/use-storage-session';
import { storage } from '@/lib/storage/helpers';
import type { StorageEvent, StorageError } from '@/lib/storage/types';

export function StorageManagementSection() {
  const {
    configureStorage,
    configureSessionStorage,
    getStorageStatus,
    forceCleanup,
    getStorageQuota,
    checkStorageHealth,
    isAuthenticated
  } = useStorageSession();

  const [storageStatus, setStorageStatus] = useState(getStorageStatus());
  const [storageQuota, setStorageQuota] = useState(getStorageQuota());
  const [storageHealth, setStorageHealth] = useState(checkStorageHealth());
  const [events, setEvents] = useState<StorageEvent[]>([]);

  // Listen to storage events
  useStorageEvents((event) => {
    setEvents(prev => [event, ...prev.slice(0, 4)]); // Keep last 5 events
    
    // Update status when events occur
    setStorageStatus(getStorageStatus());
    setStorageQuota(getStorageQuota());
    setStorageHealth(checkStorageHealth());
  });

  // Refresh status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setStorageStatus(getStorageStatus());
      setStorageQuota(getStorageQuota());
      setStorageHealth(checkStorageHealth());
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [getStorageStatus, getStorageQuota, checkStorageHealth]);

  const handleSessionStorageToggle = (enabled: boolean) => {
    configureSessionStorage(enabled);
    setStorageStatus(getStorageStatus());
  };

  const handleAutoCleanupToggle = (enabled: boolean) => {
    configureStorage({ autoCleanupOnLogout: enabled });
    setStorageStatus(getStorageStatus());
  };

  const handleForceCleanup = () => {
    if (confirm('Are you sure you want to clear all stored API keys and integrations?')) {
      forceCleanup();
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getHealthBadgeVariant = (healthy: boolean) => {
    return healthy ? 'default' : 'destructive';
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'storage-error':
        return 'text-red-600';
      case 'storage-cleared':
        return 'text-orange-600';
      default:
        return 'text-green-600';
    }
  };

  if (!isAuthenticated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Storage Management</CardTitle>
          <CardDescription>
            Advanced storage configuration and monitoring
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Please log in to access storage management features.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Storage Management</CardTitle>
        <CardDescription>
          Configure storage behavior and monitor usage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Storage Configuration */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Configuration</h4>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="session-storage">Use Session Storage</Label>
              <p className="text-sm text-muted-foreground">
                Store data only for the current browser session
              </p>
            </div>
            <Switch
              id="session-storage"
              checked={storageStatus.usingSessionStorage}
              onCheckedChange={handleSessionStorageToggle}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-cleanup">Auto Cleanup on Logout</Label>
              <p className="text-sm text-muted-foreground">
                Automatically clear stored data when logging out
              </p>
            </div>
            <Switch
              id="auto-cleanup"
              checked={storageStatus.autoCleanupEnabled}
              onCheckedChange={handleAutoCleanupToggle}
            />
          </div>
        </div>

        {/* Storage Status */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Status</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Storage Type</Label>
              <Badge variant={storageStatus.usingSessionStorage ? 'secondary' : 'default'}>
                {storageStatus.usingSessionStorage ? 'Session' : 'Local'}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <Label>Health Status</Label>
              <Badge variant={getHealthBadgeVariant(storageHealth.healthy)}>
                {storageHealth.healthy ? 'Healthy' : 'Issues Detected'}
              </Badge>
            </div>
          </div>

          {storageQuota && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <Label>Storage Usage</Label>
                <span className="text-muted-foreground">
                  {formatBytes(storageQuota.used)} / {formatBytes(storageQuota.total)}
                </span>
              </div>
              <Progress value={storageQuota.percentage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {storageQuota.percentage.toFixed(1)}% used
              </p>
            </div>
          )}
        </div>

        {/* Health Issues */}
        {!storageHealth.healthy && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-red-600">Health Issues</h4>
            {storageHealth.errors.map((error: StorageError, index: number) => (
              <Alert key={index} variant="destructive">
                <AlertDescription>
                  <strong>{error.type}:</strong> {error.message}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Recent Events */}
        {events.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Recent Events</h4>
            <div className="space-y-1">
              {events.map((event, index) => (
                <div key={index} className="text-xs p-2 bg-muted rounded">
                  <span className={getEventTypeColor(event.type)}>
                    {event.type}
                  </span>
                  {event.provider && (
                    <span className="ml-2 text-muted-foreground">
                      ({event.provider})
                    </span>
                  )}
                  {event.error && (
                    <span className="ml-2 text-red-600">
                      - {event.error}
                    </span>
                  )}
                  <span className="ml-2 text-muted-foreground">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Actions</h4>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStorageStatus(getStorageStatus());
                setStorageQuota(getStorageQuota());
                setStorageHealth(checkStorageHealth());
              }}
            >
              Refresh Status
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleForceCleanup}
              disabled={!storageStatus.hasData}
            >
              Clear All Data
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}