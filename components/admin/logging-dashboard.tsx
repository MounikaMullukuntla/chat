"use client";

import { ArrowLeft, Database, Save, Trash2, AlertCircle, Activity, Bot } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

interface LoggingSettings {
  error_logging_enabled: boolean;
  user_activity_logging_enabled: boolean;
  agent_activity_logging_enabled: boolean;
  log_retention_days: {
    error_logs: number;
    user_activity_logs: number;
    agent_activity_logs: number;
  };
  category_toggles: {
    log_auth_events: boolean;
    log_chat_events: boolean;
    log_document_events: boolean;
    log_admin_events: boolean;
    log_vote_events: boolean;
    log_file_events: boolean;
    log_artifact_events: boolean;
    log_ai_operations: boolean;
    log_tool_invocations: boolean;
    log_code_execution: boolean;
  };
  performance_settings: {
    batch_writes: boolean;
    batch_size: number;
    batch_interval_ms: number;
    async_logging: boolean;
    sampling_enabled: boolean;
    sampling_rate: number;
  };
  privacy_settings: {
    anonymize_ip: boolean;
    hash_email: boolean;
    log_user_agent: boolean;
    exclude_sensitive_paths: string[];
  };
}

export function LoggingDashboard() {
  const router = useRouter();
  const [settings, setSettings] = useState<LoggingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [purging, setPurging] = useState(false);

  // Fetch current logging settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/admin/config");
        if (response.ok) {
          const data = await response.json();
          const loggingConfig = data.configs.find(
            (c: any) => c.config_key === "logging_settings"
          );
          if (loggingConfig) {
            setSettings(loggingConfig.config_data);
          }
        }
      } catch (error) {
        console.error("Failed to fetch logging settings:", error);
        toast.error("Failed to load logging settings");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      const response = await fetch("/api/admin/logging/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast.success("Logging settings saved successfully");
      } else {
        throw new Error("Failed to save settings");
      }
    } catch (error) {
      console.error("Failed to save logging settings:", error);
      toast.error("Failed to save logging settings");
    } finally {
      setSaving(false);
    }
  };

  const handlePurge = async () => {
    if (!confirm("Are you sure you want to purge old logs? This action cannot be undone.")) {
      return;
    }

    try {
      setPurging(true);
      const response = await fetch("/api/admin/logging/purge", {
        method: "POST",
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Purged ${result.user_logs_deleted} user logs, ${result.agent_logs_deleted} agent logs, and ${result.error_logs_deleted} error logs`);
      } else {
        throw new Error("Failed to purge logs");
      }
    } catch (error) {
      console.error("Failed to purge logs:", error);
      toast.error("Failed to purge old logs");
    } finally {
      setPurging(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-4xl">
        {/* Page Header */}
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <Button
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              onClick={() => router.push("/admin")}
              variant="ghost"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Admin
            </Button>
            <div className="flex gap-2">
              <Button
                onClick={handlePurge}
                disabled={purging}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {purging ? "Purging..." : "Purge Old Logs"}
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </div>
          <div className="mb-2 flex items-center gap-3">
            <Database className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="font-bold text-3xl text-gray-900 dark:text-white">
                Logging Configuration
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Configure error logging, user activity logging, and agent activity logging
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Master Toggles */}
          <Card>
            <CardHeader>
              <CardTitle>Master Logging Toggles</CardTitle>
              <CardDescription>
                Enable or disable logging systems globally
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <Label htmlFor="error-logging" className="text-base">
                    Error Logging
                  </Label>
                </div>
                <Switch
                  id="error-logging"
                  checked={settings.error_logging_enabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, error_logging_enabled: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-blue-600" />
                  <Label htmlFor="user-logging" className="text-base">
                    User Activity Logging
                  </Label>
                </div>
                <Switch
                  id="user-logging"
                  checked={settings.user_activity_logging_enabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, user_activity_logging_enabled: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bot className="h-5 w-5 text-purple-600" />
                  <Label htmlFor="agent-logging" className="text-base">
                    Agent Activity Logging
                  </Label>
                </div>
                <Switch
                  id="agent-logging"
                  checked={settings.agent_activity_logging_enabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, agent_activity_logging_enabled: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Retention Policies */}
          <Card>
            <CardHeader>
              <CardTitle>Log Retention Policies</CardTitle>
              <CardDescription>
                Configure how long logs are retained before being purged
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="error-retention">Error Logs (days)</Label>
                  <Input
                    id="error-retention"
                    type="number"
                    min="1"
                    value={settings.log_retention_days.error_logs}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        log_retention_days: {
                          ...settings.log_retention_days,
                          error_logs: parseInt(e.target.value),
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="user-retention">User Activity Logs (days)</Label>
                  <Input
                    id="user-retention"
                    type="number"
                    min="1"
                    value={settings.log_retention_days.user_activity_logs}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        log_retention_days: {
                          ...settings.log_retention_days,
                          user_activity_logs: parseInt(e.target.value),
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="agent-retention">Agent Activity Logs (days)</Label>
                  <Input
                    id="agent-retention"
                    type="number"
                    min="1"
                    value={settings.log_retention_days.agent_activity_logs}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        log_retention_days: {
                          ...settings.log_retention_days,
                          agent_activity_logs: parseInt(e.target.value),
                        },
                      })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category Toggles */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Categories</CardTitle>
              <CardDescription>
                Enable or disable logging for specific activity categories
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {Object.entries(settings.category_toggles).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label htmlFor={key} className="text-sm">
                      {key.replace(/^log_/, "").replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </Label>
                    <Switch
                      id={key}
                      checked={value}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          category_toggles: {
                            ...settings.category_toggles,
                            [key]: checked,
                          },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Settings</CardTitle>
              <CardDescription>
                Configure batch processing and sampling for high-volume logging
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="batch-writes">Batch Writes</Label>
                <Switch
                  id="batch-writes"
                  checked={settings.performance_settings.batch_writes}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      performance_settings: {
                        ...settings.performance_settings,
                        batch_writes: checked,
                      },
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="batch-size">Batch Size</Label>
                  <Input
                    id="batch-size"
                    type="number"
                    min="1"
                    value={settings.performance_settings.batch_size}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        performance_settings: {
                          ...settings.performance_settings,
                          batch_size: parseInt(e.target.value),
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="batch-interval">Batch Interval (ms)</Label>
                  <Input
                    id="batch-interval"
                    type="number"
                    min="1000"
                    value={settings.performance_settings.batch_interval_ms}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        performance_settings: {
                          ...settings.performance_settings,
                          batch_interval_ms: parseInt(e.target.value),
                        },
                      })
                    }
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="async-logging">Async Logging</Label>
                <Switch
                  id="async-logging"
                  checked={settings.performance_settings.async_logging}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      performance_settings: {
                        ...settings.performance_settings,
                        async_logging: checked,
                      },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Privacy Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <CardDescription>
                Configure privacy-preserving features for logged data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="anonymize-ip">Anonymize IP Addresses</Label>
                <Switch
                  id="anonymize-ip"
                  checked={settings.privacy_settings.anonymize_ip}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      privacy_settings: {
                        ...settings.privacy_settings,
                        anonymize_ip: checked,
                      },
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="hash-email">Hash Email Addresses</Label>
                <Switch
                  id="hash-email"
                  checked={settings.privacy_settings.hash_email}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      privacy_settings: {
                        ...settings.privacy_settings,
                        hash_email: checked,
                      },
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="log-user-agent">Log User Agent</Label>
                <Switch
                  id="log-user-agent"
                  checked={settings.privacy_settings.log_user_agent}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      privacy_settings: {
                        ...settings.privacy_settings,
                        log_user_agent: checked,
                      },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
