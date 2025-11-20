"use client";

import { Loader2, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type SimpleToolConfig = {
  description: string;
  enabled: boolean;
};

type ProviderToolsAgentConfig = {
  enabled: boolean;
  systemPrompt: string;
  rateLimit: {
    perMinute: number;
    perHour: number;
    perDay: number;
  };
  tools: {
    googleSearch?: SimpleToolConfig;
    urlContext?: SimpleToolConfig;
    codeExecution?: SimpleToolConfig;
  };
};

type ProviderToolsAgentConfigProps = {
  provider: string;
  initialConfig: ProviderToolsAgentConfig;
  onSave: (config: ProviderToolsAgentConfig) => Promise<void>;
};

const TOOL_INFO = {
  googleSearch: {
    title: "Google Search",
    description: "Search the web for current information and real-time data",
  },
  urlContext: {
    title: "URL Context",
    description: "Fetch and analyze content from web pages and documents",
  },
  codeExecution: {
    title: "Code Execution",
    description: "Execute Python code and return results with output",
  },
} as const;

export function ProviderToolsAgentConfig({
  provider,
  initialConfig,
  onSave,
}: ProviderToolsAgentConfigProps) {
  const [config, setConfig] = useState<ProviderToolsAgentConfig>(initialConfig);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(config);
      toast.success("Provider tools agent configuration saved successfully");

      // Log successful configuration update
      try {
        const { logUserActivity, UserActivityType, ActivityCategory } =
          await import("@/lib/logging");

        void logUserActivity({
          user_id: "", // Will be populated from session
          activity_type: UserActivityType.ADMIN_CONFIG_UPDATE,
          activity_category: ActivityCategory.ADMIN,
          activity_metadata: {
            config_type: "provider_tools_agent",
            provider,
            agent_enabled: config.enabled,
            tools_count: Object.keys(config.tools).length,
            enabled_tools: Object.entries(config.tools)
              .filter(([_, toolConfig]) => toolConfig?.enabled)
              .map(([toolName]) => toolName),
          },
          resource_type: "agent_config",
          resource_id: `${provider}_provider_tools`,
          success: true,
        });
      } catch (logError) {
        console.error("Failed to log config update:", logError);
      }
    } catch (error) {
      toast.error("Failed to save configuration");
      console.error(error);

      // Log configuration save error
      try {
        const { logAdminError, ErrorCategory, ErrorSeverity } = await import(
          "@/lib/errors/logger"
        );

        void logAdminError(
          ErrorCategory.CONFIG_UPDATE_FAILED,
          `Failed to save provider tools agent config: ${
            error instanceof Error ? error.message : String(error)
          }`,
          {
            config_type: "provider_tools_agent",
            provider,
            error_details: error instanceof Error ? error.stack : undefined,
          },
          undefined,
          ErrorSeverity.ERROR
        );
      } catch (logError) {
        console.error("Failed to log config error:", logError);
      }
    } finally {
      setSaving(false);
    }
  };

  const updateTool = (
    toolName: keyof typeof config.tools,
    updates: Partial<SimpleToolConfig>
  ) => {
    setConfig((prev) => ({
      ...prev,
      tools: {
        ...prev.tools,
        [toolName]: {
          ...prev.tools[toolName],
          ...updates,
        },
      },
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Provider Tools Agent ({provider})</CardTitle>
              <CardDescription>
                Configure web search, URL analysis, and code execution tools
              </CardDescription>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(enabled: boolean) =>
                setConfig((prev) => ({ ...prev, enabled }))
              }
            />
          </div>
        </CardHeader>
      </Card>

      {/* System Prompt */}
      <Card>
        <CardHeader>
          <CardTitle>System Prompt</CardTitle>
          <CardDescription>
            Define the agent's behavior and instructions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            className="font-mono text-sm"
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, systemPrompt: e.target.value }))
            }
            placeholder="Enter the system prompt that defines the agent's behavior..."
            rows={6}
            value={config.systemPrompt}
          />
        </CardContent>
      </Card>

      {/* Rate Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Rate Limits</CardTitle>
          <CardDescription>
            Control usage limits for the provider tools agent
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="perMinute">Per Minute</Label>
            <Input
              id="perMinute"
              max={1000}
              min={1}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  rateLimit: {
                    ...prev.rateLimit,
                    perMinute: Number.parseInt(e.target.value, 10) || 1,
                  },
                }))
              }
              type="number"
              value={config.rateLimit.perMinute}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="perHour">Per Hour</Label>
            <Input
              id="perHour"
              max={10_000}
              min={1}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  rateLimit: {
                    ...prev.rateLimit,
                    perHour: Number.parseInt(e.target.value, 10) || 1,
                  },
                }))
              }
              type="number"
              value={config.rateLimit.perHour}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="perDay">Per Day</Label>
            <Input
              id="perDay"
              max={100_000}
              min={1}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  rateLimit: {
                    ...prev.rateLimit,
                    perDay: Number.parseInt(e.target.value, 10) || 1,
                  },
                }))
              }
              type="number"
              value={config.rateLimit.perDay}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tools */}
      <Card>
        <CardHeader>
          <CardTitle>Tools</CardTitle>
          <CardDescription>
            Configure which external services are available
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(TOOL_INFO).map(([toolKey, toolInfo]) => {
            const toolName = toolKey as keyof typeof config.tools;
            const tool = config.tools[toolName];

            if (!tool) {
              return null;
            }

            return (
              <div
                className="flex items-start justify-between gap-4 rounded-lg border p-4"
                key={toolName}
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{toolInfo.title}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-sm">
                        {tool.enabled ? "Enabled" : "Disabled"}
                      </span>
                      <Switch
                        checked={tool.enabled}
                        onCheckedChange={(enabled: boolean) =>
                          updateTool(toolName, { enabled })
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label
                      className="text-xs"
                      htmlFor={`${toolName}-description`}
                    >
                      Description
                    </Label>
                    <Input
                      id={`${toolName}-description`}
                      onChange={(e) =>
                        updateTool(toolName, { description: e.target.value })
                      }
                      placeholder={toolInfo.description}
                      value={tool.description}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button disabled={saving} onClick={handleSave}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Configuration
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
