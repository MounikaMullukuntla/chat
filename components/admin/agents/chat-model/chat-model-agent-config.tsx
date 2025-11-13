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
  tool_input?: Record<string, any>;
}

interface FileTypeConfig {
  enabled: boolean;
}

interface ChatModelAgentConfig {
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
}

interface ChatModelAgentConfigProps {
  provider: string;
  initialConfig: ChatModelAgentConfig;
  onSave: (config: ChatModelAgentConfig) => Promise<void>;
}

const TOOL_INFO = {
  providerToolsAgent: { title: "Provider Tools Agent", description: "Web search, URL analysis, code execution" },
  documentAgent: { title: "Document Agent", description: "Create, update, and manage text documents" },
  pythonAgent: { title: "Python Agent", description: "Create, update, and execute Python code" },
  mermaidAgent: { title: "Mermaid Agent", description: "Create and update Mermaid diagrams" },
  gitMcpAgent: { title: "GitHub MCP Agent", description: "GitHub repository operations and code search" },
} as const;

const CODE_FILES = ["py", "ipynb", "js", "jsx", "ts", "tsx", "html", "css", "json", "xml", "sql", "sh", "bat", "ps1"];
const TEXT_FILES = ["txt", "md", "yaml", "yml", "toml", "ini", "cfg", "conf", "log", "csv"];

export function ChatModelAgentConfig({ provider, initialConfig, onSave }: ChatModelAgentConfigProps) {
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
                Configure the main chat agent with file input and tool delegation
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
          <CardDescription>Define the agent's behavior, personality, and tool usage instructions</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={config.systemPrompt}
            onChange={(e) => setConfig((prev) => ({ ...prev, systemPrompt: e.target.value }))}
            rows={20}
            className="font-mono text-sm"
            placeholder="Enter the system prompt that defines the agent's behavior..."
          />
        </CardContent>
      </Card>

      {/* Rate Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Rate Limits</CardTitle>
          <CardDescription>Control usage limits for the chat agent</CardDescription>
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

      {/* File Input Configuration */}
      <Card>
        <Collapsible open={openSections.fileTypes} onOpenChange={() => toggleSection("fileTypes")}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${openSections.fileTypes ? "rotate-180" : ""}`}
                    />
                  </Button>
                </CollapsibleTrigger>
                <div>
                  <CardTitle>File Input</CardTitle>
                  <CardDescription>Configure which file types can be uploaded</CardDescription>
                </div>
              </div>
              <Switch
                checked={config.capabilities.fileInput}
                onCheckedChange={(fileInput) =>
                  setConfig((prev) => ({ ...prev, capabilities: { ...prev.capabilities, fileInput } }))
                }
              />
            </div>
          </CardHeader>

          <CollapsibleContent>
            <CardContent className="space-y-6 border-t pt-6">
              {/* Code Files */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Code Files</Label>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                  {CODE_FILES.map((ext) => (
                    <div key={ext} className="flex items-center space-x-2 rounded-md border px-3 py-2">
                      <Switch
                        id={`code-${ext}`}
                        checked={config.fileInputTypes.codeFiles[ext]?.enabled || false}
                        onCheckedChange={() => toggleFileType("codeFiles", ext)}
                      />
                      <Label htmlFor={`code-${ext}`} className="text-xs font-mono cursor-pointer">
                        {ext}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Text Files */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Text Files</Label>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                  {TEXT_FILES.map((ext) => (
                    <div key={ext} className="flex items-center space-x-2 rounded-md border px-3 py-2">
                      <Switch
                        id={`text-${ext}`}
                        checked={config.fileInputTypes.textFiles[ext]?.enabled || false}
                        onCheckedChange={() => toggleFileType("textFiles", ext)}
                      />
                      <Label htmlFor={`text-${ext}`} className="text-xs font-mono cursor-pointer">
                        {ext}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Special File Types */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Document & Media Types</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { key: "pdf", label: "PDF" },
                    { key: "ppt", label: "PowerPoint" },
                    { key: "excel", label: "Excel" },
                    { key: "images", label: "Images" },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center space-x-2 rounded-md border px-3 py-2">
                      <Switch
                        id={key}
                        checked={config.fileInputTypes[key as keyof typeof config.fileInputTypes].enabled || false}
                        onCheckedChange={() => toggleSpecialFileType(key as "pdf" | "ppt" | "excel" | "images")}
                      />
                      <Label htmlFor={key} className="text-xs cursor-pointer">
                        {label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Delegated Tools */}
      <Card>
        <Collapsible open={openSections.tools} onOpenChange={() => toggleSection("tools")}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${openSections.tools ? "rotate-180" : ""}`}
                  />
                </Button>
              </CollapsibleTrigger>
              <div>
                <CardTitle>Delegated Agent Tools</CardTitle>
                <CardDescription>Configure which specialized agents the chat agent can use</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CollapsibleContent>
            <CardContent className="space-y-4 border-t pt-4">
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
                        <Textarea
                          id={`${toolName}-description`}
                          value={tool.description}
                          onChange={(e) => updateTool(toolName, { description: e.target.value })}
                          rows={2}
                          className="resize-none text-sm"
                          placeholder={toolInfo.description}
                        />
                      </div>
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
