# API Routes Error Handling and Logging Analysis

## Overview
This document provides a comprehensive analysis of all API route files in the codebase, documenting their error handling, user activity logging, and agent activity logging requirements.

---

## 1. /app/api/admin/models/route.ts

### Error Handling Tasks

**GET /api/admin/models**
- **Authentication Errors (401/403)**:
  - Missing/invalid authentication token
  - Non-admin user attempting access
  - Currently logged via `logApiError` with `UNAUTHORIZED_ACCESS` category
- **Validation Errors (400)**:
  - Invalid provider parameter (not "google", "openai", or "anthropic")
  - Currently returns `bad_request:api` error
- **Database Errors (500)**:
  - `getAllModels()` failure
  - `getModelsByProvider()` failure
  - Currently logged via `logApiError` with `DATABASE_ERROR` category
  - Returns generic "Failed to retrieve models" message

**POST /api/admin/models**
- **Authentication Errors (401/403)**:
  - Missing/invalid authentication token
  - Non-admin user attempting access
  - Currently logged via `logApiError` with `UNAUTHORIZED_ACCESS` category
- **Validation Errors (400)**:
  - Missing required fields (modelId, name, provider, pricing)
  - Invalid provider enum value
  - Invalid data types
  - Currently uses Zod schema validation
  - Returns detailed validation error messages
- **JSON Parsing Errors (400)**:
  - Malformed request body
  - Returns "Invalid request body"
- **Database Errors (500)**:
  - Duplicate model ID (unique constraint violation)
  - `createModel()` failure
  - Currently logged via `logAdminError` with `CONFIG_UPDATE_FAILED` category
  - Returns generic "Failed to create model" message
- **Missing Error Handling**:
  - No rate limiting
  - No check for model ID format validity
  - No transaction rollback handling

### User Activity Logging

**Current Logging**:
- Authentication failures (with method, URL)
- Successful model creation (modelId, action: "create_model", full modelData)

**Missing Logging**:
- Successful GET requests (admin viewing models list)
- Provider filter usage in GET requests
- Failed model creation attempts (validation errors)
- User IP address
- Request timestamp
- Admin user ID on GET requests
- Number of models returned

**Privacy Considerations**:
- Avoid logging API keys if they're ever part of model metadata
- Current logging looks safe (pricing and config data)

### Agent Activity Logging

**Current Logging**:
- Database query failures with error messages

**Missing Logging**:
- Database query performance metrics (time to execute)
- Number of models retrieved
- GET request response time
- POST request processing time
- Validation time
- Cache hit/miss rates (if caching implemented)
- Provider distribution statistics

---

## 2. /app/api/admin/models/[modelId]/route.ts

### Error Handling Tasks

**GET /api/admin/models/[modelId]**
- **Authentication Errors (401/403)**:
  - Missing/invalid authentication token
  - Non-admin user attempting access
  - Currently logged via `logApiError` with `UNAUTHORIZED_ACCESS` category
- **Not Found Errors (404)**:
  - Model with specified modelId doesn't exist
  - Returns `not_found:api` error
- **Database Errors (500)**:
  - `getModelByModelId()` failure
  - Currently logged via `logApiError` with `DATABASE_ERROR` category
  - Returns generic "Failed to retrieve model" message
- **Missing Error Handling**:
  - No validation of modelId format
  - No rate limiting

**PATCH /api/admin/models/[modelId]**
- **Authentication Errors (401/403)**:
  - Missing/invalid authentication token
  - Non-admin user attempting access
  - Currently logged via `logApiError` with `UNAUTHORIZED_ACCESS` category
- **Validation Errors (400)**:
  - Invalid field values
  - Invalid data types
  - Currently uses Zod schema validation
  - Returns detailed validation error messages
- **JSON Parsing Errors (400)**:
  - Malformed request body
  - Returns "Invalid request body"
