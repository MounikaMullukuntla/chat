# Design Document

## Overview

This design leverages the existing AI chatbot template to implement a database-driven provider system with streaming responses and thinking mode. The system uses admin-configurable providers stored in the database, eliminating the need for a complex registry pattern. Admins can enable/disable providers and configure models through the admin panel.

## Architecture

### Current State Analysis

The existing implementation provides:
- **Streaming Infrastructure**: Uses AI SDK's `streamText` and `createUIMessageStream` for real-time response delivery
- **Reasoning Support**: Already implements thinking mode via `extractReasoningMiddleware` with `<think>` tags
- **Chat API**: Complete `/api/chat` endpoint with authentication, rate limiting, and message persistence
- **Database Configuration**: Admin panel with `admin_config` table for provider management
- **UI Components**: Full chat interface with streaming support and thinking mode toggle

### Target Architecture (Complete Agent Structure)

```
/lib/ai/
├── core/                    # Shared interfaces and base classes
│   ├── types.ts            # Common types and interfaces
│   └── errors.ts           # Error handling
├── providers/              # Provider-specific implementations
│   ├── google/
│   │   ├── chat-agent.ts           # Main chat agent
│   │   ├── provider-tools-agent.ts # External API integrations
│   │   ├── document-agent.ts       # Document creation/editing
│   │   ├── python-agent.ts         # Python code generation
│   │   ├── mermaid-agent.ts        # Diagram creation
│   │   ├── git-mcp-agent.ts        # Git/GitHub operations
│   │   └── index.ts                # Provider exports
│   ├── openai/
│   │   ├── chat-agent.ts           # Main chat agent
│   │   ├── provider-tools-agent.ts # External API integrations
│   │   ├── document-agent.ts       # Document creation/editing
│   │   ├── python-agent.ts         # Python code generation
│   │   ├── mermaid-agent.ts        # Diagram creation
│   │   ├── git-mcp-agent.ts        # Git/GitHub operations
│   │   └── index.ts                # Provider exports
│   └── anthropic/
│       ├── chat-agent.ts           # Main chat agent
│       ├── provider-tools-agent.ts # External API integrations
│       ├── document-agent.ts       # Document creation/editing
│       ├── python-agent.ts         # Python code generation
│       ├── mermaid-agent.ts        # Diagram creation
│       ├── git-mcp-agent.ts        # Git/GitHub operations
│       └── index.ts                # Provider exports
├── factory.ts              # Simple provider factory (database-driven)
├── models.ts               # Model definitions (database-driven)
└── entitlements.ts         # User entitlements (kept)
```

## Components and Interfaces

### Core Interfaces

```typescript
// /lib/ai/core/types.ts
export interface ProviderConfig {
  enabled: boolean;
  systemPrompt: string;
  availableModels: ModelConfig[];
  capabilities: ProviderCapabilities;
  fileInputTypes: FileInputConfig;
  rateLimit: RateLimitConfig;
  tools: ToolsConfig;
}

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
  thinkingEnabled: boolean;
}

export interface ProviderCapabilities {
  fileInput: boolean;
}

export interface ChatParams {
  messages: Message[];
  modelId: string;
  systemPrompt?: string;
  thinkingMode?: boolean;
}
```

### Database-Driven Provider Factory

