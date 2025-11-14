/**
 * Settings Page Enhancements
 * Additional UX improvements and polish for the settings page
 */

"use client";

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  Save,
  Shield,
  Upload,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToastNotifications } from "@/hooks/use-toast-notifications";
import { storage } from "@/lib/storage/helpers";
import { cn } from "@/lib/utils";

type SettingsEnhancementsProps = {
  className?: string;
};

export function SettingsEnhancements({ className }: SettingsEnhancementsProps) {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoSaveEnabled, _setAutoSaveEnabled] = useState(true);
  const [savingProgress, setSavingProgress] = useState(0);
  const toast = useToastNotifications();

  // Auto-save functionality
  useEffect(() => {
    if (!autoSaveEnabled) {
      return;
    }

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
        version: "1.0",
        summary: {
          apiKeysCount: apiKeys.length,
          providers: apiKeys,
          hasGitHubIntegration: hasGitHub,
          totalItems: summary.totalItems,
        },
        // Note: We don't export actual keys for security
        note: "This export contains configuration summary only. API keys are not included for security reasons.",
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `settings-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(
        "Settings exported",
        "Configuration summary downloaded successfully"
      );
    } catch (_error) {
      toast.error("Export failed", "Failed to export settings configuration");
    }
  }, [toast]);

  // Clear all data with confirmation
  const handleClearAllData = useCallback(() => {
    const confirmed = window.confirm(
      "Are you sure you want to clear all stored data? This action cannot be undone.\n\n" +
        "This will remove:\n" +
        "• All API keys\n" +
        "• GitHub integration\n" +
        "• All stored preferences"
    );

    if (confirmed) {
      try {
        storage.general.clearAll();
        toast.success("Data cleared", "All stored data has been removed");
        setLastSaved(null);
      } catch (_error) {
        toast.error("Clear failed", "Failed to clear stored data");
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
      usagePercentage: quota?.percentage || 0,
    };
  }, []);

  const stats = getStorageStats();

  return (
    <div className={cn("space-y-4", className)}>
      {/* Auto-save Status */}
      <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Save className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-900 text-sm dark:text-green-100">
                  Auto-save Active
                </span>
              </div>
              {lastSaved && (
                <div className="text-green-700 text-xs dark:text-green-300">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {savingProgress > 0 && (
                <div className="flex items-center gap-2">
                  <Progress className="h-2 w-16" value={savingProgress} />
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
              )}
              <Badge
                className="border-green-300 bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100"
                variant="outline"
              >
                <Zap className="mr-1 h-3 w-3" />
                Live
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Storage Health Status */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-sm">Storage Health</span>
            </div>
            <Badge
              className={
                stats.isHealthy
                  ? "border-green-200 bg-green-100 text-green-800"
                  : ""
              }
              variant={stats.isHealthy ? "default" : "destructive"}
            >
              {stats.isHealthy ? (
                <>
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Healthy
                </>
              ) : (
                <>
                  <AlertCircle className="mr-1 h-3 w-3" />
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
                <Progress className="h-2" value={stats.usagePercentage} />
              </div>
            )}

            {/* Configuration Summary */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground">API Keys:</span>
                <span className="ml-2 font-medium">
                  {stats.summary.apiKeys.count}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Integrations:</span>
                <span className="ml-2 font-medium">
                  {stats.summary.integrations.github ? "1" : "0"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-600" />
            <span className="font-medium text-sm">Quick Actions</span>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              className="justify-start"
              onClick={handleExportSettings}
              size="sm"
              variant="outline"
            >
              <Download className="mr-2 h-4 w-4" />
              Export Config
            </Button>

            <Button
              className="justify-start text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={handleClearAllData}
              size="sm"
              variant="outline"
            >
              <Upload className="mr-2 h-4 w-4" />
              Clear All Data
            </Button>
          </div>

          <div className="mt-3 text-muted-foreground text-xs">
            Export creates a configuration summary (no sensitive data included).
            Clear all removes everything stored locally.
          </div>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
            <div className="text-blue-900 text-xs dark:text-blue-100">
              <div className="mb-1 font-medium">Security & Privacy</div>
              <div className="space-y-1 text-blue-700 dark:text-blue-300">
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
