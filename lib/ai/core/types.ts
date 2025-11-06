/**
 * Core types for the database-driven chat agent system
 */

// Legacy types for backward compatibility
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
}

// Database-aligned core interfaces

/**
 * Configuration for individual models within a provider
 */
export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  pricingPerMillionTokens: {
    input: number;
    output: number;
  };
  enabled: boolean;
  isDefault: boolean;
  thinkingEnabled?: boolean;
  // Enhanced model capabilities for chat input enhancements
  supportsThinkingMode?: boolean;
  fileInputEnabled?: boolean;
  allowedFileTypes?: string[];
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  perMinute: number;
  perHour: number;
  perDay: number;
}

/**
 * Tool configuration for agents
 */
export interface ToolConfig {
  description: string;
  enabled: boolean;
  tool_input?: {
    parameter_name: string;
    parameter_description: string;
  };
}

/**
 * File type configuration for file input
 */
export interface FileTypeConfig {
  enabled: boolean;
}

/**
 * File input types configuration structure
 */
export interface FileInputTypesConfig {
  codeFiles: Record<string, FileTypeConfig>;
  textFiles: Record<string, FileTypeConfig>;
  pdf: FileTypeConfig;
  ppt: FileTypeConfig;
  excel: FileTypeConfig;
  images: FileTypeConfig;
}

/**
 * Provider capabilities configuration
 */
export interface ProviderCapabilities {
  thinkingReasoning?: boolean;
  fileInput?: boolean;
}

/**
 * Base provider configuration interface
 */
export interface BaseProviderConfig {
  enabled: boolean;
  systemPrompt: string;
  rateLimit: RateLimitConfig;
}

/**
 * Chat model agent specific configuration
 */
export interface ChatModelAgentConfig extends BaseProviderConfig {
  availableModels: ModelConfig[];
  capabilities?: ProviderCapabilities;
  fileInputTypes?: FileInputTypesConfig;
  // Provider-level file input capabilities (optional for backward compatibility)
  fileInputEnabled?: boolean;
  allowedFileTypes?: string[];
  tools?: {
    providerToolsAgent: ToolConfig;
    documentAgent: ToolConfig;
    pythonAgent: ToolConfig;
    mermaidAgent: ToolConfig;
    gitMcpAgent: ToolConfig;
  };
}

/**
 * Provider tools agent configuration
 */
export interface ProviderToolsAgentConfig extends BaseProviderConfig {
  availableModels: ModelConfig[];
  tools: {
    googleSearch: ToolConfig;
    urlContext: ToolConfig;
    codeExecution: ToolConfig;
  };
}

/**
 * Document agent configuration
 */
export interface DocumentAgentConfig extends BaseProviderConfig {
  availableModels: ModelConfig[];
  tools: {
    createDocumentArtifact: ToolConfig;
    updateDocumentArtifact: ToolConfig;
  };
}

/**
 * Python agent configuration
 */
export interface PythonAgentConfig extends BaseProviderConfig {
  availableModels: ModelConfig[];
  tools: {
    createCodeArtifact: ToolConfig;
    updateCodeArtifact: ToolConfig;
  };
}

/**
 * Mermaid agent configuration
 */
export interface MermaidAgentConfig extends BaseProviderConfig {
  availableModels: ModelConfig[];
  tools: {
    createMermaidDiagrams: ToolConfig;
    updateMermaidDiagrams: ToolConfig;
  };
}

/**
 * Git MCP agent configuration
 */
export interface GitMCPAgentConfig extends BaseProviderConfig {
  tools: Record<string, ToolConfig>; // Flexible tools configuration
}

/**
 * Union type for all provider configurations
 */
export type ProviderConfig = 
  | ChatModelAgentConfig
  | ProviderToolsAgentConfig
  | DocumentAgentConfig
  | PythonAgentConfig
  | MermaidAgentConfig
  | GitMCPAgentConfig;

/**
 * Parameters for chat agent interactions
 */
export interface ChatParams {
  messages: ChatMessage[];
  modelId: string;
  systemPrompt?: string;
  thinkingMode?: boolean;
  userId?: string;
  conversationId?: string;
  dataStream?: any; // UIMessageStreamWriter for tool execution
}

/**
 * Streaming response interface
 */
export interface StreamingResponse {
  content: string;
  reasoning?: string;
  finished: boolean;
  usage?: TokenUsage;
  error?: string;
}

/**
 * Agent type enumeration
 */
export type AgentType = 
  | 'chat_model_agent'
  | 'provider_tools_agent'
  | 'document_agent'
  | 'python_agent'
  | 'mermaid_agent'
  | 'git_mcp_agent';

/**
 * Provider enumeration
 */
export type Provider = 'google' | 'openai' | 'anthropic';

/**
 * Configuration key format: {agentType}_{provider}
 */
export type ConfigKey = `${AgentType}_${Provider}` | 'app_settings';

/**
 * App settings configuration
 */
export interface AppSettingsConfig {
  appName?: string;
  maintenanceMode?: boolean;
  allowRegistration?: boolean;
  maxUsersPerDay?: number;
  activeProvider?: Provider;
}

// Legacy interfaces for backward compatibility
export interface ModelCapabilities {
  reasoning: boolean;
  streaming: boolean;
  multimodal: boolean;
  tools: boolean;
  maxTokens?: number;
}

export interface ChatModel {
  id: string;
  name: string;
  description: string;
  provider: string;
  capabilities: ModelCapabilities;
  config?: Record<string, any>;
}

export interface ChatAgentConfig {
  modelId: string;
  systemPrompt?: string;
  tools?: string[];
  reasoning?: boolean;
  streaming?: boolean;
  maxTokens?: number;
  temperature?: number;
}