```typescript
// /lib/ai/factory.ts
export class ProviderFactory {
  static async getActiveProvider(): Promise<string> {
    // Get active provider from admin_config.app_settings
    const settings = await getAdminConfig('app_settings');
    return settings.activeProvider;
  }
  
  static async getAgentConfig(agentType: string, providerId: string): Promise<ProviderConfig> {
    // Get agent config from admin_config table
    const configKey = `${agentType}_${providerId}`;
    return await getAdminConfig(configKey);
  }
  
  static async getAvailableModels(agentType: string, providerId: string): Promise<ModelConfig[]> {
    const config = await this.getAgentConfig(agentType, providerId);
    return config.availableModels.filter(model => model.enabled);
  }
  
  static async createAgent(agentType: string, providerId: string): Promise<BaseAgent> {
    const config = await this.getAgentConfig(agentType, providerId);
    
    if (!config.enabled) {
      throw new Error(`Agent ${agentType} for provider ${providerId} is disabled`);
    }
    
    switch (providerId) {
      case 'google':
        return this.createGoogleAgent(agentType, config);
      case 'openai':
        return this.createOpenAIAgent(agentType, config);
      case 'anthropic':
        return this.createAnthropicAgent(agentType, config);
      default:
        throw new Error(`Unknown provider: ${providerId}`);
    }
  }
  
  private static createGoogleAgent(agentType: string, config: ProviderConfig): BaseAgent {
    switch (agentType) {
      case 'chat_model_agent':
        return new GoogleChatAgent(config);
      case 'provider_tools_agent':
        return new GoogleProviderToolsAgent(config);
      case 'document_agent':
        return new GoogleDocumentAgent(config);
      case 'python_agent':
        return new GooglePythonAgent(config);
      case 'mermaid_agent':
        return new GoogleMermaidAgent(config);
      case 'git_mcp_agent':
        return new GoogleGitMcpAgent(config);
      default:
        throw new Error(`Unknown agent type: ${agentType}`);
    }
  }
  
  // Similar methods for OpenAI and Anthropic...
}
```

### Provider Implementation Example

```typescript
// /lib/ai/providers/google/provider.ts
export class GoogleProvider {
  constructor(private config: ProviderConfig) {}
  
  async chat(params: ChatParams): Promise<AsyncIterable<StreamingResponse>> {
    const model = this.getModel(params.modelId);
    
    const result = streamText({
      model,
      system: params.systemPrompt || this.config.systemPrompt,
      messages: params.messages,
      // Apply thinking mode if enabled
      ...(params.thinkingMode && this.supportsThinking(params.modelId) && {
        experimental_transform: extractReasoningMiddleware({ tagName: "think" })
      })
    });
    
    // Stream responses
    for await (const chunk of result.textStream) {
      yield {
        content: chunk,
        finished: false
      };
    }
  }
  
  private getModel(modelId: string): LanguageModel {
    // Return appropriate Google model based on modelId
    return google(modelId);
  }
  
  private supportsThinking(modelId: string): boolean {
    const modelConfig = this.config.availableModels.find(m => m.id === modelId);
    return modelConfig?.thinkingEnabled ?? false;
  }
}
```

## Data Models

### Database-Driven Model Configuration

Models are now configured through the database `admin_config` table with the following structure:

```sql
-- Example: Google provider configuration
INSERT INTO admin_config (config_key, config_data) VALUES
('chat_model_agent_google', '{
  "enabled": true,
  "systemPrompt": "You are a helpful AI assistant powered by Google Gemini...",
  "availableModels": [
    {
      "id": "gemini-2.0-flash",
      "name": "Gemini 2.0 Flash",
      "description": "Fast, efficient model for most tasks",
      "pricingPerMillionTokens": {
        "input": 0.075,
        "output": 0.30
      },
      "enabled": true,
      "isDefault": true,
      "thinkingEnabled": true
    }
  ],
  "capabilities": {
    "fileInput": true
  },
  "rateLimit": {
    "perMinute": 10,
    "perHour": 100,
    "perDay": 1000
  }
}'::jsonb);
```

### Runtime Model Loading

```typescript
// /lib/ai/models.ts (simplified)
export async function getAvailableModels(): Promise<ModelConfig[]> {
  const activeProvider = await ProviderFactory.getActiveProvider();
  return await ProviderFactory.getAvailableModels(activeProvider);
}

export async function getAllProviderModels(): Promise<Record<string, ModelConfig[]>> {
  const providers = ['google', 'openai', 'anthropic'];
  const models: Record<string, ModelConfig[]> = {};
  
  for (const provider of providers) {
    try {
      const config = await ProviderFactory.getProviderConfig(provider);
      if (config.enabled) {
        models[provider] = config.availableModels.filter(m => m.enabled);
      }
    } catch (error) {
      // Provider not configured or disabled
      models[provider] = [];
    }
  }
  
  return models;
}
```

