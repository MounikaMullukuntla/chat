'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface LoggingConfig {
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

export default function LoggingSettingsPage() {
  const [config, setConfig] = useState<LoggingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [purging, setPurging] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    try {
      const response = await fetch('/api/admin/config/summary');
      const data = await response.json();

      if (data.loggingSettings) {
        setConfig(data.loggingSettings);
      }
    } catch (error) {
      console.error('Failed to fetch logging config:', error);
      toast.error('Failed to load logging configuration');
    } finally {
      setLoading(false);
    }
  }

  async function saveConfig() {
    if (!config) return;

    setSaving(true);
    try {
      const response = await fetch('/api/admin/logging/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }

      toast.success('Logging configuration saved successfully');
    } catch (error) {
      console.error('Failed to save logging config:', error);
      toast.error('Failed to save logging configuration');
    } finally {
      setSaving(false);
    }
  }

  async function purgeLogs() {
    if (!confirm('Are you sure you want to purge old logs based on retention policy?')) {
      return;
    }

    setPurging(true);
    try {
      const response = await fetch('/api/admin/logging/purge', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to purge logs');
      }

      const result = await response.json();
      toast.success(
        `Purged logs: ${result.user_logs_deleted} user, ${result.agent_logs_deleted} agent, ${result.error_logs_deleted} error`
      );
    } catch (error) {
      console.error('Failed to purge logs:', error);
      toast.error('Failed to purge logs');
    } finally {
      setPurging(false);
    }
  }

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Logging Settings</h1>
          <p className="text-muted-foreground">
            Configure error logging, user activity logging, and agent activity logging
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={purgeLogs} disabled={purging}>
            {purging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Purge Old Logs
          </Button>
          <Button onClick={saveConfig} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Main Toggles */}
      <Card>
        <CardHeader>
          <CardTitle>Logging Enablement</CardTitle>
          <CardDescription>
            Control which types of logging are active
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="error-logging">Error Logging</Label>
              <p className="text-sm text-muted-foreground">
                Log application errors and exceptions to database
              </p>
            </div>
            <Switch
              id="error-logging"
              checked={config.error_logging_enabled}
              onCheckedChange={(checked) =>
                setConfig({ ...config, error_logging_enabled: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="user-activity-logging">User Activity Logging</Label>
              <p className="text-sm text-muted-foreground">
                Log user actions like chat creation, file uploads, etc.
              </p>
            </div>
            <Switch
              id="user-activity-logging"
              checked={config.user_activity_logging_enabled}
              onCheckedChange={(checked) =>
                setConfig({ ...config, user_activity_logging_enabled: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="agent-activity-logging">Agent Activity Logging</Label>
              <p className="text-sm text-muted-foreground">
                Log AI agent operations, performance metrics, and token usage
              </p>
            </div>
            <Switch
              id="agent-activity-logging"
              checked={config.agent_activity_logging_enabled}
              onCheckedChange={(checked) =>
                setConfig({ ...config, agent_activity_logging_enabled: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Retention Periods */}
      <Card>
        <CardHeader>
          <CardTitle>Log Retention</CardTitle>
          <CardDescription>
            Configure how long logs are kept (in days)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="error-retention">Error Logs</Label>
              <Input
                id="error-retention"
                type="number"
                value={config.log_retention_days.error_logs}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    log_retention_days: {
                      ...config.log_retention_days,
                      error_logs: parseInt(e.target.value),
                    },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-retention">User Activity Logs</Label>
              <Input
                id="user-retention"
                type="number"
                value={config.log_retention_days.user_activity_logs}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    log_retention_days: {
                      ...config.log_retention_days,
                      user_activity_logs: parseInt(e.target.value),
                    },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agent-retention">Agent Activity Logs</Label>
              <Input
                id="agent-retention"
                type="number"
                value={config.log_retention_days.agent_activity_logs}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    log_retention_days: {
                      ...config.log_retention_days,
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
          <CardTitle>Category Logging</CardTitle>
          <CardDescription>
            Fine-grained control over what gets logged
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          {Object.entries(config.category_toggles).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <Label htmlFor={key} className="capitalize">
                {key.replace('log_', '').replace(/_/g, ' ')}
              </Label>
              <Switch
                id={key}
                checked={value}
                onCheckedChange={(checked) =>
                  setConfig({
                    ...config,
                    category_toggles: {
                      ...config.category_toggles,
                      [key]: checked,
                    },
                  })
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Performance Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Settings</CardTitle>
          <CardDescription>
            Configure batching and sampling for high-volume logging
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="batch-writes">Batch Writes</Label>
            <Switch
              id="batch-writes"
              checked={config.performance_settings.batch_writes}
              onCheckedChange={(checked) =>
                setConfig({
                  ...config,
                  performance_settings: {
                    ...config.performance_settings,
                    batch_writes: checked,
                  },
                })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="batch-size">Batch Size</Label>
              <Input
                id="batch-size"
                type="number"
                value={config.performance_settings.batch_size}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    performance_settings: {
                      ...config.performance_settings,
                      batch_size: parseInt(e.target.value),
                    },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="batch-interval">Batch Interval (ms)</Label>
              <Input
                id="batch-interval"
                type="number"
                value={config.performance_settings.batch_interval_ms}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    performance_settings: {
                      ...config.performance_settings,
                      batch_interval_ms: parseInt(e.target.value),
                    },
                  })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Privacy Settings</CardTitle>
          <CardDescription>
            Configure privacy and data protection options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="anonymize-ip">Anonymize IP Addresses</Label>
              <p className="text-sm text-muted-foreground">
                Mask last octet of IP addresses
              </p>
            </div>
            <Switch
              id="anonymize-ip"
              checked={config.privacy_settings.anonymize_ip}
              onCheckedChange={(checked) =>
                setConfig({
                  ...config,
                  privacy_settings: {
                    ...config.privacy_settings,
                    anonymize_ip: checked,
                  },
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="hash-email">Hash Email Addresses</Label>
              <p className="text-sm text-muted-foreground">
                Store SHA-256 hash instead of raw email
              </p>
            </div>
            <Switch
              id="hash-email"
              checked={config.privacy_settings.hash_email}
              onCheckedChange={(checked) =>
                setConfig({
                  ...config,
                  privacy_settings: {
                    ...config.privacy_settings,
                    hash_email: checked,
                  },
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="log-user-agent">Log User Agent</Label>
              <p className="text-sm text-muted-foreground">
                Include browser/client information in logs
              </p>
            </div>
            <Switch
              id="log-user-agent"
              checked={config.privacy_settings.log_user_agent}
              onCheckedChange={(checked) =>
                setConfig({
                  ...config,
                  privacy_settings: {
                    ...config.privacy_settings,
                    log_user_agent: checked,
                  },
                })
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
