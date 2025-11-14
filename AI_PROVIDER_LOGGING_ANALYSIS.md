# AI Provider Library - Error Handling & Logging Analysis

This document provides a comprehensive analysis of error handling, user activity logging, and agent activity logging requirements for all AI provider library files.

---

## 1. lib/ai/providers/google/agentConfigLoader.ts

### Error Handling Tasks
- **Database Query Errors**: Handle failures from `getAdminConfig()` calls (lines 49, 88, 121, 154, 187)
  - Connection timeouts
  - Query execution failures
  - Invalid config data structure
- **Agent Initialization Errors**: Catch errors when instantiating specialized agents
  - Invalid configuration data
  - Missing required fields (systemPrompt, tools)
  - Agent constructor failures
- **API Key Validation**: Handle missing or invalid API keys
  - Empty string checks
  - Format validation
  - Key rotation scenarios
- **Configuration Propagation Errors**: Handle failures when setting keys/models on agents
  - Agent not yet loaded
  - Invalid model IDs

### User Activity Logging
- **Agent Loading Events**: Log when agents are loaded/enabled (NO user-specific data)
  - Timestamp of loading
  - Agent type (provider_tools, document, mermaid, python, git_mcp)
  - Success/failure status
  - Configuration source
- **Configuration Changes**: Log when API keys or models are set
  - Agent type affected
  - Model ID changed (not API key value)
  - Operation type (setApiKey, setModel, setGitHubPAT)

### Agent Activity Logging
- **Initialization Metrics**:
  - Agent load time (milliseconds)
  - Config fetch duration
  - Number of agents successfully loaded
  - Number of agents failed to load
- **Configuration State**:
  - Enabled agents list
  - Active model IDs per agent
  - API key status (present/absent, NOT the actual key)
- **Error Tracking**:
  - Failed config loads with error codes
  - Re-throw tracking (lines 78, 111, 144, 177, 210)

---

## 2. lib/ai/providers/google/agentToolBuilder.ts

### Error Handling Tasks
- **Configuration Validation Errors**: Handle missing tool descriptions/parameters (lines 41-57, 98-117, etc.)
  - Missing tool description
  - Missing parameter descriptions
  - Invalid tool configuration structure
- **Tool Execution Errors**: Catch errors during tool execution
  - Agent execution failures
  - Invalid input parameters
  - JSON serialization errors (lines 196-207)
- **Agent Availability Errors**: Handle cases where agents are not loaded
  - Null/undefined agent checks
  - Agent disabled scenarios
- **Parameter Validation Errors**: Validate tool input parameters
  - Required vs optional fields
  - Type mismatches
  - UUID format validation

### User Activity Logging
- **Tool Invocations**: Log every tool call (NO sensitive data from input)
  - Tool name (providerToolsAgent, documentAgent, mermaidAgent, pythonAgent, gitMcpAgent)
  - Operation type (create/update/revert/generate/fix)
  - Timestamp
  - Document/Diagram/Code ID (if applicable)
  - Target version (if applicable)
  - Input length (characters, NOT content)
- **Tool Results**: Log tool execution outcomes
  - Success/failure status
  - Output type (structured object vs string)
  - Execution duration

### Agent Activity Logging
- **Tool Building Metrics**:
  - Number of tools built
  - Enabled tools list (lines 28, 585-586)
  - Configuration validation time
- **Tool Execution Metrics**:
  - Execution time per tool
  - Success/failure rates per tool type
  - JSON serialization success rates
- **Error Rates**:
  - Configuration validation failures per tool
  - Tool execution failures per tool type
  - Parameter validation errors

---

## 3. lib/ai/providers/google/chat-agent.ts

### Error Handling Tasks
- **API Initialization Errors**: Handle Google provider initialization failures
  - Invalid API key
  - Network connectivity issues
  - Provider creation failures (line 49)
- **Model Configuration Errors**: Validate model availability and settings
  - Invalid model ID
  - Model not found in config
  - Disabled models
  - Missing default model
- **Streaming Errors**: Handle streaming failures
  - Stream interruption
  - Connection timeouts
  - Stream parsing errors
  - SSE transform errors
