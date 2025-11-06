'use client'

import { useState } from 'react'
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

interface PythonAgentConfig {
  enabled: boolean
  systemPrompt: string
  availableModels: ModelConfig[]
  rateLimit: {
    perMinute: number
    perHour: number
    perDay: number
  }
  tools: {
    createCodeArtifact: ToolConfig
    updateCodeArtifact: ToolConfig
  }
}

interface PythonAgentConfigProps {
  configKey: string
  provider?: string
}

// Default configuration
const getDefaultConfig = (provider: string = 'google'): PythonAgentConfig => ({
  enabled: true,
  systemPrompt: `You are a specialized Python Agent powered by ${provider === 'google' ? 'Google AI' : provider === 'openai' ? 'OpenAI' : 'Anthropic'}. Your role is to generate, execute, and manage Python code artifacts for users.

Your capabilities include:
- Creating new Python code artifacts with proper structure and documentation
- Updating existing Python code artifacts with improvements and modifications
- Writing clean, efficient, and well-documented Python code
- Following Python best practices and coding standards
- Handling various Python libraries and frameworks

You should:
- Write readable and maintainable Python code
- Include appropriate comments and documentation
- Follow PEP 8 style guidelines
- Handle errors gracefully and provide meaningful error messages
- Use appropriate Python libraries and patterns for the task

Always focus on creating high-quality, secure, and efficient Python code that meets user requirements and follows best practices.`,
  availableModels: getDefaultModels(provider),
  rateLimit: {
    perMinute: 10,
    perHour: 100,
    perDay: 1000
  },
  tools: {
    createCodeArtifact: {
      description: "Create new Python code artifacts with proper structure, documentation, and best practices",
      enabled: true
    },
    updateCodeArtifact: {
      description: "Update existing Python code artifacts with improvements, modifications, and enhancements",
      enabled: true
    }
  }
})

// Default models for each provider
function getDefaultModels(provider: string): ModelConfig[] {
  switch (provider) {
    case 'google':
      return [
        {
          id: 'gemini-1.5-pro',
          name: 'Gemini 1.5 Pro',
          description: 'Most capable model for complex reasoning tasks',
          pricingPerMillionTokens: { input: 3.5, output: 10.5 },
          enabled: true,
          isDefault: true,
          thinkingEnabled: true
        },
        {
          id: 'gemini-1.5-flash',
          name: 'Gemini 1.5 Flash',
          description: 'Fast and efficient model for most tasks',
          pricingPerMillionTokens: { input: 0.075, output: 0.3 },
          enabled: true,
          isDefault: false,
          thinkingEnabled: true
        }
      ]
    case 'openai':
      return [
        {
          id: 'gpt-4o',
          name: 'GPT-4o',
          description: 'Most advanced multimodal model',
          pricingPerMillionTokens: { input: 5.0, output: 15.0 },
          enabled: true,
          isDefault: true,
          thinkingEnabled: true
        },
        {
          id: 'gpt-4o-mini',
          name: 'GPT-4o Mini',
          description: 'Affordable and intelligent small model',
          pricingPerMillionTokens: { input: 0.15, output: 0.6 },
          enabled: true,
          isDefault: false,
          thinkingEnabled: true
        }
      ]
    case 'anthropic':
      return [
        {
          id: 'claude-3-5-sonnet-20241022',
          name: 'Claude 3.5 Sonnet',
          description: 'Most intelligent model for complex tasks',
          pricingPerMillionTokens: { input: 3.0, output: 15.0 },
          enabled: true,
          isDefault: true,
          thinkingEnabled: true
        },
        {
          id: 'claude-3-haiku-20240307',
          name: 'Claude 3 Haiku',
          description: 'Fastest model for simple tasks',
          pricingPerMillionTokens: { input: 0.25, output: 1.25 },
          enabled: true,
          isDefault: false,
          thinkingEnabled: true
        }
      ]
    default:
      return []
  }
}

export function PythonAgentConfig({ configKey, provider = 'google' }: PythonAgentConfigProps) {
  const [config, setConfig] = useState<PythonAgentConfig>(getDefaultConfig(provider))

  const handleConfigChange = (newConfig: any) => {
    // Handle the base config change from AgentConfigForm
    setConfig(prev => ({ ...prev, ...newConfig }))
  }

  const handleSystemPromptChange = (systemPrompt: string) => {
    setConfig(prev => ({ ...prev, systemPrompt }))
  }

  const handleModelsChange = (availableModels: ModelConfig[]) => {
    setConfig(prev => ({ ...prev, availableModels }))
  }



  const handleRateLimitChange = (rateLimitConfig: any) => {
    // Convert from the enhanced rate limit format to our format
    const rateLimit = {
      perMinute: 10, // Default fallback
      perHour: rateLimitConfig.hourly?.value || 100,
      perDay: rateLimitConfig.daily?.value || 1000
    }
    setConfig(prev => ({ ...prev, rateLimit }))
  }

  const handleToolsChange = (tools: Record<string, ToolConfig>) => {
    // Ensure we maintain the specific tool structure
    const typedTools = {
      createCodeArtifact: tools.createCodeArtifact || config.tools.createCodeArtifact,
      updateCodeArtifact: tools.updateCodeArtifact || config.tools.updateCodeArtifact
    }
    setConfig(prev => ({ ...prev, tools: typedTools }))
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
      title="Python Agent"
      description="Specialized agent for Python code generation and execution"
      value={config}
      onChange={handleConfigChange}
      className="space-y-6"
      systemPromptSection={
        <SystemPromptEditor
          value={config.systemPrompt}
          onChange={handleSystemPromptChange}
          label="System Prompt"
          description="Define how the Python Agent should behave when creating and executing Python code"
          placeholder="Enter the system prompt that defines how the agent should handle Python code generation and execution..."
        />
      }
      rateLimitSection={
        <EnhancedRateLimitConfiguration
          value={enhancedRateLimit}
          onChange={handleRateLimitChange}
          label="Rate Limits"
          description="Configure request limits for the Python Agent"
        />
      }
    >
      <EnhancedModelSelector
        models={config.availableModels}
        onModelsChange={handleModelsChange}
        provider={provider}
        label="Available Models"
        description="Configure which models are available for the Python Agent with pricing information"
        configKey={configKey}
      />



      <ToolsConfiguration
        value={config.tools}
        onChange={handleToolsChange}
        label="Available Tools"
        description="Configure which Python code tools the Python Agent can use"
        configKey={configKey}
        enableInstantUpdates={true}
      />
    </AgentConfigForm>
  )
}