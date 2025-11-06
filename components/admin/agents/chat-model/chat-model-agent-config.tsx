'use client'

import { useState, useEffect } from 'react'
import { AgentConfigForm } from '../../shared/agent-config-form'
import { SystemPromptEditor } from '../../shared/system-prompt-editor'
import { EnhancedModelSelector } from '../../shared/enhanced-model-selector'

import { EnhancedRateLimitConfiguration } from '../../shared/enhanced-rate-limit-configuration'
import { ToolsConfiguration } from '../../shared/tools-configuration'
import { FileTypeConfiguration } from '../../shared/file-type-configuration'

interface ModelConfig {
  id: string
  name: string
  description: string
  pricingPerMillionTokens: {
    input: number
    output: number
  }
  enabled: boolean
  isDefault: boolean
  thinkingEnabled?: boolean
}

interface ToolConfig {
  description: string
  enabled: boolean
  agentEnabled?: boolean
  tool_input?: {
    parameter_name: string
    parameter_description: string
  }
}

interface FileTypeConfig {
  enabled: boolean
}

interface FileTypeCategory {
  [key: string]: FileTypeConfig
}

interface FileInputTypes {
  codeFiles: FileTypeCategory
  textFiles: FileTypeCategory
  pdf: FileTypeConfig
  ppt: FileTypeConfig
  excel: FileTypeConfig
  images: FileTypeConfig
}

interface ChatModelAgentConfig {
  enabled: boolean
  systemPrompt: string
  availableModels: ModelConfig[]
  capabilities: {
    thinkingReasoning: boolean
    fileInput: boolean
  }
  fileInputTypes?: FileInputTypes
  rateLimit: {
    perMinute: number
    perHour: number
    perDay: number
  }
  tools: {
    providerToolsAgent: ToolConfig
    documentAgent: ToolConfig
    pythonAgent: ToolConfig
    mermaidAgent: ToolConfig
    gitMcpAgent: ToolConfig
  }
}

interface ChatModelAgentConfigProps {
  configKey: string
  provider?: string
}

