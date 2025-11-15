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

type ToolInputParameter = {
  parameter_name: string;
  parameter_description: string;
};

type ToolConfig = {
  description: string;
  enabled: boolean;
  tool_input?: {
    parameter_name?: string;
    parameter_description?: string;
    [key: string]: ToolInputParameter | string | undefined;
  };
};

type FileTypeConfig = {
  enabled: boolean;
};

type ChatModelAgentConfig = {
  enabled: boolean;
  systemPrompt: string;
  capabilities: {
    fileInput: boolean;
  };
  fileInputTypes: {
    codeFiles: Record<string, FileTypeConfig>;
    textFiles: Record<string, FileTypeConfig>;
    pdf: FileTypeConfig;
    ppt: FileTypeConfig;
    excel: FileTypeConfig;
    images: FileTypeConfig;
  };
  rateLimit: {
    perMinute: number;
    perHour: number;
    perDay: number;
  };
  tools: {
    providerToolsAgent?: ToolConfig;
    documentAgent?: ToolConfig;
    pythonAgent?: ToolConfig;
    mermaidAgent?: ToolConfig;
    gitMcpAgent?: ToolConfig;
  };
};

type ChatModelAgentConfigProps = {
  provider: string;
  initialConfig: ChatModelAgentConfig;
  onSave: (config: ChatModelAgentConfig) => Promise<void>;
};

const TOOL_INFO = {
  providerToolsAgent: {
    title: "Provider Tools Agent",
    description: "Web search, URL analysis, code execution",
  },
  documentAgent: {
    title: "Document Agent",
    description: "Create, update, and manage text documents",
  },
  pythonAgent: {
    title: "Python Agent",
    description: "Create, update, and execute Python code",
  },
  mermaidAgent: {
    title: "Mermaid Agent",
    description: "Create and update Mermaid diagrams",
  },
  gitMcpAgent: {
    title: "GitHub MCP Agent",
    description: "GitHub repository operations and code search",
  },
} as const;

const CODE_FILES = [
  "py",
  "ipynb",
  "js",
  "jsx",
  "ts",
  "tsx",
  "html",
  "css",
  "json",
  "xml",
  "sql",
  "sh",
  "bat",
  "ps1",
];
const TEXT_FILES = [
  "txt",
  "md",
  "yaml",
  "yml",
  "toml",
  "ini",
  "cfg",
  "conf",
  "log",
  "csv",
];

