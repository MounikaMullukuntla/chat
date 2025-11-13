'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  MessageSquare, 
  FileText, 
  Code, 
  GitBranch, 
  Workflow,
  Palette,
  ArrowLeft,
  Brain,
  Zap
} from 'lucide-react'
import { ChatModelAgentConfigV2 as ChatModelAgentConfig } from './agents/chat-model/chat-model-agent-config'
import { ProviderToolsAgentConfigV2 as ProviderToolsAgentConfig } from './agents/provider-tools/provider-tools-agent-config'
import { DocumentAgentConfigV2 as DocumentAgentConfig } from './agents/document/document-agent-config'
import { PythonAgentConfigV2 as PythonAgentConfig } from './agents/python/python-agent-config'
import { MermaidAgentConfigV2 as MermaidAgentConfig } from './agents/mermaid/mermaid-agent-config'
import { GitMcpAgentConfigV2 as GitMcpAgentConfig } from './agents/git-mcp/git-mcp-agent-config'
import { toast } from 'sonner'

interface AdminLayoutProps {
  provider: string
  children?: React.ReactNode
}

interface AgentTab {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  configKey: string
}

// Provider metadata
const PROVIDER_INFO = {
  google: {
    name: 'Google AI',
    icon: Brain,
    description: 'Gemini models for advanced AI capabilities'
  },
  openai: {
    name: 'OpenAI',
    icon: Zap,
    description: 'GPT models for conversational AI'
  },
  anthropic: {
    name: 'Anthropic',
    icon: Brain,
    description: 'Claude models for reasoning and analysis'
  }
} as const

// Generate agent tabs dynamically based on provider
const generateAgentTabs = (provider: string): AgentTab[] => [
  {
    id: 'chat-model-agent',
    label: 'Chat Model Agent',
    icon: MessageSquare,
    description: 'Primary conversational agent',
    configKey: `chat_model_agent_${provider}`
  },
  {
    id: 'provider-tools-agent',
    label: 'Provider Tools Agent',
    icon: Workflow,
    description: 'External APIs and services',
    configKey: `provider_tools_agent_${provider}`
  },
  {
    id: 'document-agent',
    label: 'Document Agent',
    icon: FileText,
    description: 'Document creation and editing',
    configKey: `document_agent_${provider}`
  },
  {
    id: 'python-agent',
    label: 'Python Agent',
    icon: Code,
    description: 'Python code generation',
    configKey: `python_agent_${provider}`
  },
  {
    id: 'mermaid-agent',
    label: 'Mermaid Agent',
    icon: Palette,
    description: 'Diagram creation',
    configKey: `mermaid_agent_${provider}`
  },
  {
    id: 'git-mcp-agent',
    label: 'Git MCP Agent',
    icon: GitBranch,
    description: 'GitHub integration',
    configKey: `git_mcp_agent_${provider}`
  }
]

export function AdminLayout({ provider, children }: AdminLayoutProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('chat-model-agent')
  const [agentTabs, setAgentTabs] = useState<AgentTab[]>([])
  const [configs, setConfigs] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)

  // Generate tabs based on provider
  useEffect(() => {
    setAgentTabs(generateAgentTabs(provider))
  }, [provider])

  // Load all agent configurations
  useEffect(() => {
    const loadConfigs = async () => {
      setLoading(true)
      try {
        const tabs = generateAgentTabs(provider)
        const configData: Record<string, any> = {}

        for (const tab of tabs) {
          const response = await fetch(`/api/admin/config/${tab.configKey}`)
          if (response.ok) {
            const data = await response.json()
            configData[tab.configKey] = data.configData
          }
        }

        setConfigs(configData)
      } catch (error) {
        console.error('Failed to load configs:', error)
        toast.error('Failed to load agent configurations')
      } finally {
        setLoading(false)
      }
    }

    loadConfigs()
  }, [provider])

  // Save handler for agent configurations
  const handleSaveConfig = async (configKey: string, configData: any) => {
    try {
      const response = await fetch(`/api/admin/config/${configKey}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configData }),
      })

      if (!response.ok) {
        throw new Error('Failed to save configuration')
      }

      // Update local state
      setConfigs(prev => ({ ...prev, [configKey]: configData }))
    } catch (error) {
      console.error('Save error:', error)
      throw error
    }
  }

  const providerInfo = PROVIDER_INFO[provider as keyof typeof PROVIDER_INFO]
  const ProviderIcon = providerInfo?.icon || Brain

  const handleBackToDashboard = () => {
    router.push('/admin')
  }

  if (!providerInfo) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Invalid Provider
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The provider "{provider}" is not supported.
          </p>
          <Button onClick={handleBackToDashboard}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToDashboard}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Dashboard
            </Button>
            <span className="text-gray-400">|</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/chat')}
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Chat
            </Button>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <ProviderIcon className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {providerInfo.name} Configuration
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {providerInfo.description}
              </p>
            </div>
          </div>
        </div>

        {/* Breadcrumbs */}
        <nav className="flex mb-6" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <button
                onClick={handleBackToDashboard}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Admin
              </button>
            </li>
            <li>
              <div className="flex items-center">
                <span className="mx-2 text-gray-400">/</span>
                <span className="text-gray-900 dark:text-white font-medium">
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
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Configure all AI agents for this provider
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                Provider: {provider}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Tab Navigation */}
          <Card>
            <CardContent className="p-6">
              <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 gap-2 h-auto p-1">
                {agentTabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="flex flex-col items-center gap-2 p-4 h-auto data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900/20 dark:data-[state=active]:text-blue-300"
                    >
                      <Icon className="h-5 w-5" />
                      <div className="text-center">
                        <div className="font-medium text-sm">{tab.label}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {tab.description}
                        </div>
                      </div>
                    </TabsTrigger>
                  )
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
            <>
              {agentTabs.map((tab) => {
                const config = configs[tab.configKey]
                if (!config) return null

                return (
                  <TabsContent key={tab.id} value={tab.id} className="space-y-6">
                    {tab.id === 'chat-model-agent' && (
                      <ChatModelAgentConfig
                        provider={provider}
                        initialConfig={config}
                        onSave={(cfg) => handleSaveConfig(tab.configKey, cfg)}
                      />
                    )}
                    {tab.id === 'provider-tools-agent' && (
                      <ProviderToolsAgentConfig
                        provider={provider}
                        initialConfig={config}
                        onSave={(cfg) => handleSaveConfig(tab.configKey, cfg)}
                      />
                    )}
                    {tab.id === 'document-agent' && (
                      <DocumentAgentConfig
                        provider={provider}
                        initialConfig={config}
                        onSave={(cfg) => handleSaveConfig(tab.configKey, cfg)}
                      />
                    )}
                    {tab.id === 'python-agent' && (
                      <PythonAgentConfig
                        provider={provider}
                        initialConfig={config}
                        onSave={(cfg) => handleSaveConfig(tab.configKey, cfg)}
                      />
                    )}
                    {tab.id === 'mermaid-agent' && (
                      <MermaidAgentConfig
                        provider={provider}
                        initialConfig={config}
                        onSave={(cfg) => handleSaveConfig(tab.configKey, cfg)}
                      />
                    )}
                    {tab.id === 'git-mcp-agent' && (
                      <GitMcpAgentConfig
                        provider={provider}
                        initialConfig={config}
                        onSave={(cfg) => handleSaveConfig(tab.configKey, cfg)}
                      />
                    )}
                  </TabsContent>
                )
              })}
            </>
          )}
        </Tabs>

        {/* Custom children content if provided */}
        {children}
      </div>
    </div>
  )
}