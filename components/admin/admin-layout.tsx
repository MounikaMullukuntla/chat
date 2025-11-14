"use client";

import {
  ArrowLeft,
  Brain,
  Code,
  FileText,
  GitBranch,
  MessageSquare,
  Palette,
  Workflow,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChatModelAgentConfig } from "./agents/chat-model/chat-model-agent-config";
import { DocumentAgentConfig } from "./agents/document/document-agent-config";
import { GitMcpAgentConfig } from "./agents/git-mcp/git-mcp-agent-config";
import { MermaidAgentConfig } from "./agents/mermaid/mermaid-agent-config";
import { ProviderToolsAgentConfig } from "./agents/provider-tools/provider-tools-agent-config";
import { PythonAgentConfig } from "./agents/python/python-agent-config";

type AdminLayoutProps = {
  provider: string;
  children?: React.ReactNode;
};

type AgentTab = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  configKey: string;
};

// Provider metadata
const PROVIDER_INFO = {
  google: {
    name: "Google AI",
    icon: Brain,
    description: "Gemini models for advanced AI capabilities",
  },
  openai: {
    name: "OpenAI",
    icon: Zap,
    description: "GPT models for conversational AI",
  },
  anthropic: {
    name: "Anthropic",
    icon: Brain,
    description: "Claude models for reasoning and analysis",
  },
} as const;

// Generate agent tabs dynamically based on provider
const generateAgentTabs = (provider: string): AgentTab[] => [
  {
    id: "chat-model-agent",
    label: "Chat Model Agent",
    icon: MessageSquare,
    description: "Primary conversational agent",
    configKey: `chat_model_agent_${provider}`,
  },
  {
    id: "provider-tools-agent",
    label: "Provider Tools Agent",
    icon: Workflow,
    description: "External APIs and services",
    configKey: `provider_tools_agent_${provider}`,
  },
  {
    id: "document-agent",
    label: "Document Agent",
    icon: FileText,
    description: "Document creation and editing",
    configKey: `document_agent_${provider}`,
  },
  {
    id: "python-agent",
    label: "Python Agent",
    icon: Code,
    description: "Python code generation",
    configKey: `python_agent_${provider}`,
  },
  {
    id: "mermaid-agent",
    label: "Mermaid Agent",
    icon: Palette,
    description: "Diagram creation",
    configKey: `mermaid_agent_${provider}`,
  },
  {
    id: "git-mcp-agent",
    label: "Git MCP Agent",
    icon: GitBranch,
    description: "GitHub integration",
    configKey: `git_mcp_agent_${provider}`,
  },
];

