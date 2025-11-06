# Implementation Plan

- [x] 1. Remove XAI provider and registry system





- [x] 1.1 Delete XAI provider files


  - Remove `/lib/ai/providers/xai/` directory completely
  - Delete `/lib/ai/registry.ts` file
  - Remove XAI references from existing code
  - _Requirements: 4.5_

- [x] 1.2 Clean up XAI imports and references


  - Update all files that import XAI provider components
  - Remove XAI model definitions from existing code
  - Clean up any XAI-specific configuration
  - _Requirements: 4.5_

- [ ] 2. Create simplified core infrastructure


- [x] 2.1 Implement core types and interfaces





  - Create `/lib/ai/core/types.ts` with database-aligned interfaces
  - Define `ProviderConfig`, `ModelConfig`, and `ChatParams` interfaces
  - Implement agent-specific configuration types
  - _Requirements: 4.1, 4.2_


- [x] 2.2 Create error handling system






  - Implement `/lib/ai/core/errors.ts` with `ProviderError` and `ConfigurationError`
  - Add error codes and user-friendly error messages
  - Create error handling utilities for database operations
  - _Requirements: 5.5_

- [x] 3. Implement database-driven provider factory




- [ ] 3. Implement database-driven provider factory


- [x] 3.1 Create provider factory


  - Implement `/lib/ai/factory.ts` with database-driven agent creation
  - Add methods to load configurations from `admin_config` table
  - Implement agent type routing (chat, tools, document, python, mermaid, git)
  - _Requirements: 4.1, 4.4_

- [x] 3.2 Update models system


  - Modify `/lib/ai/models.ts` to load from database configurations
  - Implement functions to get available models per provider
  - Add model capability checking based on database config
  - _Requirements: 4.3, 4.4_




- [-] 4. Implement Google provider agents







- [ ] 4.1 Create Google chat agent


  - Implement `/lib/ai/providers/google/chat-agent.ts` using Google AI SDK
  - Add streaming support with thinking mode integration
  - Implement model selection and configuration loading


  - _Requirements: 1.1, 2.1, 3.1_

- [ ] 4.2 Create Google specialized agents
  - Implement `/lib/ai/providers/google/provider-tools-agent.ts` for external APIs
  - Create `/lib/ai/providers/google/document-agent.ts` for document operations

  - Implement `/lib/ai/providers/google/python-agent.ts` for code generation
  - Create `/lib/ai/providers/google/mermaid-agent.ts` for diagrams


  - Implement `/lib/ai/providers/google/git-mcp-agent.ts` for Git operations

  - _Requirements: 1.2, 1.3, 1.4, 1.5_

- [x] 4.3 Create Google provider index




  - Implement `/lib/ai/providers/google/index.ts` with all agent exports
  - Add provider configuration validation

  - Implement agent factory methods for Google provider



  - _Requirements: 4.1_

- [x] 5. Implement OpenAI provider agents






- [x] 5.1 Create OpenAI chat agent



  - Implement `/lib/ai/providers/openai/chat-agent.ts` using OpenAI SDK
  - Add streaming support with thinking mode integration
  - Implement model selection and configuration loading

  - _Requirements: 1.1, 2.1, 3.1_

- [x] 5.2 Create OpenAI specialized agents



  - Implement `/lib/ai/providers/openai/provider-tools-agent.ts` for external APIs
  - Create `/lib/ai/providers/openai/document-agent.ts` for document operations
  - Implement `/lib/ai/providers/openai/python-agent.ts` for code generation
  - Create `/lib/ai/providers/openai/mermaid-agent.ts` for diagrams
  - Implement `/lib/ai/providers/openai/git-mcp-agent.ts` for Git operations
  - _Requirements: 1.2, 1.3, 1.4, 1.5_


- [x] 5.3 Create OpenAI provider index



  - Implement `/lib/ai/providers/openai/index.ts` with all agent exports
  - Add provider configuration validation
  - Implement agent factory methods for OpenAI provider

  - _Requirements: 4.1_

