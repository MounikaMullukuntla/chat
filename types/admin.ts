// Shared types for admin configuration and model management

export interface ModelConfig {
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

export interface AgentConfig {
  enabled: boolean
  systemPrompt: string
  rateLimit: {
    perMinute: number
    perHour: number
    perDay: number
  }
}

export interface ToolConfig {
  description: string
  enabled: boolean
  agentEnabled?: boolean
  tool_input?: {
    parameter_name: string
    parameter_description: string
  }
}

export interface FileTypeConfig {
  enabled: boolean
}

export interface FileTypeCategory {
  [key: string]: FileTypeConfig
}

export interface FileInputTypes {
  codeFiles: FileTypeCategory
  textFiles: FileTypeCategory
  pdf: FileTypeConfig
  ppt: FileTypeConfig
  excel: FileTypeConfig
  images: FileTypeConfig
}

// Provider types
export type Provider = 'google' | 'openai' | 'anthropic'

// Agent types
export type AgentType = 
  | 'chat_model_agent'
  | 'provider_tools_agent'
  | 'document_agent'
  | 'python_agent'
  | 'mermaid_agent'
  | 'git_mcp_agent'

// Validation result interface
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}