export function AdminLayout({ provider, children }: AdminLayoutProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("chat-model-agent");
  const [agentTabs, setAgentTabs] = useState<AgentTab[]>([]);
  const [configs, setConfigs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  // Generate tabs based on provider
  useEffect(() => {
    setAgentTabs(generateAgentTabs(provider));
  }, [provider]);

  // Load all agent configurations
  useEffect(() => {
    const loadConfigs = async () => {
      setLoading(true);
      try {
        const tabs = generateAgentTabs(provider);
        const configData: Record<string, any> = {};

        for (const tab of tabs) {
          const response = await fetch(`/api/admin/config/${tab.configKey}`);
          if (response.ok) {
            const data = await response.json();
            configData[tab.configKey] = data.configData;
          }
        }

        setConfigs(configData);
      } catch (error) {
        console.error("Failed to load configs:", error);
        toast.error("Failed to load agent configurations");
      } finally {
        setLoading(false);
      }
    };

    loadConfigs();
  }, [provider]);

  // Save handler for agent configurations
  const handleSaveConfig = async (configKey: string, configData: any) => {
    try {
      const response = await fetch(`/api/admin/config/${configKey}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configData }),
      });

      if (!response.ok) {
        throw new Error("Failed to save configuration");
      }

      // Update local state
      setConfigs((prev) => ({ ...prev, [configKey]: configData }));
    } catch (error) {
      console.error("Save error:", error);
      throw error;
    }
  };

  const providerInfo = PROVIDER_INFO[provider as keyof typeof PROVIDER_INFO];
  const ProviderIcon = providerInfo?.icon || Brain;

  const handleBackToDashboard = () => {
    router.push("/admin");
  };

  if (!providerInfo) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-7xl text-center">
          <h1 className="mb-4 font-bold text-2xl text-red-600">
            Invalid Provider
          </h1>
          <p className="mb-6 text-gray-600 dark:text-gray-400">
            The provider "{provider}" is not supported.
          </p>
          <Button onClick={handleBackToDashboard}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-7xl">
        {/* Page Header */}
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-2">
            <Button onClick={handleBackToDashboard} size="sm" variant="ghost">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Dashboard
            </Button>
            <span className="text-gray-400">|</span>
            <Button
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              onClick={() => router.push("/chat")}
              size="sm"
              variant="ghost"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to Chat
            </Button>
          </div>
          <div className="mb-2 flex items-center gap-3">
            <ProviderIcon className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="font-bold text-3xl text-gray-900 dark:text-white">
                {providerInfo.name} Configuration
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {providerInfo.description}
              </p>
            </div>
          </div>
        </div>

        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="mb-6 flex">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <button
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                onClick={handleBackToDashboard}
              >
                Admin
              </button>
            </li>
            <li>
              <div className="flex items-center">
                <span className="mx-2 text-gray-400">/</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {providerInfo.name}
                </span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Provider Info Card */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ProviderIcon className="h-6 w-6 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {providerInfo.name}
                  </h3>
                  <p className="text-gray-600 text-sm dark:text-gray-400">
                    Configure all AI agents for this provider
                  </p>
                </div>
              </div>
              <Badge className="font-mono text-xs" variant="outline">
                Provider: {provider}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Tabs
          className="space-y-6"
          onValueChange={setActiveTab}
          value={activeTab}
        >
          {/* Tab Navigation */}
          <Card>
            <CardContent className="p-6">
              <TabsList className="grid h-auto w-full grid-cols-3 gap-2 p-1 lg:grid-cols-6">
                {agentTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger
                      className="flex h-auto flex-col items-center gap-2 p-4 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900/20 dark:data-[state=active]:text-blue-300"
                      key={tab.id}
                      value={tab.id}
                    >
                      <Icon className="h-5 w-5" />
                      <div className="text-center">
                        <div className="font-medium text-sm">{tab.label}</div>
                        <div className="mt-1 text-gray-500 text-xs dark:text-gray-400">
                          {tab.description}
                        </div>
                      </div>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </CardContent>
          </Card>

          {/* Tab Content */}
          {loading ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="text-gray-500">Loading configurations...</div>
              </CardContent>
            </Card>
          ) : (
            agentTabs.map((tab) => {
              const config = configs[tab.configKey];
              if (!config) {
                return null;
              }

              return (
                <TabsContent className="space-y-6" key={tab.id} value={tab.id}>
                  {tab.id === "chat-model-agent" && (
                    <ChatModelAgentConfig
                      initialConfig={config}
                      onSave={(cfg: any) =>
                        handleSaveConfig(tab.configKey, cfg)
                      }
                      provider={provider}
                    />
                  )}
                  {tab.id === "provider-tools-agent" && (
                    <ProviderToolsAgentConfig
                      initialConfig={config}
                      onSave={(cfg: any) =>
                        handleSaveConfig(tab.configKey, cfg)
                      }
                      provider={provider}
                    />
                  )}
                  {tab.id === "document-agent" && (
                    <DocumentAgentConfig
                      initialConfig={config}
                      onSave={(cfg: any) =>
                        handleSaveConfig(tab.configKey, cfg)
                      }
                      provider={provider}
                    />
                  )}
                  {tab.id === "python-agent" && (
                    <PythonAgentConfig
                      initialConfig={config}
                      onSave={(cfg: any) =>
                        handleSaveConfig(tab.configKey, cfg)
                      }
                      provider={provider}
                    />
                  )}
                  {tab.id === "mermaid-agent" && (
                    <MermaidAgentConfig
                      initialConfig={config}
                      onSave={(cfg: any) =>
                        handleSaveConfig(tab.configKey, cfg)
                      }
                      provider={provider}
                    />
                  )}
                  {tab.id === "git-mcp-agent" && (
                    <GitMcpAgentConfig
                      initialConfig={config}
                      onSave={(cfg: any) =>
                        handleSaveConfig(tab.configKey, cfg)
                      }
                      provider={provider}
                    />
                  )}
                </TabsContent>
              );
            })
          )}
        </Tabs>

        {/* Custom children content if provided */}
        {children}
      </div>
    </div>
  );
}
