// Shared types for admin configuration and model management

export type ModelConfig = {
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
};

export type AgentConfig = {
  enabled: boolean;
  systemPrompt: string;
  rateLimit: {
    perMinute: number;
    perHour: number;
    perDay: number;
  };
};

export type ToolConfig = {
  description: string;
  enabled: boolean;
  agentEnabled?: boolean;
  tool_input?: {
    parameter_name: string;
    parameter_description: string;
  };
};

export type FileTypeConfig = {
  enabled: boolean;
};

export type FileTypeCategory = {
  [key: string]: FileTypeConfig;
};

export type FileInputTypes = {
  codeFiles: FileTypeCategory;
  textFiles: FileTypeCategory;
  pdf: FileTypeConfig;
  ppt: FileTypeConfig;
  excel: FileTypeConfig;
  images: FileTypeConfig;
};

// Provider types
export type Provider = "google" | "openai" | "anthropic";

// Agent types
export type AgentType =
  | "chat_model_agent"
  | "provider_tools_agent"
  | "document_agent"
  | "python_agent"
  | "mermaid_agent"
  | "git_mcp_agent";

// Validation result interface
export type ValidationResult = {
  isValid: boolean;
  errors: string[];
  warnings: string[];
};
