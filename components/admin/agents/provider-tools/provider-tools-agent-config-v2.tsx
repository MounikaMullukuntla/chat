"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SimpleToolConfig {
  description: string;
  enabled: boolean;
}

interface ProviderToolsAgentConfig {
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
}

interface ProviderToolsAgentConfigProps {
  provider: string;
  initialConfig: ProviderToolsAgentConfig;
  onSave: (config: ProviderToolsAgentConfig) => Promise<void>;
}

const TOOL_INFO = {
  googleSearch: { title: "Google Search", description: "Search the web for current information and real-time data" },
  urlContext: { title: "URL Context", description: "Fetch and analyze content from web pages and documents" },
  codeExecution: { title: "Code Execution", description: "Execute Python code and return results with output" },
} as const;

export function ProviderToolsAgentConfigV2({ provider, initialConfig, onSave }: ProviderToolsAgentConfigProps) {
  const [config, setConfig] = useState<ProviderToolsAgentConfig>(initialConfig);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(config);
      toast.success("Provider tools agent configuration saved successfully");
    } catch (error) {
      toast.error("Failed to save configuration");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const updateTool = (toolName: keyof typeof config.tools, updates: Partial<SimpleToolConfig>) => {
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
              onCheckedChange={(enabled) => setConfig((prev) => ({ ...prev, enabled }))}
            />
          </div>
        </CardHeader>
      </Card>

      {/* System Prompt */}
      <Card>
        <CardHeader>
          <CardTitle>System Prompt</CardTitle>
          <CardDescription>Define the agent's behavior and instructions</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={config.systemPrompt}
            onChange={(e) => setConfig((prev) => ({ ...prev, systemPrompt: e.target.value }))}
            rows={6}
            className="font-mono text-sm"
            placeholder="Enter the system prompt that defines the agent's behavior..."
          />
        </CardContent>
      </Card>

      {/* Rate Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Rate Limits</CardTitle>
          <CardDescription>Control usage limits for the provider tools agent</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="perMinute">Per Minute</Label>
            <Input
              id="perMinute"
              type="number"
              min={1}
              max={1000}
              value={config.rateLimit.perMinute}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  rateLimit: { ...prev.rateLimit, perMinute: parseInt(e.target.value) || 1 },
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="perHour">Per Hour</Label>
            <Input
              id="perHour"
              type="number"
              min={1}
              max={10000}
              value={config.rateLimit.perHour}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  rateLimit: { ...prev.rateLimit, perHour: parseInt(e.target.value) || 1 },
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="perDay">Per Day</Label>
            <Input
              id="perDay"
              type="number"
              min={1}
              max={100000}
              value={config.rateLimit.perDay}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  rateLimit: { ...prev.rateLimit, perDay: parseInt(e.target.value) || 1 },
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Tools */}
      <Card>
        <CardHeader>
          <CardTitle>Tools</CardTitle>
          <CardDescription>Configure which external services are available</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(TOOL_INFO).map(([toolKey, toolInfo]) => {
            const toolName = toolKey as keyof typeof config.tools;
            const tool = config.tools[toolName];

            if (!tool) return null;

            return (
              <div key={toolName} className="flex items-start justify-between gap-4 rounded-lg border p-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{toolInfo.title}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {tool.enabled ? "Enabled" : "Disabled"}
                      </span>
                      <Switch
                        checked={tool.enabled}
                        onCheckedChange={(enabled) => updateTool(toolName, { enabled })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${toolName}-description`} className="text-xs">
                      Description
                    </Label>
                    <Input
                      id={`${toolName}-description`}
                      value={tool.description}
                      onChange={(e) => updateTool(toolName, { description: e.target.value })}
                      placeholder={toolInfo.description}
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
        <Button onClick={handleSave} disabled={saving}>
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
