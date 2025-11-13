"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ToolConfig {
  description: string;
  enabled: boolean;
  systemPrompt?: string;
  userPromptTemplate?: string;
}

interface PythonAgentConfig {
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
    explain?: ToolConfig;
    generate?: ToolConfig;
    revert?: ToolConfig;
  };
}

interface PythonAgentConfigProps {
  provider: string;
  initialConfig: PythonAgentConfig;
  onSave: (config: PythonAgentConfig) => Promise<void>;
}

const TOOL_INFO = {
  create: {
    title: "Create Code",
    description: "Creates new Python code with proper structure and documentation",
    hasPrompts: true,
  },
  update: {
    title: "Update Code",
    description: "Edits and updates existing Python code based on instructions",
    hasPrompts: true,
  },
  fix: {
    title: "Fix Code",
    description: "Debugs and fixes errors in Python code",
    hasPrompts: true,
  },
  explain: {
    title: "Explain Code",
    description: "Adds comments and documentation to Python code",
    hasPrompts: true,
  },
  generate: {
    title: "Generate Code",
    description: "Generates Python code without saving (for chat-only mode)",
    hasPrompts: true,
  },
  revert: {
    title: "Revert Code",
    description: "Reverts Python code to a previous version",
    hasPrompts: false,
  },
} as const;

export function PythonAgentConfigV2({ provider, initialConfig, onSave }: PythonAgentConfigProps) {
  const [config, setConfig] = useState<PythonAgentConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [openTools, setOpenTools] = useState<Record<string, boolean>>({});

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(config);
      toast.success("Python agent configuration saved successfully");
    } catch (error) {
      toast.error("Failed to save configuration");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const updateTool = (toolName: keyof typeof config.tools, updates: Partial<ToolConfig>) => {
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
              <CardTitle>Python Agent ({provider})</CardTitle>
              <CardDescription>
                Configure Python code creation, editing, and execution tools
              </CardDescription>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(enabled) => setConfig((prev) => ({ ...prev, enabled }))}
            />
          </div>
        </CardHeader>
      </Card>

      {/* Rate Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Rate Limits</CardTitle>
          <CardDescription>Control usage limits for the Python agent</CardDescription>
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
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Tools</h3>
        {Object.entries(TOOL_INFO).map(([toolKey, toolInfo]) => {
          const toolName = toolKey as keyof typeof config.tools;
          const tool = config.tools[toolName];

          if (!tool) return null;

          return (
            <Card key={toolName}>
              <Collapsible open={openTools[toolName]} onOpenChange={() => toggleTool(toolName)}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${
                                openTools[toolName] ? "rotate-180" : ""
                              }`}
                            />
                          </Button>
                        </CollapsibleTrigger>
                        <div>
                          <CardTitle className="text-base">{toolInfo.title}</CardTitle>
                          <CardDescription className="text-sm">{tool.description}</CardDescription>
                        </div>
                      </div>
                    </div>
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
                </CardHeader>

                <CollapsibleContent>
                  <CardContent className="space-y-4 border-t pt-4">
                    {/* Description */}
                    <div className="space-y-2">
                      <Label htmlFor={`${toolName}-description`}>Description</Label>
                      <Textarea
                        id={`${toolName}-description`}
                        value={tool.description}
                        onChange={(e) => updateTool(toolName, { description: e.target.value })}
                        rows={2}
                        className="resize-none"
                      />
                    </div>

                    {/* System Prompt (if applicable) */}
                    {toolInfo.hasPrompts && tool.systemPrompt !== undefined && (
                      <div className="space-y-2">
                        <Label htmlFor={`${toolName}-systemPrompt`}>System Prompt</Label>
                        <Textarea
                          id={`${toolName}-systemPrompt`}
                          value={tool.systemPrompt}
                          onChange={(e) => updateTool(toolName, { systemPrompt: e.target.value })}
                          rows={8}
                          className="font-mono text-sm"
                          placeholder="Enter the system prompt that defines the tool's behavior..."
                        />
                      </div>
                    )}

                    {/* User Prompt Template (if applicable) */}
                    {toolInfo.hasPrompts && tool.userPromptTemplate !== undefined && (
                      <div className="space-y-2">
                        <Label htmlFor={`${toolName}-userPromptTemplate`}>User Prompt Template</Label>
                        <Textarea
                          id={`${toolName}-userPromptTemplate`}
                          value={tool.userPromptTemplate}
                          onChange={(e) => updateTool(toolName, { userPromptTemplate: e.target.value })}
                          rows={4}
                          className="font-mono text-sm"
                          placeholder="Enter the user prompt template with placeholders like {currentContent}..."
                        />
                        <p className="text-xs text-muted-foreground">
                          Available placeholders: {"{currentContent}"}, {"{updateInstruction}"}, {"{errorInfo}"}
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