export function ChatModelAgentConfig({
  provider,
  initialConfig,
  onSave,
}: ChatModelAgentConfigProps) {
  const [config, setConfig] = useState<ChatModelAgentConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    fileTypes: false,
    tools: false,
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(config);
      toast.success("Chat model agent configuration saved successfully");

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
            config_type: "chat_model_agent",
            provider,
            agent_enabled: config.enabled,
            file_input_enabled: config.capabilities.fileInput,
            tools_count: Object.keys(config.tools).length,
            enabled_tools: Object.entries(config.tools)
              .filter(([_, toolConfig]) => toolConfig?.enabled)
              .map(([toolName]) => toolName),
          },
          resource_type: "agent_config",
          resource_id: `${provider}_chat_model`,
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
          `Failed to save chat model agent config: ${
            error instanceof Error ? error.message : String(error)
          }`,
          {
            config_type: "chat_model_agent",
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

  const updateToolInputParameter = (
    toolName: keyof typeof config.tools,
    paramKey: string,
    field: "parameter_name" | "parameter_description",
    value: string
  ) => {
    setConfig((prev) => {
      const tool = prev.tools[toolName];
      if (!tool || !tool.tool_input) {
        return prev;
      }

      const isSimpleFormat =
        "parameter_name" in tool.tool_input &&
        typeof tool.tool_input.parameter_name === "string";

      let updatedToolInput;
      if (isSimpleFormat && paramKey === "root") {
        // Simple format: direct parameter_name and parameter_description
        updatedToolInput = {
          ...tool.tool_input,
          [field]: value,
        };
      } else {
        // Complex format: nested parameters
        const param = tool.tool_input[paramKey] as ToolInputParameter;
        updatedToolInput = {
          ...tool.tool_input,
          [paramKey]: {
            ...param,
            [field]: value,
          },
        };
      }

      return {
        ...prev,
        tools: {
          ...prev.tools,
          [toolName]: {
            ...tool,
            tool_input: updatedToolInput,
          },
        },
      };
    });
  };

  const isSimpleToolInput = (toolInput: ToolConfig["tool_input"]): boolean => {
    if (!toolInput) {
      return false;
    }
    return (
      "parameter_name" in toolInput &&
      typeof toolInput.parameter_name === "string"
    );
  };

  const getComplexParameters = (
    toolInput: ToolConfig["tool_input"]
  ): Array<{ key: string; param: ToolInputParameter }> => {
    if (!toolInput || isSimpleToolInput(toolInput)) {
      return [];
    }

    return Object.entries(toolInput)
      .filter(
        ([key]) => key !== "parameter_name" && key !== "parameter_description"
      )
      .map(([key, value]) => ({
        key,
        param: value as ToolInputParameter,
      }));
  };

  const toggleFileType = (category: "codeFiles" | "textFiles", ext: string) => {
    setConfig((prev) => ({
      ...prev,
      fileInputTypes: {
        ...prev.fileInputTypes,
        [category]: {
          ...prev.fileInputTypes[category],
          [ext]: {
            enabled: !prev.fileInputTypes[category][ext]?.enabled,
          },
        },
      },
    }));
  };

  const toggleSpecialFileType = (type: "pdf" | "ppt" | "excel" | "images") => {
    setConfig((prev) => ({
      ...prev,
      fileInputTypes: {
        ...prev.fileInputTypes,
        [type]: {
          enabled: !prev.fileInputTypes[type].enabled,
        },
      },
    }));
  };

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Chat Model Agent ({provider})</CardTitle>
              <CardDescription>
                Configure the main chat agent with file input and tool
                delegation
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

      {/* System Prompt */}
      <Card>
        <CardHeader>
          <CardTitle>System Prompt</CardTitle>
          <CardDescription>
            Define the agent's behavior, personality, and tool usage
            instructions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            className="font-mono text-sm"
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, systemPrompt: e.target.value }))
            }
            placeholder="Enter the system prompt that defines the agent's behavior..."
            rows={20}
            value={config.systemPrompt}
          />
        </CardContent>
      </Card>

      {/* Rate Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Rate Limits</CardTitle>
          <CardDescription>
            Control usage limits for the chat agent
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

      {/* File Input Configuration */}
      <Card>
        <Collapsible
          onOpenChange={() => toggleSection("fileTypes")}
          open={openSections.fileTypes}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CollapsibleTrigger asChild>
                  <Button className="h-6 w-6 p-0" size="sm" variant="ghost">
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${openSections.fileTypes ? "rotate-180" : ""}`}
                    />
                  </Button>
                </CollapsibleTrigger>
                <div>
                  <CardTitle>File Input</CardTitle>
                  <CardDescription>
                    Configure which file types can be uploaded
                  </CardDescription>
                </div>
              </div>
              <Switch
                checked={config.capabilities.fileInput}
                onCheckedChange={(fileInput) =>
                  setConfig((prev) => ({
                    ...prev,
                    capabilities: { ...prev.capabilities, fileInput },
                  }))
                }
              />
            </div>
          </CardHeader>

          <CollapsibleContent>
            <CardContent className="space-y-6 border-t pt-6">
              {/* Code Files */}
              <div className="space-y-3">
                <Label className="font-medium text-sm">Code Files</Label>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                  {CODE_FILES.map((ext) => (
                    <div
                      className="flex items-center space-x-2 rounded-md border px-3 py-2"
                      key={ext}
                    >
                      <Switch
                        checked={
                          config.fileInputTypes.codeFiles[ext]?.enabled || false
                        }
                        id={`code-${ext}`}
                        onCheckedChange={() => toggleFileType("codeFiles", ext)}
                      />
                      <Label
                        className="cursor-pointer font-mono text-xs"
                        htmlFor={`code-${ext}`}
                      >
                        {ext}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Text Files */}
              <div className="space-y-3">
                <Label className="font-medium text-sm">Text Files</Label>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                  {TEXT_FILES.map((ext) => (
                    <div
                      className="flex items-center space-x-2 rounded-md border px-3 py-2"
                      key={ext}
                    >
                      <Switch
                        checked={
                          config.fileInputTypes.textFiles[ext]?.enabled || false
                        }
                        id={`text-${ext}`}
                        onCheckedChange={() => toggleFileType("textFiles", ext)}
                      />
                      <Label
                        className="cursor-pointer font-mono text-xs"
                        htmlFor={`text-${ext}`}
                      >
                        {ext}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Special File Types */}
              <div className="space-y-3">
                <Label className="font-medium text-sm">
                  Document & Media Types
                </Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { key: "pdf", label: "PDF" },
                    { key: "ppt", label: "PowerPoint" },
                    { key: "excel", label: "Excel" },
                    { key: "images", label: "Images" },
                  ].map(({ key, label }) => {
                    const fileType =
                      config.fileInputTypes[
                        key as keyof typeof config.fileInputTypes
                      ];
                    const isEnabled = Boolean(
                      typeof fileType === "object" && "enabled" in fileType
                        ? fileType.enabled
                        : false
                    );
                    return (
                      <div
                        className="flex items-center space-x-2 rounded-md border px-3 py-2"
                        key={key}
                      >
                        <Switch
                          checked={isEnabled as boolean}
                          id={key}
                          onCheckedChange={() =>
                            toggleSpecialFileType(
                              key as "pdf" | "ppt" | "excel" | "images"
                            )
                          }
                        />
                        <Label className="cursor-pointer text-xs" htmlFor={key}>
                          {label}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Delegated Tools */}
      <Card>
        <Collapsible
          onOpenChange={() => toggleSection("tools")}
          open={openSections.tools}
        >
          <CardHeader>
            <div className="flex items-center gap-3">
              <CollapsibleTrigger asChild>
                <Button className="h-6 w-6 p-0" size="sm" variant="ghost">
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${openSections.tools ? "rotate-180" : ""}`}
                  />
                </Button>
              </CollapsibleTrigger>
              <div>
                <CardTitle>Delegated Agent Tools</CardTitle>
                <CardDescription>
                  Configure which specialized agents the chat agent can use
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CollapsibleContent>
            <CardContent className="space-y-4 border-t pt-4">
              {Object.entries(TOOL_INFO).map(([toolKey, toolInfo]) => {
                const toolName = toolKey as keyof typeof config.tools;
                const tool = config.tools[toolName];

                if (!tool) {
                  return null;
                }

                const hasToolInput =
                  tool.tool_input && Object.keys(tool.tool_input).length > 0;
                const isSimple =
                  hasToolInput && isSimpleToolInput(tool.tool_input);
                const complexParams = hasToolInput
                  ? getComplexParameters(tool.tool_input)
                  : [];

                return (
                  <div
                    className="flex items-start justify-between gap-4 rounded-lg border p-4"
                    key={toolName}
                  >
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{toolInfo.title}</h4>
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
                      <div className="space-y-2">
                        <Label
                          className="text-xs"
                          htmlFor={`${String(toolName)}-description`}
                        >
                          Tool Description
                        </Label>
                        <Textarea
                          className="resize-none text-sm"
                          id={`${String(toolName)}-description`}
                          onChange={(e) =>
                            updateTool(toolName, {
                              description: e.target.value,
                            })
                          }
                          placeholder={toolInfo.description}
                          rows={2}
                          value={tool.description}
                        />
                      </div>

                      {/* Tool Input Parameters */}
                      {hasToolInput && (
                        <div className="space-y-3 rounded-md border border-dashed bg-muted/30 p-3">
                          <Label className="font-semibold text-xs">
                            Tool Input Parameters
                          </Label>

                          {isSimple ? (
                            // Simple format: single parameter
                            <div className="space-y-3">
                              <div className="space-y-2">
                                <Label
                                  className="text-muted-foreground text-xs"
                                  htmlFor={`${String(toolName)}-param-name`}
                                >
                                  Parameter Name
                                </Label>
                                <Input
                                  className="font-mono text-sm"
                                  id={`${String(toolName)}-param-name`}
                                  onChange={(e) =>
                                    updateToolInputParameter(
                                      toolName,
                                      "root",
                                      "parameter_name",
                                      e.target.value
                                    )
                                  }
                                  placeholder="e.g., input"
                                  value={tool.tool_input?.parameter_name || ""}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label
                                  className="text-muted-foreground text-xs"
                                  htmlFor={`${String(toolName)}-param-desc`}
                                >
                                  Parameter Description
                                </Label>
                                <Textarea
                                  className="resize-none text-sm"
                                  id={`${String(toolName)}-param-desc`}
                                  onChange={(e) =>
                                    updateToolInputParameter(
                                      toolName,
                                      "root",
                                      "parameter_description",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Description of what this parameter does"
                                  rows={2}
                                  value={
                                    tool.tool_input?.parameter_description || ""
                                  }
                                />
                              </div>
                            </div>
                          ) : (
                            // Complex format: multiple parameters
                            <div className="space-y-4">
                              {complexParams.map(({ key, param }) => (
                                <div
                                  className="space-y-3 rounded-md border bg-background p-3"
                                  key={key}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-semibold text-primary text-xs">
                                      {key}
                                    </span>
                                  </div>
                                  <div className="space-y-2">
                                    <Label
                                      className="text-muted-foreground text-xs"
                                      htmlFor={`${String(toolName)}-${key}-name`}
                                    >
                                      Parameter Name
                                    </Label>
                                    <Input
                                      className="font-mono text-sm"
                                      id={`${String(toolName)}-${key}-name`}
                                      onChange={(e) =>
                                        updateToolInputParameter(
                                          toolName,
                                          key,
                                          "parameter_name",
                                          e.target.value
                                        )
                                      }
                                      placeholder="e.g., operation, instruction"
                                      value={param.parameter_name || ""}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label
                                      className="text-muted-foreground text-xs"
                                      htmlFor={`${String(toolName)}-${key}-desc`}
                                    >
                                      Parameter Description
                                    </Label>
                                    <Textarea
                                      className="resize-none text-sm"
                                      id={`${String(toolName)}-${key}-desc`}
                                      onChange={(e) =>
                                        updateToolInputParameter(
                                          toolName,
                                          key,
                                          "parameter_description",
                                          e.target.value
                                        )
                                      }
                                      placeholder="Description of what this parameter does"
                                      rows={2}
                                      value={param.parameter_description || ""}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
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