export function ChatModelAgentConfig({ configKey, provider = 'google' }: ChatModelAgentConfigProps) {
  const [config, setConfig] = useState<ChatModelAgentConfig | null>(null)
  const [toolAgentStatuses, setToolAgentStatuses] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load configuration from database
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch the main configuration
        const configResponse = await fetch(`/api/admin/config/${configKey}`)
        let configData: ChatModelAgentConfig

        if (configResponse.ok) {
          const data = await configResponse.json()
          configData = data.configData
        } else {
          throw new Error(`Failed to fetch configuration: ${configResponse.statusText}`)
        }

        // Models will be loaded by the EnhancedModelSelector component
        // Initialize with empty array - the selector will fetch and manage models
        configData.availableModels = []

        setConfig(configData)
      } catch (err) {
        console.error('Failed to load configuration:', err)
        setError(err instanceof Error ? err.message : 'Failed to load configuration')
      } finally {
        setLoading(false)
      }
    }

    loadConfig()
  }, [configKey, provider])

  // Load tool agent statuses to show dependency warnings
  useEffect(() => {
    const loadToolAgentStatuses = async () => {
      try {
        const agentKeys = [
          `provider_tools_agent_${provider}`,
          `document_agent_${provider}`,
          `python_agent_${provider}`,
          `mermaid_agent_${provider}`,
          `git_mcp_agent_${provider}`
        ]

        const statuses: Record<string, boolean> = {}
        
        for (const key of agentKeys) {
          try {
            const response = await fetch(`/api/admin/config/${key}`)
            if (response.ok) {
              const data = await response.json()
              const agentType = key.replace(`_${provider}`, '').replace('_agent', '')
              statuses[agentType] = data.configData?.enabled ?? false
            } else {
              // If config doesn't exist, assume agent is disabled
              const agentType = key.replace(`_${provider}`, '').replace('_agent', '')
              statuses[agentType] = false
            }
          } catch {
            // If there's an error, assume agent is disabled
            const agentType = key.replace(`_${provider}`, '').replace('_agent', '')
            statuses[agentType] = false
          }
        }

        setToolAgentStatuses(statuses)
      } catch (error) {
        console.error('Failed to load tool agent statuses:', error)
      }
    }

    loadToolAgentStatuses()
  }, [provider])

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading configuration...</div>
  }

  if (error) {
    return <div className="flex items-center justify-center p-8 text-red-600">Error: {error}</div>
  }

  if (!config) {
    return <div className="flex items-center justify-center p-8">No configuration found</div>
  }

  // Update tools with agent status for dependency warnings
  const toolsWithAgentStatus = {
    ...config.tools,
    providerToolsAgent: {
      ...config.tools.providerToolsAgent,
      agentEnabled: toolAgentStatuses.provider_tools ?? false
    },
    documentAgent: {
      ...config.tools.documentAgent,
      agentEnabled: toolAgentStatuses.document ?? false
    },
    pythonAgent: {
      ...config.tools.pythonAgent,
      agentEnabled: toolAgentStatuses.python ?? false
    },
    mermaidAgent: {
      ...config.tools.mermaidAgent,
      agentEnabled: toolAgentStatuses.mermaid ?? false
    },
    gitMcpAgent: {
      ...config.tools.gitMcpAgent,
      agentEnabled: toolAgentStatuses.git_mcp ?? false
    }
  }

  const handleConfigChange = (newConfig: any) => {
    // Handle the base config change from AgentConfigForm
    setConfig(prev => prev ? ({ ...prev, ...newConfig }) : null)
  }

  const handleSystemPromptChange = (systemPrompt: string) => {
    setConfig(prev => prev ? ({ ...prev, systemPrompt }) : null)
  }

  const handleModelsChange = (availableModels: ModelConfig[]) => {
    setConfig(prev => prev ? ({ ...prev, availableModels }) : null)
  }

  const handleFileInputChange = (fileInput: boolean) => {
    setConfig(prev => prev ? ({
      ...prev,
      capabilities: {
        ...prev.capabilities,
        fileInput
      }
    }) : null)
  }

  const handleRateLimitChange = (rateLimitConfig: any) => {
    // Convert from the enhanced rate limit format to our format
    const rateLimit = {
      perMinute: 10, // Default fallback
      perHour: rateLimitConfig.hourly?.value || 100,
      perDay: rateLimitConfig.daily?.value || 1000
    }
    setConfig(prev => prev ? ({ ...prev, rateLimit }) : null)
  }

  const handleToolsChange = (tools: Record<string, ToolConfig>) => {
    setConfig(prev => {
      if (!prev) return null
      
      // Ensure we maintain the specific tool structure
      const typedTools = {
        providerToolsAgent: tools.providerToolsAgent || prev.tools.providerToolsAgent,
        documentAgent: tools.documentAgent || prev.tools.documentAgent,
        pythonAgent: tools.pythonAgent || prev.tools.pythonAgent,
        mermaidAgent: tools.mermaidAgent || prev.tools.mermaidAgent,
        gitMcpAgent: tools.gitMcpAgent || prev.tools.gitMcpAgent
      }
      return { ...prev, tools: typedTools }
    })
  }

  const handleFileInputTypesChange = (fileInputTypes: FileInputTypes) => {
    setConfig(prev => prev ? ({ ...prev, fileInputTypes }) : null)
  }

  // Convert our rate limit format to enhanced rate limit format
  const enhancedRateLimit = {
    hourly: {
      type: 'hourly' as const,
      value: config.rateLimit.perHour
    },
    daily: {
      type: 'daily' as const,
      value: config.rateLimit.perDay
    }
  }

  return (
    <AgentConfigForm
      configKey={configKey}
      title="Chat Model Agent"
      description="Primary conversational agent that handles user interactions and delegates tasks to specialized agents"
      value={config}
      onChange={handleConfigChange}
      className="space-y-6"
      systemPromptSection={
        <SystemPromptEditor
          value={config.systemPrompt}
          onChange={handleSystemPromptChange}
          label="System Prompt"
          description="Define how the Chat Model Agent should behave and respond to user requests"
          placeholder="Enter the system prompt that defines the agent's behavior, capabilities, and how it should interact with users..."
        />
      }
      rateLimitSection={
        <EnhancedRateLimitConfiguration
          value={enhancedRateLimit}
          onChange={handleRateLimitChange}
          label="Rate Limits"
          description="Configure request limits for the Chat Model Agent"
        />
      }
    >
      <EnhancedModelSelector
        onModelsChange={handleModelsChange}
        provider={provider}
        label="Available Models"
        description="Configure which models are available for the Chat Model Agent with pricing information"
      />

      {/* <FileTypeConfiguration
        value={config.fileInputTypes || {
          codeFiles: {},
          textFiles: {},
          pdf: { enabled: true },
          ppt: { enabled: true },
          excel: { enabled: true },
          images: { enabled: true }
        }}
        onChange={handleFileInputTypesChange}
        label="File Input Types"
        description="Configure file input and which file types users can upload for processing"
        configKey={configKey}
        enableInstantUpdates={true}
        fileInputEnabled={config.capabilities.fileInput}
        onFileInputChange={handleFileInputChange}
      /> */}

      <ToolsConfiguration
        value={toolsWithAgentStatus}
        onChange={handleToolsChange}
        label="Available Tools"
        description="Configure which specialized agents the Chat Model Agent can use as tools"
        configKey={configKey}
        enableInstantUpdates={true}
      />
    </AgentConfigForm>
  )
}