- **Database Errors (500)**:
  - Model not found
  - Constraint violations
  - `updateModel()` failure
  - Currently logged via `logAdminError` with `CONFIG_UPDATE_FAILED` category
  - Can return ChatSDKError or generic "Failed to update model"
- **Missing Error Handling**:
  - No optimistic locking (concurrent update protection)
  - No validation of whether update would break references

**DELETE /api/admin/models/[modelId]**
- **Authentication Errors (401/403)**:
  - Missing/invalid authentication token
  - Non-admin user attempting access
  - Currently logged via `logApiError` with `UNAUTHORIZED_ACCESS` category
- **Database Errors (500)**:
  - Model not found
  - Foreign key constraint violations (chats using this model)
  - `deleteModel()` failure
  - Currently logged via `logAdminError` with `CONFIG_UPDATE_FAILED` category
  - Can return ChatSDKError or generic "Failed to delete model"
- **Missing Error Handling**:
  - No check for active chats using the model
  - No cascade delete strategy documentation
  - No soft delete option

### User Activity Logging

**Current Logging**:
- Authentication failures (with method, URL)
- Successful model updates (modelId, action, updateData)
- Successful model deletions (modelId, action)

**Missing Logging**:
- Successful GET requests (which admin viewed which model)
- Failed update attempts (validation errors)
- Failed delete attempts
- What fields were changed in PATCH (diff)
- Previous values before update
- User IP address
- Request timestamps

**Privacy Considerations**:
- Logging looks safe (config data only)

### Agent Activity Logging

**Current Logging**:
- Database operation failures with error messages

**Missing Logging**:
- Database query performance metrics
- PATCH processing time (validation + database)
- DELETE operation time
- Whether deletion cascaded to other records
- Number of related records affected
- Cache invalidation operations

---

## 3. /app/api/admin/models/[modelId]/set-default/route.ts

### Error Handling Tasks

**POST /api/admin/models/[modelId]/set-default**
- **Authentication Errors (401/403)**:
  - Missing/invalid authentication token
  - Non-admin user attempting access
  - Currently logged via `logApiError` with `UNAUTHORIZED_ACCESS` category
- **Database Errors (500)**:
  - Model not found
  - Transaction failure (unsetting other defaults + setting new default)
  - `setModelAsDefault()` failure
  - Currently logged via `logAdminError` with `CONFIG_UPDATE_FAILED` category
  - Can return ChatSDKError or generic "Failed to set model as default"
- **Missing Error Handling**:
  - No validation of modelId format
  - No check if model is active before setting as default
  - No transaction rollback handling documentation
  - No idempotency handling (setting already-default model as default)

### User Activity Logging

**Current Logging**:
- Authentication failures (with method, URL)
- Successful default model changes (modelId, action: "set_default_model")

**Missing Logging**:
- Which model was previously default (provider context)
- Failed attempts
- User IP address
- Request timestamp
- Provider affected by the change

**Privacy Considerations**:
- Logging looks safe

### Agent Activity Logging

**Current Logging**:
- Database operation failures with error messages

**Missing Logging**:
- Database transaction performance
- Number of models affected (should be 2: old default, new default)
- Operation processing time
- Cache invalidation operations

---

## 4. /app/api/admin/config/summary/route.ts

### Error Handling Tasks

**GET /api/admin/config/summary**
- **Authentication Errors (401/403)**:
  - Missing/invalid authentication token
  - Non-admin user attempting access
  - Currently logged via `logApiError` with `UNAUTHORIZED_ACCESS` category
  - Logs full request headers
- **Database Errors (500)**:
  - `getAllAgentConfigs()` failure
  - `getAdminConfigSummary()` failure
  - Currently logged via `logApiError` with `DATABASE_ERROR` category
  - Returns generic "bad_request:database" error
- **Missing Error Handling**:
  - No timeout handling for potentially large dataset
  - No partial success handling if one query fails
  - No validation of VALID_AGENT_TYPES and VALID_PROVIDERS constants

