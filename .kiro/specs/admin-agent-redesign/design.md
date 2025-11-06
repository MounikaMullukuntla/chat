# Design Document

## Overview

This design document outlines the architectural changes needed to remove the routing agent and implement a new multi-agent system where the Chat Model Agent serves as the primary agent with specialized agents as tools. The system will maintain the existing admin configuration infrastructure while restructuring the agent hierarchy and UI components.

## Architecture

### Current vs New Architecture

**Current Architecture:**
```
User Request → Routing Agent → Specialized Agent → Response
```

**New Architecture:**
```
User Request → Chat Model Agent → [Delegates to Specialized Agents as Tools] → Response
```

### Agent Hierarchy

1. **Chat Model Agent** (Primary)
   - Handles all user interactions
   - Delegates tasks to specialized agents as tools
   - Manages conversation context and flow

2. **Specialized Agents** (Tools)
   - Provider Tools Agent (Google Search, URL Context, Code Execution)
   - Document Agent (Create/Update documents)
   - Python Agent (Code generation and execution)
   - Mermaid Agent (Diagram creation)
   - Git MCP Agent (Repository operations)

### Database Schema Changes

The existing `admin_config` table structure remains unchanged, but the configuration keys and data structure will be updated:

**Removed Configuration Keys:**
- `routing_agent_google`
- `routing_agent_openai` 
- `routing_agent_anthropic`

**New Configuration Keys:**
- `chat_model_agent_[provider]`
- `provider_tools_agent_[provider]`
- `document_agent_[provider]` (renamed from existing)
- `python_agent_[provider]` (renamed from existing)
- `mermaid_agent_[provider]` (renamed from existing)
- `git_mcp_agent_[provider]` (renamed from existing)

## Components and Interfaces

### UI Component Structure

```
AdminLayout
├── ChatModelAgentConfig
├── ProviderToolsAgentConfig  
├── DocumentAgentConfig
├── PythonAgentConfig
├── MermaidAgentConfig
└── GitMCPAgentConfig
```

### Shared Component Library

**AgentConfigForm** - Base form component with common functionality:
- Agent enable/disable toggle
- Save/reset functionality
- Loading states
- Error handling

**ModelSelector** - Model configuration component:
- Model selection with pricing display
- Enable/disable toggles per model
- Default model selection
- Pricing per million tokens (input/output)

**SystemPromptEditor** - System prompt configuration:
- Rich text editor for prompts
- Template suggestions
- Character count and validation

**RateLimitConfiguration** - Rate limiting controls:
- Per minute limits
- Per hour limits  
- Per day limits
- Validation and warnings

**CapabilitiesConfiguration** - Agent capabilities:
- Thinking/Reasoning toggle
- File Input toggle (Chat Model only)
- Tool-specific capabilities

**ToolsConfiguration** - Tool management:
- Tool enable/disable toggles
- Tool descriptions
- Dependency warnings (when tool agent is disabled)

### Configuration Data Models

```typescript
interface BaseAgentConfig {
  enabled: boolean
  systemPrompt: string
  availableModels: ModelConfig[]
  capabilities: {
    thinkingReasoning: boolean
  }
  rateLimit: {
    perMinute: number
    perHour: number
    perDay: number
  }
}

interface ChatModelAgentConfig extends BaseAgentConfig {
  capabilities: {
    thinkingReasoning: boolean
    fileInput: boolean
  }
  tools: {
    providerToolsAgent: ToolConfig
    documentAgent: ToolConfig
    pythonAgent: ToolConfig
    mermaidAgent: ToolConfig
    gitMcpAgent: ToolConfig
  }
}

interface ProviderToolsAgentConfig extends BaseAgentConfig {
  tools: {
    googleSearch: ToolConfig
    urlContext: ToolConfig
    codeExecution: ToolConfig
  }
}

interface DocumentAgentConfig extends BaseAgentConfig {
  tools: {
    createDocumentArtifact: ToolConfig
    updateDocumentArtifact: ToolConfig
  }
}

interface PythonAgentConfig extends BaseAgentConfig {
  tools: {
    createCodeArtifact: ToolConfig
    updateCodeArtifact: ToolConfig
  }
}

interface MermaidAgentConfig extends BaseAgentConfig {
  tools: {
    createMermaidDiagrams: ToolConfig
    updateMermaidDiagrams: ToolConfig
  }
}

interface GitMCPAgentConfig extends BaseAgentConfig {
  tools: Record<string, ToolConfig> // Placeholder for future tools
}

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
}

interface ToolConfig {
  description: string
  enabled: boolean
}
```

## Data Models

### Updated Seed Data Structure

The seed data will be restructured to remove routing agent configurations and add the new agent structure:

