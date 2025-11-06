'use client'

import { useState, useEffect } from 'react'
import { AgentConfigForm } from '../../shared/agent-config-form'
import { SystemPromptEditor } from '../../shared/system-prompt-editor'
import { EnhancedModelSelector } from '../../shared/enhanced-model-selector'
import { EnhancedRateLimitConfiguration } from '../../shared/enhanced-rate-limit-configuration'
import { ToolsConfiguration } from '../../shared/tools-configuration'

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
}

interface ProviderToolsAgentConfig {
  enabled: boolean
  systemPrompt: string
  availableModels: ModelConfig[]
  rateLimit: {
    perMinute: number
    perHour: number
    perDay: number
  }
  tools: {
    googleSearch: ToolConfig
    urlContext: ToolConfig
    codeExecution: ToolConfig
  }
}

interface ProviderToolsAgentConfigProps {
  configKey: string
  provider?: string
}

export function ProviderToolsAgentConfig({ configKey, provider = 'google' }: ProviderToolsAgentConfigProps) {
  const [config, setConfig] = useState<ProviderToolsAgentConfig | null>(null)
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
        let configData: ProviderToolsAgentConfig

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

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading configuration...</div>
  }

  if (error) {
    return <div className="flex items-center justify-center p-8 text-red-600">Error: {error}</div>
  }

  if (!config) {
    return <div className="flex items-center justify-center p-8">No configuration found</div>
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
        googleSearch: tools.googleSearch || prev.tools.googleSearch,
        urlContext: tools.urlContext || prev.tools.urlContext,
        codeExecution: tools.codeExecution || prev.tools.codeExecution
      }
      return { ...prev, tools: typedTools }
    })
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
      title="Provider Tools Agent"
      description="Specialized agent for external API integrations including Google Search, URL Context, and Code Execution"
      value={config}
      onChange={handleConfigChange}
      className="space-y-6"
      systemPromptSection={
        <SystemPromptEditor
          value={config.systemPrompt}
          onChange={handleSystemPromptChange}
          label="System Prompt"
          description="Define how the Provider Tools Agent should behave when accessing external services"
          placeholder="Enter the system prompt that defines how the agent should use external tools and services..."
        />
      }
      rateLimitSection={
        <EnhancedRateLimitConfiguration
          value={enhancedRateLimit}
          onChange={handleRateLimitChange}
          label="Rate Limits"
          description="Configure request limits for the Provider Tools Agent"
        />
      }
    >
      <EnhancedModelSelector
        onModelsChange={handleModelsChange}
        provider={provider}
        label="Available Models"
        description="Configure which models are available for the Provider Tools Agent with pricing information"
      />



      <ToolsConfiguration
        value={config.tools}
        onChange={handleToolsChange}
        label="Available Tools"
        description="Configure which external tools the Provider Tools Agent can use"
        configKey={configKey}
        enableInstantUpdates={true}
      />
    </AgentConfigForm>
  )
}