### User Activity Logging

**Current Logging**:
- Authentication failures (with method, URL, full headers)

**Missing Logging**:
- Successful summary requests
- User IP address
- Request timestamp
- Response size
- Which admin user accessed the summary
- Time taken to generate summary

**Privacy Considerations**:
- Logging all headers could expose sensitive info
- Should filter out Authorization headers before logging

### Agent Activity Logging

**Current Logging**:
- Database operation failures with error messages

**Missing Logging**:
- Time to fetch all agent configs
- Time to compute provider stats
- Time to build comprehensive summary
- Number of configurations processed
- Cache hit/miss (if caching implemented)
- Total response generation time
- Size of response payload
- Database query count (multiple queries in this endpoint)

---

## 5. /app/(chat)/api/chat/route.ts

### Error Handling Tasks

**POST /api/(chat)/chat**
- **Validation Errors (400)**:
  - Schema validation failure via Zod
  - Returns generic "bad_request:api" error without details
  - Missing file name in file parts
- **Authentication Errors (401/403)**:
  - Missing/invalid authentication token
  - Returns error via `createAuthErrorResponse`
  - **NOT currently logged**
- **Authorization Errors (403)**:
  - User trying to add message to chat they don't own
  - Returns "forbidden:chat" error
  - **NOT currently logged**
- **Missing API Key (400)**:
  - Missing or empty x-google-api-key header
  - Returns generic "bad_request:api" error
  - **NOT currently logged**
- **Database Errors (500)**:
  - `getChatById()` failure
  - `saveChat()` failure
  - `getMessagesByChatId()` failure
  - `saveMessages()` failure
  - `getLatestDocumentVersionsByChat()` failure
  - `getLastDocumentInChat()` failure
  - Wrapped in generic catch, returns "offline:chat"
  - **Only console.error logging**
- **File Processing Errors**:
  - Invalid file attachment (validation)
  - File extraction failure
  - Currently caught but only console.error logged
  - Processing continues even if files fail
- **AI Model Errors**:
  - ChatAgent initialization failure
  - Model streaming failure
  - Token limit exceeded
  - Caught by outer try-catch, returns "offline:chat"
- **Missing Error Handling**:
  - No rate limiting
  - No request size validation
  - No file size validation before processing
  - No timeout on AI streaming
  - No validation of selectedChatModel existence
  - No handling of concurrent message additions
  - No transaction rollback on partial failures

**DELETE /api/(chat)/chat**
- **Validation Errors (400)**:
  - Missing id query parameter
  - Returns "bad_request:api" error
- **Authentication Errors (401/403)**:
  - Missing/invalid authentication token
  - Returns error via `createAuthErrorResponse`
  - **NOT currently logged**
- **Authorization Errors (403)**:
  - User trying to delete chat they don't own
  - Returns "forbidden:chat" error
  - **NOT currently logged**
- **Database Errors (500)**:
  - `getChatById()` failure
  - `deleteChatById()` failure
  - **No error handling or logging**
- **Missing Error Handling**:
  - No cascade delete validation
  - No soft delete option
  - No confirmation for delete operation

### User Activity Logging

**Current Logging**:
- File processing failures (console.error only)
- Unhandled errors (console.error only)
- Message parts for debugging (console.log)

**Missing Logging**:
- Chat creation events
- Message sent events
- File upload events (name, type, size, validation result)
- Model selection
- Thinking mode enabled/disabled
- Authentication failures
- Authorization failures
- Chat deletion events
- User IP address
- Request timestamps
- Message content length
- Number of file attachments
- GitHub PAT usage

**Privacy Considerations**:
- Do NOT log message content (contains user data)
- Do NOT log API keys
- Do NOT log GitHub PAT
- OK to log: user ID, chat ID, message ID, file metadata (not content)

### Agent Activity Logging

**Current Logging**:
- Message part processing (console.log for debugging)
- documentAgent output (console.log for debugging)