### API Request/Response Models

```typescript
// Enhanced schema for model selection
export const postRequestBodySchema = z.object({
  id: z.string().uuid(),
  message: z.object({
    id: z.string().uuid(),
    role: z.enum(["user"]),
    parts: z.array(partSchema),
  }),
  selectedChatModel: z.string(),        // Model ID from database config
  selectedVisibilityType: z.enum(["public", "private"]),
  thinkingMode: z.boolean().optional(), // Explicit thinking mode control
});

// Provider is determined by active provider setting in database
// No need for explicit provider selection in API
```

## Error Handling

### Provider Error Handling

```typescript
// /lib/ai/core/errors.ts
export class ProviderError extends Error {
  constructor(
    public provider: string,
    public code: string,
    message: string,
    public originalError?: Error
  ) {
    super(message);
  }
}

export class ConfigurationError extends Error {
  constructor(
    public configKey: string,
    message: string
  ) {
    super(message);
  }
}
```

### Graceful Fallbacks

- If active provider is unavailable, show error to user (no automatic fallback)
- If reasoning fails, continue with standard response
- If streaming fails, return complete response
- If model is disabled, show available models to user
- Maintain error context for debugging and admin notifications

## Testing Strategy

### Unit Tests
- Provider registration and discovery
- Agent creation and configuration
- Streaming response parsing
- Reasoning extraction logic

### Integration Tests
- End-to-end chat flows with different providers
- Thinking mode toggle functionality
- Provider switching during conversations
- Error handling and fallback scenarios

### Performance Tests
- Streaming latency measurements
- Memory usage during long conversations
- Provider response time comparisons

## Migration Strategy

### Phase 1: Remove XAI and Simplify Structure
1. **Remove all XAI provider code** - delete `/lib/ai/providers/xai/` directory
2. **Remove registry pattern** - delete `/lib/ai/registry.ts`
3. **Create simplified provider factory** - implement database-driven factory
4. **Update core types** - align with database schema

### Phase 2: Implement Database-Driven Providers
1. **Create Google provider** - implement using existing database config
2. **Create OpenAI provider** - implement using database config (disabled by default)
3. **Create Anthropic provider** - implement using database config (disabled by default)
4. **Update API to use factory pattern** - load active provider from database

### Phase 3: Enhanced Features
1. **Implement explicit thinking mode control** - use model's `thinkingEnabled` flag
2. **Add admin provider management** - UI for enabling/disabling providers
3. **Add model management** - UI for enabling/disabling specific models
4. **Add provider-specific error handling**

### Phase 4: Cleanup and Testing
1. **Remove deprecated files** - clean up old structure
2. **Update all imports** - use new factory pattern
3. **Test provider switching** - ensure smooth transitions
4. **Update documentation** - reflect new architecture

## Implementation Notes

### Database Integration
- **Use existing admin_config table** - leverage current database structure
- **Load configurations at runtime** - no static configuration files
- **Cache provider configs** - avoid repeated database queries
- **Admin panel integration** - use existing admin UI patterns

### Performance Considerations
- **Cache database configs** - load once per request cycle
- **Lazy load provider instances** - create only when needed
- **Use streaming for all responses** - maintain responsiveness
- **Implement proper connection pooling** - for provider APIs

### Security Considerations
- **Validate database configurations** - ensure proper JSON structure
- **Sanitize provider inputs** - prevent injection attacks
- **Use existing rate limiting** - leverage current implementation
- **Secure API key management** - use environment variables

### Migration from Current XAI System
- **Preserve existing chat functionality** - ensure no disruption
- **Migrate model IDs gradually** - update references systematically
- **Test with Google provider first** - it's already active in database
- **Remove XAI references completely** - clean up all traces