- [x] 6. Implement Anthropic provider agents






- [x] 6.1 Create Anthropic chat agent


  - Implement `/lib/ai/providers/anthropic/chat-agent.ts` using Anthropic SDK
  - Add streaming support with thinking mode integration
  - Implement model selection and configuration loading
  - _Requirements: 1.1, 2.1, 3.1_

- [x] 6.2 Create Anthropic specialized agents


  - Implement `/lib/ai/providers/anthropic/provider-tools-agent.ts` for external APIs
  - Create `/lib/ai/providers/anthropic/document-agent.ts` for document operations
  - Implement `/lib/ai/providers/anthropic/python-agent.ts` for code generation
  - Create `/lib/ai/providers/anthropic/mermaid-agent.ts` for diagrams
  - Implement `/lib/ai/providers/anthropic/git-mcp-agent.ts` for Git operations
  - _Requirements: 1.2, 1.3, 1.4, 1.5_

- [x] 6.3 Create Anthropic provider index


  - Implement `/lib/ai/providers/anthropic/index.ts` with all agent exports
  - Add provider configuration validation
  - Implement agent factory methods for Anthropic provider
  - _Requirements: 4.1_

- [ ] 7. Update chat API for database-driven providers
- [ ] 7.1 Modify chat API endpoint
  - Update `/app/(chat)/api/chat/route.ts` to use factory pattern
  - Load active provider from database configuration
  - Implement agent selection based on request type
  - _Requirements: 5.1, 5.3_

- [ ] 7.2 Update request schema
  - Modify `/app/(chat)/api/chat/schema.ts` for simplified model selection
  - Add thinking mode control parameter
  - Remove provider selection (handled by active provider setting)
  - _Requirements: 3.1, 3.2, 5.4_

- [ ] 7.3 Implement enhanced streaming
  - Update streaming logic to handle database-configured models
  - Add reasoning content separation for thinking mode
  - Implement provider-specific error handling
  - _Requirements: 2.1, 2.2, 2.4, 5.2_

- [ ] 8. Update UI components for database-driven system
- [ ] 8.1 Update model selector
  - Modify `components/model-selector.tsx` to load models from database
  - Display models from active provider only
  - Add model capability indicators from database config
  - _Requirements: 4.4_

- [ ] 8.2 Enhance thinking mode toggle
  - Update `components/thinking-mode-toggle.tsx` for database-driven thinking mode
  - Check model's `thinkingEnabled` flag from database config
  - Implement reasoning content display control
  - _Requirements: 3.1, 3.3, 3.4_

- [ ] 9. Add database query functions
- [ ] 9.1 Create admin config queries
  - Add functions to `lib/db/queries/admin.ts` for provider configurations
  - Implement caching for frequently accessed configurations
  - Add validation for configuration JSON structure
  - _Requirements: 4.1, 4.2_

- [ ] 9.2 Update existing queries
  - Modify existing database queries to work with new provider system
  - Ensure compatibility with current admin panel functionality
  - Add error handling for missing configurations
  - _Requirements: 4.1_

- [ ]* 10. Write tests for database-driven provider system
- [ ]* 10.1 Create unit tests for factory and agents
  - Test provider factory agent creation methods
  - Write tests for database configuration loading
  - Test agent initialization with various configurations
  - _Requirements: 4.1, 4.2_

- [ ]* 10.2 Add integration tests for chat functionality
  - Test end-to-end chat flows with Google provider
  - Verify thinking mode toggle with database configurations
  - Test streaming responses and error handling
  - _Requirements: 2.1, 3.1, 5.1_

- [ ] 11. Final cleanup and migration completion
- [ ] 11.1 Remove legacy files
  - Delete old provider files that are no longer needed
  - Clean up unused imports and references
  - Remove any remaining XAI-related code
  - _Requirements: 4.5_

- [ ] 11.2 Update documentation and verify functionality
  - Test all provider agents with database configurations
  - Verify admin panel can manage provider settings
  - Ensure smooth operation with Google as active provider
  - _Requirements: 5.1, 5.3_