**Missing Logging**:
- Time to generate title
- Time to fetch messages from DB
- Time to fetch documents/artifacts
- Time to process files
- File extraction time per file
- AI model response time
- Token usage (input/output)
- Model used for response
- Streaming duration
- Database query times
- Total request processing time
- Number of messages in conversation
- Number of artifacts in context
- Context size sent to model

---

## 6. /app/(chat)/api/chat/[id]/stream/route.ts

### Error Handling Tasks

**GET /api/(chat)/chat/[id]/stream**
- This is a stub endpoint that returns 204 No Content
- No error handling needed currently
- **Future Implementation Needs**:
  - Authentication/authorization
  - Chat existence validation
  - Stream resumption logic
  - Rate limiting
  - Timeout handling

### User Activity Logging

**Current Logging**: None (endpoint is a stub)

**Future Logging Needs**:
- Stream resumption attempts
- Chat ID accessed
- User ID
- Position in stream

### Agent Activity Logging

**Current Logging**: None (endpoint is a stub)

**Future Logging Needs**:
- Stream performance metrics
- Data transfer rates
- Connection duration

---

## 7. /app/(chat)/api/document/route.ts

### Error Handling Tasks

**GET /api/(chat)/document**
- **Validation Errors (400)**:
  - Missing id query parameter
  - Currently logged via `logApiError` with `INVALID_REQUEST` category
  - Returns detailed error with context
- **Authentication Errors (401/403)**:
  - Missing/invalid authentication token
  - Currently logged via `logApiError` with `UNAUTHORIZED_ACCESS` category
  - Returns error via `createAuthErrorResponse`
- **Not Found Errors (404)**:
  - Document with specified ID doesn't exist
  - Currently logged via `logApiError` with `API_REQUEST_FAILED` category at INFO level
  - Returns "not_found:document" error
- **Authorization Errors (403)**:
  - User trying to access document they don't own
  - Currently logged via `logPermissionError` with `PERMISSION_DENIED` category
  - Logs both owner ID and requesting user ID
  - Returns "forbidden:document" error
- **Database Errors (500)**:
  - `getDocumentsById()` failure
  - Currently logged via `logApiError` with `DATABASE_ERROR` category
  - Returns generic "bad_request:database" error
- **Missing Error Handling**:
  - No rate limiting
  - No validation of document ID format

**POST /api/(chat)/document**
- **Validation Errors (400)**:
  - Missing id query parameter
  - Returns "Parameter id is required" error
  - **NOT currently logged**
- **Authentication Errors (401/403)**:
  - Missing/invalid authentication token
  - Returns error via `createAuthErrorResponse`
  - **NOT currently logged**
- **JSON Parsing Errors (400)**:
  - Malformed request body
  - Missing required fields (content, title, kind)
  - **No error handling, will throw unhandled error**
- **Authorization Errors (403)**:
  - User trying to update document they don't own
  - Returns "forbidden:document" error
  - **NOT currently logged**
- **Database Errors (500)**:
  - `getDocumentsById()` failure
  - `saveDocument()` failure
  - **No error handling or logging**
- **Missing Error Handling**:
  - No validation of content size
  - No validation of title length
  - No validation of kind enum
  - No schema validation (should use Zod)
  - No transaction handling
  - No optimistic locking

**DELETE /api/(chat)/document**
- **Validation Errors (400)**:
  - Missing id or timestamp query parameters
  - Returns specific error messages
  - **NOT currently logged**
- **Authentication Errors (401/403)**:
  - Missing/invalid authentication token
  - Returns error via `createAuthErrorResponse`
  - **NOT currently logged**
- **Authorization Errors (403)**:
  - User trying to delete document they don't own
  - Returns "forbidden:document" error
  - **NOT currently logged**
- **Database Errors (500)**:
  - `getDocumentsById()` failure
  - `deleteDocumentsByIdAfterTimestamp()` failure
  - **No error handling or logging**
