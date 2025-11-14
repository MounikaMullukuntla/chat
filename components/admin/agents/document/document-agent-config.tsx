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

type DocumentAgentConfig = {
  enabled: boolean;
  rateLimit: {
    perMinute: number;
    perHour: number;
    perDay: number;
  };
  tools: {
    create?: ToolConfig;
    update?: ToolConfig;
    suggestion?: ToolConfig;
    revert?: ToolConfig;
  };
};

type DocumentAgentConfigProps = {
  provider: string;
  initialConfig: DocumentAgentConfig;
  onSave: (config: DocumentAgentConfig) => Promise<void>;
};

const TOOL_INFO = {
  create: {
    title: "Create Document",
    description: "Creates new text documents with markdown formatting",
    hasPrompts: true,
  },
  update: {
    title: "Update Document",
    description: "Updates existing text documents based on instructions",
    hasPrompts: true,
  },
  suggestion: {
    title: "Document Suggestions",
    description: "Generates improvement suggestions for existing documents",
    hasPrompts: true,
  },
  revert: {
    title: "Revert Document",
    description: "Reverts documents to previous versions",
    hasPrompts: false,
  },
} as const;

export function DocumentAgentConfig({
  provider,
  initialConfig,
  onSave,
}: DocumentAgentConfigProps) {
  const [config, setConfig] = useState<DocumentAgentConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [openTools, setOpenTools] = useState<Record<string, boolean>>({});

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(config);
      toast.success("Document agent configuration saved successfully");
    } catch (error) {
      toast.error("Failed to save configuration");
      console.error(error);
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
              <CardTitle>Document Agent ({provider})</CardTitle>
              <CardDescription>
                Configure document creation, editing, and management tools
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
            Control usage limits for the document agent
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
                            placeholder="Enter the user prompt template with placeholders like {currentContent}..."
                            rows={4}
                            value={tool.userPromptTemplate}
                          />
                          <p className="text-muted-foreground text-xs">
                            Available placeholders: {"{currentContent}"},{" "}
                            {"{updateInstruction}"}, {"{instruction}"}
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