- **Agent Loading Errors**: Handle specialized agent loading failures (lines 167-171)
  - Config loader failures
  - Model setting failures
- **Tool Building Errors**: Handle tool builder failures
  - Invalid tool configurations
  - Tool execution errors
- **Configuration Validation Errors**: Validate agent config (lines 327-357)
  - Missing configuration
  - Agent disabled
  - No enabled models

### User Activity Logging
- **Chat Requests**: Log chat invocations (NO message content)
  - Timestamp
  - Chat ID
  - Model ID selected
  - Thinking mode enabled/disabled
  - Number of messages in conversation
  - Artifact context present/absent
- **Model Selection**: Log model usage
  - Model ID
  - Thinking mode support
  - File input enabled/disabled
- **Tool Usage**: Log when tools are used
  - Tools enabled (list)
  - Multi-step execution settings

### Agent Activity Logging
- **Streaming Performance**:
  - Stream initialization time
  - Total streaming duration
  - Bytes streamed
  - Stream completion status
- **Model Usage Metrics**:
  - Model ID used
  - Temperature setting (0.7)
  - Max steps configured (5)
  - Thinking budget (8192 if enabled)
- **Agent Coordination**:
  - Number of specialized agents loaded
  - Agent loading time
  - Model synchronization across agents
- **Error Tracking**:
  - API errors (line 289-291)
  - Stream errors
  - Configuration validation errors
  - Error recovery attempts

---

## 4. lib/ai/providers/google/document-agent-streaming.ts

### Error Handling Tasks
- **Database Errors**: Handle document database operations
  - Document not found (lines 294, 331)
  - Invalid document ID
  - Version not found (lines 326-334)
  - Save operation failures (lines 386-407)
- **Configuration Errors**: Handle tool config loading failures
  - Missing tool configs (lines 113-149)
  - Invalid systemPrompt or userPromptTemplate
  - Database config not found
- **Streaming Errors**: Handle streaming failures
  - Stream write failures
  - Stream interruption
  - DataStream unavailable
- **Operation Validation Errors**: Validate operation parameters
  - Missing documentId for update/revert/suggestion
  - Invalid operation type
  - Invalid version numbers (lines 315-322)
- **Content Processing Errors**: Handle content generation failures
  - Empty content
  - Invalid format
  - Generation timeout

### User Activity Logging
- **Document Operations**: Log all operations (NO document content)
  - Operation type (create/update/revert/suggestion)
  - Document ID
  - Instruction length (characters)
  - Target version (for revert)
  - Timestamp
  - Success/failure status
- **Version Management**: Log versioning events
  - Version created
  - Revert operations (from version X to version Y)
  - Parent version references

### Agent Activity Logging
- **Operation Metrics**:
  - Execution time per operation type
  - Document creation count
  - Update count
  - Revert count
  - Suggestion count
- **Streaming Metrics**:
  - Chunk count streamed
  - Total bytes streamed
  - Streaming duration
  - Chunk size (100 characters for revert)
- **Database Performance**:
  - Config load time
  - Document fetch time
  - Save operation duration
- **Error Tracking**:
  - Operation failures by type
  - Database errors
  - Validation errors
  - Tool config loading failures

---

## 5. lib/ai/providers/google/git-mcp-agent.ts

### Error Handling Tasks
- **MCP Connection Errors**: Handle MCP server connection failures (lines 84-156)
  - Network timeouts
  - Connection refused
  - Transport initialization failures
  - SSL/TLS errors
- **Authentication Errors**: Handle GitHub PAT validation (lines 142-149)
  - 401 Unauthorized
  - Invalid PAT format
  - Expired tokens
  - Missing required scopes
  - Token revocation
- **Tool Execution Errors**: Handle MCP tool call failures (lines 216-236)
  - Tool not found
  - Invalid parameters
  - Tool execution timeout
  - Rate limiting from GitHub API
- **Model Initialization Errors**: Handle Google AI setup failures
  - Invalid API key
  - Model not available
  - Provider initialization failure