- **Missing Error Handling**:
  - No validation of timestamp format
  - No check for future timestamps
  - No soft delete option

### User Activity Logging

**Current Logging**:
- GET authentication failures
- GET validation errors (missing id)
- GET document not found
- GET permission denied (with both user IDs)
- GET database errors

**Missing Logging**:
- Successful GET requests
- POST requests (success and failure)
- DELETE requests (success and failure)
- Document content size
- Document kind
- User IP address
- Request timestamps
- Number of versions returned

**Privacy Considerations**:
- Do NOT log document content (user data)
- Do NOT log document title (may contain sensitive info)
- OK to log: user ID, document ID, kind, size, operation type

### Agent Activity Logging

**Current Logging**:
- GET database query failures

**Missing Logging**:
- Database query performance (all operations)
- Document version count
- Content size statistics
- Operation processing times
- Number of documents deleted
- Timestamp range for deletions

---

## 8. /app/(chat)/api/history/route.ts

### Error Handling Tasks

**GET /api/(chat)/history**
- **Validation Errors (400)**:
  - Both starting_after and ending_before provided
  - Returns detailed error message
  - **NOT currently logged**
- **Authentication Errors (401/403)**:
  - Missing/invalid authentication token
  - Returns error via `createAuthErrorResponse`
  - **NOT currently logged**
- **Database Errors (500)**:
  - `getChatsByUserId()` failure
  - **No error handling or logging**
- **Missing Error Handling**:
  - No validation of limit (could be negative or excessive)
  - No validation of starting_after/ending_before format
  - No validation that cursor IDs exist
  - No rate limiting
  - No timeout on potentially large result sets

**DELETE /api/(chat)/history**
- **Authentication Errors (401/403)**:
  - Missing/invalid authentication token
  - Returns error via `createAuthErrorResponse`
  - **NOT currently logged**
- **Database Errors (500)**:
  - `deleteAllChatsByUserId()` failure
  - **No error handling or logging**
- **Missing Error Handling**:
  - No confirmation required for destructive operation
  - No rate limiting
  - No cascade delete validation
  - No soft delete option
  - No count of affected records returned

### User Activity Logging

**Current Logging**: None

**Missing Logging**:
- History access (which user accessed their history)
- Pagination parameters used
- Number of chats returned
- Delete all history events (critical security event)
- Authentication failures
- User IP address
- Request timestamps

**Privacy Considerations**:
- Do NOT log chat content
- OK to log: user ID, pagination params, chat count, operation type

### Agent Activity Logging

**Current Logging**: None

**Missing Logging**:
- Database query performance
- Number of chats deleted
- Deletion time
- Query result size
- Cache invalidation operations

---

## 9. /app/(chat)/api/suggestions/route.ts

### Error Handling Tasks

**GET /api/(chat)/suggestions**
- **Validation Errors (400)**:
  - Missing documentId query parameter
  - Returns "Parameter documentId is required" error
  - **NOT currently logged**
- **Authentication Errors (401/403)**:
  - Missing/invalid authentication token
  - Returns error via `createAuthErrorResponse`
  - **NOT currently logged**
- **Authorization Errors (403)**:
  - User trying to access suggestions for document they don't own
  - Returns "forbidden:api" error
  - **NOT currently logged**
- **Database Errors (500)**:
  - `getSuggestionsByDocumentId()` failure
  - **No error handling or logging**
- **Missing Error Handling**:
  - No validation of documentId format
  - No rate limiting
  - No handling of empty suggestion list vs. database error

### User Activity Logging

**Current Logging**: None

**Missing Logging**:
- Suggestions accessed (which document, which user)
- Authentication failures
- Authorization failures
- Number of suggestions returned
- User IP address
- Request timestamp

**Privacy Considerations**:
- Do NOT log suggestion content
- OK to log: user ID, document ID, suggestion count

### Agent Activity Logging

**Current Logging**: None

