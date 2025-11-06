/**
 * Settings Page Enhancements
 * Additional UX improvements and polish for the settings page
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Save, 
  Download, 
  Upload, 
  Shield, 
  Clock, 
  Zap,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { storage } from '@/lib/storage/helpers';
import { useToastNotifications } from '@/hooks/use-toast-notifications';
import { cn } from '@/lib/utils';

interface SettingsEnhancementsProps {
  className?: string;
}

export function SettingsEnhancements({ className }: SettingsEnhancementsProps) {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [savingProgress, setSavingProgress] = useState(0);
  const toast = useToastNotifications();

  // Auto-save functionality
  useEffect(() => {
    if (!autoSaveEnabled) return;

    const handleStorageChange = () => {
      setLastSaved(new Date());
      setSavingProgress(100);
      setTimeout(() => setSavingProgress(0), 1000);
    };

    storage.general.addEventListener(handleStorageChange);
    return () => storage.general.removeEventListener(handleStorageChange);
  }, [autoSaveEnabled]);

  // Export settings
  const handleExportSettings = useCallback(() => {
    try {
      const apiKeys = storage.apiKeys.getConfiguredProviders();
      const hasGitHub = storage.github.hasToken();
      const summary = storage.general.getSummary();

      const exportData = {
        timestamp: new Date().toISOString(),
        version: '1.0',
        summary: {
          apiKeysCount: apiKeys.length,
          providers: apiKeys,
          hasGitHubIntegration: hasGitHub,
          totalItems: summary.totalItems
        },
        // Note: We don't export actual keys for security
        note: 'This export contains configuration summary only. API keys are not included for security reasons.'
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `settings-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Settings exported', 'Configuration summary downloaded successfully');
    } catch (error) {
      toast.error('Export failed', 'Failed to export settings configuration');
    }
  }, [toast]);

  // Clear all data with confirmation
  const handleClearAllData = useCallback(() => {
    const confirmed = window.confirm(
      'Are you sure you want to clear all stored data? This action cannot be undone.\n\n' +
      'This will remove:\n' +
      '• All API keys\n' +
      '• GitHub integration\n' +
      '• All stored preferences'
    );

    if (confirmed) {
      try {
        storage.general.clearAll();
        toast.success('Data cleared', 'All stored data has been removed');
        setLastSaved(null);
      } catch (error) {
        toast.error('Clear failed', 'Failed to clear stored data');
      }
    }
  }, [toast]);

  // Get storage statistics
  const getStorageStats = useCallback(() => {
    const summary = storage.general.getSummary();
    const quota = storage.general.getQuota();
    const health = storage.general.checkHealth();

    return {
      summary,
      quota,
      health,
      isHealthy: health.healthy,
      usagePercentage: quota?.percentage || 0
    };
  }, []);

  const stats = getStorageStats();

  return (
    <div className={cn("space-y-4", className)}>
      {/* Auto-save Status */}
      <Card className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Save className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-900 dark:text-green-100">
                  Auto-save Active
                </span>
              </div>
              {lastSaved && (
                <div className="text-xs text-green-700 dark:text-green-300">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {savingProgress > 0 && (
                <div className="flex items-center gap-2">
                  <Progress value={savingProgress} className="w-16 h-2" />
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
              )}
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 dark:bg-green-800 dark:text-green-100">
                <Zap className="h-3 w-3 mr-1" />
                Live
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Storage Health Status */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Storage Health</span>
            </div>
            <Badge 
              variant={stats.isHealthy ? "default" : "destructive"}
              className={stats.isHealthy ? "bg-green-100 text-green-800 border-green-200" : ""}
            >
              {stats.isHealthy ? (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Healthy
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Issues
                </>
              )}
            </Badge>
          </div>

          <div className="space-y-2">
            {/* Storage Usage */}
            {stats.quota && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Storage Usage</span>
                  <span>{stats.usagePercentage.toFixed(1)}%</span>
                </div>
                <Progress value={stats.usagePercentage} className="h-2" />
              </div>
            )}

            {/* Configuration Summary */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground">API Keys:</span>
                <span className="ml-2 font-medium">{stats.summary.apiKeys.count}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Integrations:</span>
                <span className="ml-2 font-medium">
                  {stats.summary.integrations.github ? '1' : '0'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium">Quick Actions</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportSettings}
              className="justify-start"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Config
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAllData}
              className="justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Upload className="h-4 w-4 mr-2" />
              Clear All Data
            </Button>
          </div>

          <div className="mt-3 text-xs text-muted-foreground">
            Export creates a configuration summary (no sensitive data included).
            Clear all removes everything stored locally.
          </div>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-900 dark:text-blue-100">
              <div className="font-medium mb-1">Security & Privacy</div>
              <div className="text-blue-700 dark:text-blue-300 space-y-1">
                <div>• All data is stored locally in your browser</div>
                <div>• API keys are never transmitted to our servers</div>
                <div>• Data is automatically cleared when you log out</div>
                <div>• No sensitive information is included in exports</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}