- **Schema Conversion Errors**: Handle Zod schema generation (lines 186-210)
  - Unsupported parameter types
  - Invalid schema structure
  - Required field conflicts
- **Stream Processing Errors**: Handle streaming failures (lines 330-384)
  - Chunk parsing errors
  - Stream interruption
  - Incomplete responses

### User Activity Logging
- **GitHub Operations**: Log operation requests (NO repository content or code)
  - Timestamp
  - Operation type (query/search/read)
  - Input query length
  - Success/failure status
  - Error type (if failed)
- **MCP Session**: Log connection lifecycle
  - Connection established timestamp
  - Disconnection timestamp
  - Session duration
  - Readonly mode confirmed

### Agent Activity Logging
- **Connection Metrics**:
  - Connection establishment time
  - Connection success/failure rate
  - Reconnection attempts
  - Transport type (Streamable HTTP)
- **Tool Discovery**:
  - Number of MCP tools available
  - Tool names list (logged at line 286)
  - Schema conversion time
- **Execution Metrics**:
  - Total execution time
  - Number of tool calls made
  - Number of steps executed
  - Model reasoning time
  - Response length (characters)
- **Tool Call Details**:
  - Tool names used (lines 395-401)
  - Arguments size (not content)
  - Tool execution duration
  - Tool success/failure rates
- **Error Tracking**:
  - Authentication failures (401)
  - MCP client initialization errors
  - Tool execution errors
  - Stream processing errors
  - Cleanup operation status

---

## 6. lib/ai/providers/google/mermaid-agent-streaming.ts

### Error Handling Tasks
- **Database Errors**: Handle diagram database operations
  - Diagram not found (lines 484, 520)
  - Invalid diagram ID
  - Version not found
  - Save operation failures (lines 564-580)
- **Configuration Errors**: Handle tool config loading (lines 94-156)
  - Missing tool configs
  - Invalid systemPrompt or userPromptTemplate
  - Required field validation
- **Streaming Errors**: Handle streaming failures
  - Stream write errors
  - Stream interruption
  - DataStream unavailable
- **Operation Validation Errors**: Validate operation parameters
  - Missing diagramId for update/fix/revert
  - Invalid operation type
  - Invalid version numbers (lines 504-512)
- **Diagram Generation Errors**: Handle code generation failures
  - Invalid Mermaid syntax
  - Generation timeout
  - Empty output

### User Activity Logging
- **Diagram Operations**: Log all operations (NO diagram code content)
  - Operation type (generate/create/update/fix/revert)
  - Diagram ID
  - Instruction length (characters)
  - Target version (for revert)
  - Timestamp
  - Success/failure status
- **Version Management**: Log versioning events
  - Version created
  - Revert operations (from/to versions)
  - Fix operations applied

### Agent Activity Logging
- **Operation Metrics**:
  - Execution time per operation type
  - Generate count (non-streaming)
  - Create count (streaming)
  - Update count
  - Fix count
  - Revert count
- **Streaming Metrics**:
  - Bytes streamed
  - Streaming duration
  - Stream-to-UI vs non-streaming mode usage
- **Database Performance**:
  - Config load time
  - Diagram fetch time
  - Save operation duration
- **Error Tracking**:
  - Operation failures by type
  - Database errors
  - Validation errors
  - Syntax validation failures

---

## 7. lib/ai/providers/google/provider-tools-agent.ts

### Error Handling Tasks
- **Model Initialization Errors**: Handle Google AI setup (lines 42-55)
  - Invalid API key
  - Missing model ID
  - Provider not initialized
  - Model not available
- **Tool Execution Errors**: Handle Google native tool failures
  - Google Search API errors
  - URL Context fetch failures
  - Code Execution runtime errors
  - Tool timeout
  - Rate limiting
- **Configuration Validation Errors**: Validate agent config (lines 60-68)
  - Missing configuration
  - Agent disabled
  - Missing systemPrompt
- **Streaming Errors**: Handle streamText failures
  - Stream interruption
  - Incomplete responses
  - Chunk processing errors
