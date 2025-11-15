"use client";

import { ChevronDown, Loader2, Save } from "lucide-react";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type ToolConfig = {
  description: string;
  enabled: boolean;
  systemPrompt?: string;
  userPromptTemplate?: string;
};

type MermaidAgentConfig = {
  enabled: boolean;
  rateLimit: {
    perMinute: number;
    perHour: number;
    perDay: number;
  };
  tools: {
    create?: ToolConfig;
    update?: ToolConfig;
    fix?: ToolConfig;
    generate?: ToolConfig;
    revert?: ToolConfig;
  };
};

type MermaidAgentConfigProps = {
  provider: string;
  initialConfig: MermaidAgentConfig;
  onSave: (config: MermaidAgentConfig) => Promise<void>;
};

const TOOL_INFO = {
  create: {
    title: "Create Diagram",
    description: "Creates new Mermaid diagrams with valid syntax",
    hasPrompts: true,
  },
  update: {
    title: "Update Diagram",
    description: "Updates existing Mermaid diagrams based on instructions",
    hasPrompts: true,
  },
  fix: {
    title: "Fix Diagram",
    description: "Fixes syntax errors in Mermaid diagrams",
    hasPrompts: true,
  },
  generate: {
    title: "Generate Diagram",
    description:
      "Generates Mermaid diagrams without saving (for chat-only mode)",
    hasPrompts: true,
  },
  revert: {
    title: "Revert Diagram",
    description: "Reverts Mermaid diagrams to previous versions",
    hasPrompts: false,
  },
} as const;

export function MermaidAgentConfig({
  provider,
  initialConfig,
  onSave,
}: MermaidAgentConfigProps) {
  const [config, setConfig] = useState<MermaidAgentConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [openTools, setOpenTools] = useState<Record<string, boolean>>({});

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(config);
      toast.success("Mermaid agent configuration saved successfully");

      // Log successful configuration update
      try {
        const {
          logUserActivity,
          UserActivityType,
          ActivityCategory,
        } = await import("@/lib/logging");

        void logUserActivity({
          user_id: "", // Will be populated from session
          activity_type: UserActivityType.ADMIN_CONFIG_UPDATE,
          activity_category: ActivityCategory.ADMIN,
          activity_metadata: {
            config_type: "mermaid_agent",
            provider,
            agent_enabled: config.enabled,
            tools_count: Object.keys(config.tools).length,
            enabled_tools: Object.entries(config.tools)
              .filter(([_, toolConfig]) => toolConfig?.enabled)
              .map(([toolName]) => toolName),
          },
          resource_type: "agent_config",
          resource_id: `${provider}_mermaid`,
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
        const {
          logAdminError,
          ErrorCategory,
          ErrorSeverity,
        } = await import("@/lib/errors/logger");

        void logAdminError(
          ErrorCategory.CONFIG_UPDATE_FAILED,
          `Failed to save mermaid agent config: ${
            error instanceof Error ? error.message : String(error)
          }`,
          {
            config_type: "mermaid_agent",
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
    updates: Partial<ToolConfig>
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

  const toggleTool = (toolName: keyof typeof config.tools) => {
    setOpenTools((prev) => ({ ...prev, [toolName]: !prev[toolName] }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Mermaid Agent ({provider})</CardTitle>
              <CardDescription>
                Configure Mermaid diagram creation and editing tools
              </CardDescription>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(enabled) =>
                setConfig((prev) => ({ ...prev, enabled }))
              }
            />
          </div>
        </CardHeader>
      </Card>

      {/* Rate Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Rate Limits</CardTitle>
          <CardDescription>
            Control usage limits for the Mermaid agent
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
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Tools</h3>
        {Object.entries(TOOL_INFO).map(([toolKey, toolInfo]) => {
          const toolName = toolKey as keyof typeof config.tools;
          const tool = config.tools[toolName];

          if (!tool) {
            return null;
          }

          return (
            <Card key={toolName}>
              <Collapsible
                onOpenChange={() => toggleTool(toolName)}
                open={openTools[toolName]}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <CollapsibleTrigger asChild>
                          <Button
                            className="h-6 w-6 p-0"
                            size="sm"
                            variant="ghost"
                          >
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${
                                openTools[toolName] ? "rotate-180" : ""
                              }`}
                            />
                          </Button>
                        </CollapsibleTrigger>
                        <div>
                          <CardTitle className="text-base">
                            {toolInfo.title}
                          </CardTitle>
                          <CardDescription className="text-sm">
                            {tool.description}
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-sm">
                        {tool.enabled ? "Enabled" : "Disabled"}
                      </span>
                      <Switch
                        checked={tool.enabled}
                        onCheckedChange={(enabled) =>
                          updateTool(toolName, { enabled })
                        }
                      />
                    </div>
                  </div>
                </CardHeader>

                <CollapsibleContent>
                  <CardContent className="space-y-4 border-t pt-4">
                    {/* Description */}
                    <div className="space-y-2">
                      <Label htmlFor={`${toolName}-description`}>
                        Description
                      </Label>
                      <Textarea
                        className="resize-none"
                        id={`${toolName}-description`}
                        onChange={(e) =>
                          updateTool(toolName, { description: e.target.value })
                        }
                        rows={2}
                        value={tool.description}
                      />
                    </div>

                    {/* System Prompt (if applicable) */}
                    {toolInfo.hasPrompts && tool.systemPrompt !== undefined && (
                      <div className="space-y-2">
                        <Label htmlFor={`${toolName}-systemPrompt`}>
                          System Prompt
                        </Label>
                        <Textarea
                          className="font-mono text-sm"
                          id={`${toolName}-systemPrompt`}
                          onChange={(e) =>
                            updateTool(toolName, {
                              systemPrompt: e.target.value,
                            })
                          }
                          placeholder="Enter the system prompt that defines the tool's behavior..."
                          rows={8}
                          value={tool.systemPrompt}
                        />
                      </div>
                    )}

                    {/* User Prompt Template (if applicable) */}
                    {toolInfo.hasPrompts &&
                      tool.userPromptTemplate !== undefined && (
                        <div className="space-y-2">
                          <Label htmlFor={`${toolName}-userPromptTemplate`}>
                            User Prompt Template
                          </Label>
                          <Textarea
                            className="font-mono text-sm"
                            id={`${toolName}-userPromptTemplate`}
                            onChange={(e) =>
                              updateTool(toolName, {
                                userPromptTemplate: e.target.value,
                              })
                            }
                            placeholder="Enter the user prompt template with placeholders..."
                            rows={4}
                            value={tool.userPromptTemplate}
                          />
                          <p className="text-muted-foreground text-xs">
                            Available placeholders: {"{currentContent}"},{" "}
                            {"{updateInstruction}"}, {"{errorInfo}"}
                          </p>
                        </div>
                      )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>

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