**Missing Logging**:
- Database query performance
- Number of suggestions retrieved
- Cache hit/miss (if implemented)

---

## 10. /app/(chat)/api/vote/route.ts

### Error Handling Tasks

**GET /api/(chat)/vote**
- **Validation Errors (400)**:
  - Missing chatId query parameter
  - Returns "Parameter chatId is required" error
  - **NOT currently logged**
- **Authentication Errors (401/403)**:
  - Missing/invalid authentication token
  - Returns error via `createAuthErrorResponse`
  - **NOT currently logged**
- **Not Found Errors (404)**:
  - Chat doesn't exist
  - Returns "not_found:chat" error
  - **NOT currently logged**
- **Authorization Errors (403)**:
  - User trying to access votes for chat they don't own
  - Returns "forbidden:vote" error
  - **NOT currently logged**
- **Database Errors (500)**:
  - `getChatById()` failure
  - `getVotesByChatId()` failure
  - **No error handling or logging**
- **Missing Error Handling**:
  - No validation of chatId format
  - No rate limiting

**PATCH /api/(chat)/vote**
- **Validation Errors (400)**:
  - Missing chatId, messageId, or type in request body
  - Returns detailed error message
  - **NOT currently logged**
- **JSON Parsing Errors (400)**:
  - Malformed request body
  - **No error handling, will throw unhandled error**
- **Authentication Errors (401/403)**:
  - Missing/invalid authentication token
  - Returns error via `createAuthErrorResponse`
  - **NOT currently logged**
- **Not Found Errors (404)**:
  - Chat doesn't exist
  - Returns "not_found:vote" error
  - **NOT currently logged**
- **Authorization Errors (403)**:
  - User trying to vote on chat they don't own
  - Returns "forbidden:vote" error
  - **NOT currently logged**
- **Database Errors (500)**:
  - `getChatById()` failure
  - `voteMessage()` failure
  - **No error handling or logging**
- **Missing Error Handling**:
  - No validation of type enum ("up" or "down")
  - No validation of messageId format
  - No validation that message exists
  - No validation that message belongs to chat
  - No idempotency handling (duplicate votes)
  - No rate limiting
  - No schema validation (should use Zod)

### User Activity Logging

**Current Logging**: None

**Missing Logging**:
- Vote events (critical for analytics)
- Vote type (up/down)
- Message being voted on
- Chat context
- Authentication failures
- Authorization failures
- User IP address
- Request timestamp
- Vote changes (changing from up to down or vice versa)

**Privacy Considerations**:
- OK to log all vote data (important for feedback)

### Agent Activity Logging

**Current Logging**: None

**Missing Logging**:
- Database operation performance
- Vote distribution statistics
- Cache invalidation operations

---

## Summary of Critical Gaps

### Error Handling Priorities

1. **Chat POST endpoint** (route 5): Most complex, minimal error logging
2. **Document POST/DELETE** (route 7): No error logging at all
3. **History DELETE** (route 8): Destructive operation, no logging
4. **Vote endpoints** (route 10): No validation or logging
5. **Missing schema validation**: Routes 7, 8, 9, 10 don't use Zod

### User Activity Logging Priorities

1. **Chat operations** (route 5): Critical user actions not logged
2. **History deletion** (route 8): Destructive action not logged
3. **Vote events** (route 10): Important feedback mechanism not logged
4. **Document access** (route 7): Only GET logged, POST/DELETE missing

### Agent Activity Logging Priorities

1. **Performance metrics**: Missing across all routes
2. **Chat AI operations** (route 5): Token usage, model timing not tracked
3. **Database query timing**: Missing everywhere
4. **Config summary** (route 4): Complex computation, no metrics

### Privacy Compliance Checklist

- Never log: message content, document content, API keys, GitHub PATs
- Safe to log: user IDs, resource IDs, timestamps, counts, sizes, operation types
- Be careful with: request headers (filter auth headers), user agents