- **Result Collection Errors**: Handle result aggregation
  - Tool call collection failures
  - Reasoning extraction errors
  - Text stream processing errors

### User Activity Logging
- **Tool Usage**: Log tool invocations (NO search queries or URLs)
  - Tool type (googleSearch/urlContext/codeExecution)
  - Timestamp
  - Input length (characters)
  - Success/failure status
- **Execution Results**: Log outcomes
  - Output length (characters)
  - Number of tool calls made
  - Execution duration

### Agent Activity Logging
- **Tool Building**:
  - Tools enabled list (line 91)
  - Tool configuration time
- **Execution Metrics**:
  - Total execution time
  - Text stream duration
  - Output length (line 130-131)
  - Tool call count (line 134-135)
- **Model Configuration**:
  - Model ID used
  - Temperature (0.7)
  - Thinking mode enabled/disabled
  - Thinking budget (4096 if enabled)
- **Tool Performance**:
  - Success/failure rates per tool type
  - Average execution time per tool
  - Reasoning token count
- **Error Tracking**:
  - Model initialization failures
  - Tool execution errors
  - Configuration validation errors

---

## 8. lib/ai/providers/google/python-agent-streaming.ts

### Error Handling Tasks
- **Database Errors**: Handle code database operations
  - Code artifact not found (lines 556, 588)
  - Invalid code ID
  - Version not found
  - Save operation failures (lines 634-651)
- **Configuration Errors**: Handle tool config loading (lines 99-170)
  - Missing tool configs
  - Invalid systemPrompt or userPromptTemplate
  - Required field validation for create/update/fix/explain/generate
- **Streaming Errors**: Handle streaming failures
  - Stream write errors
  - Stream interruption
  - DataStream unavailable
- **Operation Validation Errors**: Validate operation parameters
  - Missing codeId for update/fix/explain/revert
  - Invalid operation type
  - Invalid version numbers (lines 577-585)
- **Code Generation Errors**: Handle generation failures
  - Syntax errors
  - Generation timeout
  - Empty output
  - Runtime validation failures

### User Activity Logging
- **Code Operations**: Log all operations (NO code content)
  - Operation type (generate/create/update/fix/explain/revert)
  - Code ID
  - Instruction length (characters)
  - Target version (for revert)
  - Timestamp
  - Success/failure status
- **Version Management**: Log versioning events
  - Version created
  - Revert operations (from/to versions)
  - Fix/explain operations applied

### Agent Activity Logging
- **Operation Metrics**:
  - Execution time per operation type
  - Generate count (non-streaming)
  - Create count
  - Update count
  - Fix count
  - Explain count
  - Revert count
- **Streaming Metrics**:
  - Bytes streamed
  - Streaming duration
  - Stream-to-UI vs non-streaming mode usage
- **Database Performance**:
  - Config load time
  - Code fetch time
  - Save operation duration
- **Metadata Tracking**:
  - Update type metadata (explain/fix/update/revert)
  - Model used for each operation
  - Agent identification
- **Error Tracking**:
  - Operation failures by type
  - Database errors
  - Validation errors
  - Syntax errors

---

## 9. lib/ai/chat-agent-resolver.ts

### Error Handling Tasks
- **Database Query Errors**: Handle config fetch failures
  - App settings query errors (lines 37-38)
  - Chat agent config query errors (lines 78-80)
  - Model config query errors (line 89)
  - Connection timeouts
  - Invalid data structure
- **Configuration Errors**: Handle invalid configurations
  - Missing configuration (line 83)
  - Agent disabled (lines 120-122)
  - No active models found
  - Invalid provider type
- **Provider Initialization Errors**: Handle agent creation failures
  - Unknown provider (line 68)
  - Unimplemented providers (OpenAI, Anthropic - lines 61, 65)
  - Agent constructor failures
  - Configuration parsing errors
- **Model Configuration Errors**: Handle model setup issues
  - No models available
  - Invalid model data structure
  - Missing required model fields

### User Activity Logging
- **Provider Selection**: Log provider usage (NO user identity)
  - Active provider selected
  - Timestamp
  - Source (explicit parameter or app settings)