```sql
-- Remove routing agent entries
DELETE FROM admin_config WHERE config_key LIKE 'routing_agent_%';

-- Add new Chat Model Agent configurations
INSERT INTO admin_config (config_key, config_data) VALUES
('chat_model_agent_google', '{
  "enabled": true,
  "systemPrompt": "You are a helpful AI assistant...",
  "availableModels": [...],
  "capabilities": {
    "thinkingReasoning": true,
    "fileInput": true
  },
  "rateLimit": {
    "perMinute": 10,
    "perHour": 100,
    "perDay": 1000
  },
  "tools": {
    "providerToolsAgent": {
      "description": "Access to external APIs and services",
      "enabled": true
    },
    ...
  }
}');
```

### Migration Strategy

1. **Data Migration Script** (`0007_agent_redesign.sql`):
   - Remove routing agent configurations
   - Rename existing agent configurations to new naming convention
   - Add new Chat Model Agent configurations
   - Update configuration data structure

2. **Backward Compatibility**:
   - Maintain existing API endpoints during transition
   - Gradual migration of configuration keys
   - Fallback handling for missing configurations

## Error Handling

### Configuration Validation

```typescript
interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

interface ValidationError {
  field: string
  message: string
  severity: 'error' | 'warning'
}
```

**Validation Rules:**
- At least one model must be enabled per agent
- Rate limits must be positive integers
- System prompts must not be empty
- Tool dependencies must be satisfied (warn if tool agent is disabled)

### Error States

1. **Configuration Load Errors**:
   - Display fallback UI with default values
   - Show error message with retry option
   - Log errors for admin review

2. **Save Errors**:
   - Preserve user input
   - Display specific error messages
   - Highlight problematic fields

3. **Dependency Warnings**:
   - Show warning when enabling tool while agent is disabled
   - Provide quick action to enable dependent agent
   - Clear visual indicators for dependency issues

## Testing Strategy

### Unit Tests

1. **Component Tests**:
   - Agent configuration forms
   - Model selector functionality
   - Rate limit validation
   - Tool dependency warnings

2. **API Tests**:
   - CRUD operations for each agent type
   - Configuration validation
   - Error handling scenarios

3. **Integration Tests**:
   - End-to-end configuration workflows
   - Data migration verification
   - Cross-agent dependency validation

### Test Data

```typescript
const mockChatModelConfig: ChatModelAgentConfig = {
  enabled: true,
  systemPrompt: "Test prompt",
  availableModels: [mockModel],
  capabilities: {
    thinkingReasoning: true,
    fileInput: true
  },
  rateLimit: {
    perMinute: 10,
    perHour: 100,
    perDay: 1000
  },
  tools: {
    providerToolsAgent: { description: "Test", enabled: true },
    // ...
  }
}
```

## API Design

### REST Endpoints

**Base Pattern:** `/api/admin/config/[configKey]`

**Supported Config Keys:**
- `chat_model_agent_[provider]`
- `provider_tools_agent_[provider]`
- `document_agent_[provider]`
- `python_agent_[provider]`
- `mermaid_agent_[provider]`
- `git_mcp_agent_[provider]`

**Operations:**
- `GET` - Retrieve configuration
- `PUT` - Update entire configuration
- `PATCH` - Update specific fields
- `DELETE` - Reset to defaults

### Request/Response Format

```typescript
// GET /api/admin/config/chat_model_agent_google
{
  "success": true,
  "configData": ChatModelAgentConfig,
  "lastUpdated": "2024-01-01T00:00:00Z",
  "updatedBy": "admin@example.com"
}

// PUT /api/admin/config/chat_model_agent_google
{
  "configData": ChatModelAgentConfig
}

// Response
{
  "success": true,
  "message": "Configuration updated successfully",
  "configData": ChatModelAgentConfig
}
```

### Validation Middleware

```typescript
const validateAgentConfig = (agentType: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const validator = getValidatorForAgentType(agentType)
    const result = validator.validate(req.body.configData)
    
    if (!result.isValid) {
      return res.status(400).json({
        success: false,
        errors: result.errors
      })
    }
    
    next()
  }
}
```

## Implementation Phases

### Phase 1: Database Migration and API Updates
- remove routing agent data from admin config in seed data
- Update API endpoints to handle new configuration keys
- Add validation for new configuration structure

### Phase 2: UI Component Development
- Create new agent configuration components
- Update AdminLayout to show new tabs
- Remove routing agent components

### Phase 3: Integration and Testing
- Wire up new components with APIs
- Implement dependency validation
- Add comprehensive error handling

### Phase 4: Data Migration and Cleanup
- Run migration scripts on existing data (reset, migrate, verify)
- Remove old routing agent code
- Update documentation

## Security Considerations

### Access Control
- Maintain existing admin role requirements
- Validate user permissions for each configuration endpoint
- Log all configuration changes for audit trail

### Data Validation
- Sanitize all input data
- Validate configuration schemas
- Prevent injection attacks through prompts

### Rate Limiting
- Apply rate limits to configuration API endpoints
- Prevent abuse of configuration changes
- Monitor for suspicious activity


### Database Optimization
- Index configuration keys for fast lookups
- Optimize JSON queries for configuration data

### UI Performance
- Lazy load configuration tabs
- Debounce configuration saves
- Implement optimistic updates where appropriate