- **Agent Creation**: Log agent initialization
  - Provider type
  - Success/failure status
  - Number of available models
  - Default model ID

### Agent Activity Logging
- **Resolver Metrics**:
  - Agent creation time
  - Provider detection time
  - Config fetch duration
- **Configuration State**:
  - Active provider
  - Available providers list
  - Number of available models per provider
  - Default model per provider
- **Model Configuration**:
  - Model IDs loaded
  - Thinking mode support per model
  - File input support per model
  - Default model selection
- **Error Tracking**:
  - Config fetch failures (lines 39-44, 146)
  - Provider not found errors
  - Agent creation errors (lines 125-128)
  - Unimplemented provider access attempts

---

## 10. lib/ai/file-processing.ts

### Error Handling Tasks
- **File Fetch Errors**: Handle URL fetch failures (line 15)
  - Network timeouts
  - 404 Not Found
  - 403 Forbidden
  - Connection refused
  - Invalid URL
  - CORS errors
- **File Size Validation**: Handle oversized files (lines 102-105)
  - Files exceeding 10MB limit
  - Size calculation errors
  - Memory allocation failures
- **Content Type Errors**: Handle unsupported formats (lines 118-126)
  - Unsupported MIME types
  - Invalid media type format
  - Unknown file extensions
- **Parsing Errors**: Handle content parsing failures
  - JSON parse errors (lines 33-39)
  - Text encoding errors
  - Binary data handling
  - ArrayBuffer processing errors (line 44)
- **Validation Errors**: Handle file validation failures (lines 92-129)
  - Missing required properties (line 97-99)
  - Invalid file structure
  - Empty file names/URLs

### User Activity Logging
- **File Uploads**: Log file processing attempts (NO file content)
  - File name (sanitized)
  - Media type
  - File size (bytes/KB)
  - Timestamp
  - Success/failure status
  - Error type (if failed)
- **File Types**: Log file type distribution
  - Media type processed
  - File extension
  - Category (text/image/code/JSON/PDF)

### Agent Activity Logging
- **Processing Metrics**:
  - Total files processed
  - Processing time per file
  - Success/failure rates by file type
  - Average file size processed
- **Content Extraction**:
  - Text files extracted count
  - JSON files parsed count
  - Code files processed count
  - Image metadata extracted count
  - Unsupported format count
- **Validation Metrics**:
  - Validation pass rate
  - Size limit violations
  - Unsupported type rejections
  - Missing property errors
- **Error Tracking**:
  - Fetch failures by error type (404, 403, timeout, etc.)
  - Parse errors by file type
  - Validation failures by reason
  - Size limit violations

---

## Summary of Critical Logging Areas

### High-Priority Error Handling
1. **API Authentication**: Track auth failures across all agents
2. **Database Operations**: Monitor all document/config database errors
3. **Streaming Failures**: Detect and log stream interruptions
4. **Rate Limiting**: Track API rate limit hits
5. **Network Errors**: Monitor MCP connections, file fetches, API calls

### High-Priority User Activity Logging (NO PII/API KEYS)
1. **Operation Types**: Log all agent operations (create/update/search/etc.)
2. **Resource IDs**: Log document/diagram/code IDs used
3. **Request Sizes**: Log input lengths, file sizes (not content)
4. **Success Rates**: Track operation outcomes
5. **Timestamps**: Record all activity timestamps

### High-Priority Agent Activity Logging
1. **Performance Metrics**: Execution times, streaming durations, database query times
2. **Resource Usage**: Token counts, reasoning budgets, memory usage
3. **Tool Usage**: Tool call counts, tool types used, success rates
4. **Error Rates**: Error counts by type, agent, and operation
5. **Model Metrics**: Model IDs used, temperature settings, thinking mode usage
6. **Connection Health**: MCP connections, API availability, database connectivity

### Data Privacy Compliance
- **NEVER log**: API keys, PAT tokens, user email/names, message content, file content, code content, search queries
- **DO log**: Hashed user IDs (if needed), resource IDs, operation types, metrics, error codes, timestamps
