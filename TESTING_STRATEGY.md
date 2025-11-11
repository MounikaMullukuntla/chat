# Comprehensive Testing Strategy for Code-Chatbot

## Table of Contents
1. [Overview](#overview)
2. [Testing Architecture](#testing-architecture)
3. [Backend/API Testing](#backendapi-testing)
4. [Database Operations Testing](#database-operations-testing)
5. [Authentication & Authorization Testing](#authentication--authorization-testing)
6. [Agent Testing](#agent-testing)
7. [UI Integration Testing](#ui-integration-testing)
8. [Test Execution Plan](#test-execution-plan)

---

## Overview

This document outlines a comprehensive testing strategy for the code-chatbot multi-agent AI system. The application uses:
- **Next.js 15** with App Router
- **Supabase** for authentication and PostgreSQL database
- **Google Gemini AI** with multi-agent architecture
- **AI SDK v5** for streaming responses
- **Real-time artifact streaming** (documents, code, diagrams)

### Key Components to Test
1. **Backend APIs** - Chat, document, admin endpoints
2. **Database Operations** - CRUD, versioning, RLS policies
3. **Authentication** - User/admin roles, API key management
4. **AI Agents** - Chat, Document, Mermaid, Provider Tools
5. **Streaming** - Real-time content generation
6. **Artifacts** - Document/code/diagram creation and updates

---

## Testing Architecture

### Test Types
1. **Unit Tests** - Individual functions and utilities
2. **Integration Tests** - API routes and database queries
3. **Agent Tests** - AI agent behavior and tool execution
4. **E2E Tests** - Full user workflows with Playwright
5. **Manual Tests** - Complex scenarios requiring human verification

### Test Tools
- **Playwright** - E2E testing (already configured)
- **Jest/Vitest** - Unit and integration tests
- **Postman/Thunder Client** - API testing
- **Manual Testing** - Agent behavior verification

---

## Backend/API Testing

### 1. Chat API (`/api/chat`)

#### Test Cases

**TC-API-001: Basic Chat Request**
- **Method**: POST
- **Endpoint**: `/api/chat`
- **Auth**: Required (user token)
- **Payload**:
```json
{
  "id": "chat-uuid",
  "message": {
    "role": "user",
    "content": "Hello, how are you?"
  },
  "selectedChatModel": "gemini-2.0-flash-exp",
  "selectedVisibilityType": "private",
  "thinkingEnabled": false
}
```
- **Expected**: 
  - Status 200
  - SSE stream response
  - Chat message saved to database
  - Usage tracking recorded

**TC-API-002: Chat with Thinking Mode**
- **Payload**: Same as TC-API-001 but `thinkingEnabled: true`
- **Expected**: 
  - Reasoning tokens in response
  - Thinking process visible in stream

**TC-API-003: Chat with File Attachment**
- **Payload**: Include `attachments` array with file data
- **Expected**: 
  - File content extracted and processed
  - Context passed to agent

**TC-API-004: Rate Limiting**
- **Test**: Send 101 requests in one day
- **Expected**: 
  - First 100 succeed
  - 101st returns 429 Too Many Requests

**TC-API-005: Invalid Model ID**
- **Payload**: Use non-existent model ID
- **Expected**: 
  - Status 400
  - Error message about invalid model

**TC-API-006: Unauthorized Access**
- **Test**: Send request without auth token
- **Expected**: 
  - Status 401
  - Redirect to login

---

### 2. Document API (`/api/document`)

#### Test Cases

**TC-API-007: Get Document by ID**
- **Method**: GET
- **Endpoint**: `/api/document?id={uuid}`
- **Expected**: 
  - Latest version of document
  - Correct content and metadata

**TC-API-008: Get Document Versions**
- **Method**: GET
- **Endpoint**: `/api/document/versions?id={uuid}`
- **Expected**: 
  - All versions sorted by version_number
  - Version history with metadata

**TC-API-009: Delete Document**
- **Method**: DELETE
- **Endpoint**: `/api/document?id={uuid}`
- **Expected**: 
  - Document and all versions deleted
  - Cascade delete of suggestions

---

### 3. Admin API (`/api/admin`)

#### Test Cases

**TC-API-010: Get Admin Config (Admin User)**
- **Method**: GET
- **Endpoint**: `/api/admin/config?configKey=chat_model_agent_google`
- **Auth**: Admin token
- **Expected**: 
  - Status 200
  - Full config data returned

**TC-API-011: Get Admin Config (Regular User)**
- **Method**: GET
- **Endpoint**: `/api/admin/config?configKey=chat_model_agent_google`
- **Auth**: User token
- **Expected**: 
  - Status 403 Forbidden

**TC-API-012: Update Admin Config**
- **Method**: POST
- **Endpoint**: `/api/admin/config`
- **Auth**: Admin token
- **Payload**:
```json
{
  "configKey": "chat_model_agent_google",
  "configData": {
    "enabled": true,
    "systemPrompt": "Updated prompt"
  }
}
```
- **Expected**: 
  - Config updated in database
  - `updated_by` field set to admin user ID

**TC-API-013: Get Model Config**
- **Method**: GET
- **Endpoint**: `/api/admin/models`
- **Expected**: 
  - List of all available models
  - Pricing and capability information

---

## Database Operations Testing

### 1. User Management

#### Test Cases

**TC-DB-001: User Registration**
- **Operation**: Create new user via Supabase Auth
- **Verify**:
  - User created in `auth.users`
  - Default role set to 'user' in `raw_user_meta_data`
  - RLS policies allow user to access own data

**TC-DB-002: Admin User Creation**
- **Operation**: Create user with admin role
- **Verify**:
  - Role set to 'admin' in metadata
  - Can access admin-only tables
  - Can view all users' data

**TC-DB-003: User Deletion**
- **Operation**: Delete user from auth.users
- **Verify**:
  - All chats cascade deleted
  - All documents cascade deleted
  - All usage logs cascade deleted
  - Admin config updates preserved

---

### 2. Chat Operations

#### Test Cases

**TC-DB-004: Create Chat**
- **Operation**: Insert new chat
- **Verify**:
  - Chat created with correct user_id
  - Default visibility set
  - Timestamps populated

**TC-DB-005: Save Message**
- **Operation**: Insert message into Message_v2
- **Verify**:
  - Message linked to correct chat
  - Parts array contains content
  - Token usage tracked

**TC-DB-006: Get Chat History**
- **Operation**: Query messages for chat
- **Verify**:
  - Messages returned in chronological order
  - All message parts included
  - Attachments preserved

---

### 3. Document Operations

#### Test Cases

**TC-DB-007: Create Document (First Version)**
- **Operation**: Save new document
- **Verify**:
  - version_number = 1
  - parent_version_id = null
  - chat_id linked correctly

**TC-DB-008: Update Document (New Version)**
- **Operation**: Save document with same ID
- **Verify**:
  - version_number incremented
  - parent_version_id points to previous version
  - Original version preserved

**TC-DB-009: Get Document Versions**
- **Operation**: Query all versions of document
- **Verify**:
  - All versions returned
  - Sorted by version_number
  - Version chain intact

**TC-DB-010: Revert Document**
- **Operation**: Create new version from old version
- **Verify**:
  - New version created (non-destructive)
  - Content matches target version
  - Metadata tracks revert operation

---

### 4. Admin Config Operations

#### Test Cases

**TC-DB-011: Load Agent Config**
- **Operation**: Query admin_config by config_key
- **Verify**:
  - Correct config returned
  - JSON structure valid
  - Tools and prompts present

**TC-DB-012: Update Agent Config**
- **Operation**: Update config_data JSONB
- **Verify**:
  - Changes persisted
  - updated_by and updated_at set
  - Config immediately available to agents

**TC-DB-013: Validate System Prompts**
- **Operation**: Check all agent configs
- **Verify**:
  - systemPrompt field exists and not empty
  - Tool descriptions defined
  - Parameter descriptions defined

---

## Authentication & Authorization Testing

### 1. Admin Role Tests

#### Test Cases

**TC-AUTH-001: Admin Login**
- **Action**: Login with admin credentials
- **Verify**:
  - Admin tab visible in UI
  - Can access `/admin` routes
  - Can modify admin configs

**TC-AUTH-002: Admin Config Access**
- **Action**: Admin views agent configurations
- **Verify**:
  - All configs visible
  - Can edit system prompts
  - Can enable/disable tools

**TC-AUTH-003: Admin User Management**
- **Action**: Admin views usage logs
- **Verify**:
  - Can see all users' usage
  - Can filter by user/agent/date
  - Cost calculations correct

---

### 2. User Role Tests

#### Test Cases

**TC-AUTH-004: User Registration**
- **Action**: New user signs up
- **Verify**:
  - Account created successfully
  - Admin tab NOT visible
  - Cannot access `/admin` routes

**TC-AUTH-005: User API Key Management (Google)**
- **Action**: User saves Google API key
- **Verify**:
  - Key stored in localStorage (browser)
  - Key sent in request headers
  - Key NOT stored in database

**TC-AUTH-006: User Data Isolation**
- **Action**: User queries chats/documents
- **Verify**:
  - Only own data returned
  - RLS policies enforced
  - Cannot access other users' data

---

### 3. API Key Tests

#### Test Cases

**TC-AUTH-007: Valid API Key**
- **Action**: Send chat request with valid Google API key
- **Verify**:
  - Request succeeds
  - Agent uses provided key
  - Response generated

**TC-AUTH-008: Invalid API Key**
- **Action**: Send chat request with invalid key
- **Verify**:
  - Request fails with clear error
  - Error message indicates API key issue
  - No partial response generated

**TC-AUTH-009: Missing API Key**
- **Action**: Send chat request without API key
- **Verify**:
  - Request fails
  - Error message prompts user to add key
  - Redirected to settings

---

## Agent Testing

### 1. Chat Agent Tests

#### Test Cases

**TC-AGENT-001: Direct Response**
- **Prompt**: "Hello, how are you?"
- **Expected**:
  - Chat agent responds directly
  - No tool calls
  - Conversational response

**TC-AGENT-002: Thinking Mode**
- **Prompt**: "Explain quantum computing in simple terms"
- **Model**: gemini-2.0-flash-thinking-exp
- **Thinking**: Enabled
- **Expected**:
  - Reasoning process visible
  - Structured explanation
  - Thinking tokens tracked

**TC-AGENT-003: File Processing**
- **Prompt**: "Summarize this document"
- **Attachment**: PDF file
- **Expected**:
  - File content extracted
  - Summary generated
  - File context used in response

**TC-AGENT-004: Multi-Step Execution**
- **Prompt**: "Search for Python tutorials and create a learning plan"
- **Expected**:
  - Step 1: Calls provider tools agent (search)
  - Step 2: Receives search results
  - Step 3: Generates learning plan
  - Final response integrates both

---

### 2. Provider Tools Agent Tests

#### Test Cases

**TC-AGENT-005: Google Search Tool**
- **Prompt**: "What are the latest AI developments in 2024?"
- **Expected**:
  - Chat agent delegates to provider tools agent
  - Google Search tool executed
  - Current web results returned
  - Results integrated into response

**TC-AGENT-006: Code Execution Tool**
- **Prompt**: "Calculate the factorial of 10"
- **Expected**:
  - Provider tools agent executes Python code
  - Result: 3,628,800
  - Code and output shown to user

**TC-AGENT-007: URL Context Tool**
- **Prompt**: "Analyze this webpage: https://example.com"
- **Expected**:
  - URL content fetched
  - Summary generated
  - Key points extracted

---

### 3. Document Agent Tests

#### Scenario 1: Create New Document

**TC-AGENT-008: Create Text Document**
- **Prompt**: "Create a document about machine learning basics"
- **Expected**:
  - Document agent called
  - Content streamed in real-time
  - Document saved to database
  - Artifact displayed in side panel
  - Version 1 created

**TC-AGENT-009: Create Spreadsheet**
- **Prompt**: "Create a CSV with sample sales data"
- **Expected**:
  - Sheet artifact created
  - CSV format correct
  - Data grid displayed
  - Kind = 'sheet'

#### Scenario 2: Update Document

**TC-AGENT-010: Update Text Document**
- **Setup**: Existing document with ID
- **Prompt**: "Update the document to add a section on neural networks"
- **Expected**:
  - Document agent identifies document ID from context
  - Updated content streamed
  - Version 2 created
  - parent_version_id points to version 1

#### Scenario 3: Manual Edit

**TC-AGENT-011: Manual Document Edit**
- **Action**: User edits document directly in UI
- **Expected**:
  - Changes saved to database
  - New version created
  - metadata.updateType = 'manual'

#### Scenario 4: Request Suggestions

**TC-AGENT-012: Generate Suggestions**
- **Prompt**: "Suggest improvements for this document"
- **Expected**:
  - Document agent analyzes content
  - Suggestions generated and saved
  - Suggestions table populated
  - User can apply suggestions

**TC-AGENT-013: Apply Suggestion**
- **Action**: User clicks "Apply" on suggestion
- **Expected**:
  - Document updated with suggestion
  - New version created
  - Suggestion marked as resolved

#### Scenario 5: Final Polish

**TC-AGENT-014: Polish Document**
- **Prompt**: "Polish this document for professional presentation"
- **Expected**:
  - Grammar and style improvements
  - Formatting enhanced
  - New version created

#### Scenario 6: Multiple Documents

**TC-AGENT-015: Create Doc 1, Random Question, Create Doc 2, Update Doc 1**
- **Step 1**: "Create a document about Python"
- **Step 2**: "What is the weather today?" (random question)
- **Step 3**: "Create a document about JavaScript"
- **Step 4**: "Update the Python document to add examples"
- **Expected**:
  - Doc 1 created (Python)
  - Chat agent responds to weather question
  - Doc 2 created (JavaScript)
  - Doc 1 updated correctly (agent identifies correct document)

#### Scenario 7: Revert to Previous Version

**TC-AGENT-016: Revert to Previous**
- **Setup**: Document with 3 versions
- **Prompt**: "Revert to the previous version"
- **Expected**:
  - Version 2 content restored
  - New version 4 created (non-destructive)
  - metadata tracks revert operation

#### Scenario 8: Revert to Specific Version

**TC-AGENT-017: Revert to Version 3 Back**
- **Setup**: Document with 5 versions (current = v5)
- **Prompt**: "Revert to version 2"
- **Expected**:
  - Version 2 content restored
  - New version 6 created
  - metadata.revertedFrom = 5, revertedTo = 2

#### Scenario 9: Check Diff

**TC-AGENT-018: View Diff with Previous Version**
- **Action**: User clicks "View Diff" in UI
- **Expected**:
  - Diff view shows changes
  - Additions highlighted in green
  - Deletions highlighted in red
  - Line-by-line comparison

---

### 4. Mermaid Agent Tests

#### Scenario 1: Create Diagram

**TC-AGENT-019: Create Flowchart**
- **Prompt**: "Create a flowchart for user authentication"
- **Expected**:
  - Mermaid agent called
  - Valid Mermaid syntax generated
  - Diagram rendered in artifact panel
  - Kind = 'mermaid code'

#### Scenario 2: Update Diagram

**TC-AGENT-020: Update Diagram**
- **Setup**: Existing Mermaid diagram
- **Prompt**: "Add a step for password reset"
- **Expected**:
  - Diagram updated with new step
  - Syntax remains valid
  - New version created

#### Scenario 3: Manual Diagram Edit

**TC-AGENT-021: Manual Edit**
- **Action**: User edits Mermaid code directly
- **Expected**:
  - Changes saved
  - Diagram re-rendered
  - New version created if valid

#### Scenario 4: Zoom Controls

**TC-AGENT-022: Zoom In/Out/Reset**
- **Action**: User clicks zoom buttons
- **Expected**:
  - Diagram scales correctly
  - Reset returns to 100%
  - No data loss

#### Scenario 5: Improve Diagram

**TC-AGENT-023: Improve Diagram**
- **Prompt**: "Improve the diagram layout and add colors"
- **Expected**:
  - Enhanced diagram generated
  - Better visual hierarchy
  - Colors applied

#### Scenario 6: In-Chat Diagram

**TC-AGENT-024: Generate Diagram (No Artifact)**
- **Prompt**: "Show me a quick diagram of MVC architecture"
- **Expected**:
  - Mermaid code generated
  - Rendered inline in chat
  - NOT saved as artifact

#### Scenario 7: Fix Syntax Issue

**TC-AGENT-025: Fix Syntax Error**
- **Setup**: Diagram with syntax error
- **Prompt**: "Fix the syntax error in this diagram"
- **Expected**:
  - Error identified
  - Corrected syntax generated
  - Diagram renders successfully

#### Scenario 8: Delegated Generation

**TC-AGENT-026: Chat Agent Pre-Generates**
- **Prompt**: "Create a simple diagram showing A → B → C"
- **Expected**:
  - Chat agent generates Mermaid code
  - Passes to Mermaid agent for injection
  - Artifact created without re-generation

#### Scenario 9: Revert to Previous

**TC-AGENT-027: Revert Diagram**
- **Setup**: Diagram with 2 versions
- **Prompt**: "Revert to the previous version"
- **Expected**:
  - Previous diagram restored
  - New version created

#### Scenario 10: Revert to Specific Version

**TC-AGENT-028: Revert to Version 3 Back**
- **Setup**: Diagram with 5 versions
- **Prompt**: "Restore version 2"
- **Expected**:
  - Version 2 restored
  - New version 6 created

#### Scenario 11: Check Diff

**TC-AGENT-029: View Diagram Diff**
- **Action**: User views diff between versions
- **Expected**:
  - Code diff displayed
  - Side-by-side comparison
  - Changes highlighted

#### Scenario 12: Multiple Diagrams

**TC-AGENT-030: Create Diagram 1, Random Question, Create Diagram 2, Update Diagram 1**
- **Step 1**: "Create a flowchart for login"
- **Step 2**: "What is React?"
- **Step 3**: "Create a sequence diagram for API calls"
- **Step 4**: "Update the login flowchart to add 2FA"
- **Expected**:
  - Diagram 1 created
  - Chat response to React question
  - Diagram 2 created
  - Diagram 1 updated correctly

---

## UI Integration Testing

### Test Cases

**TC-UI-001: Chat Interface**
- **Test**: Send message and receive response
- **Verify**:
  - Message appears in chat
  - Response streams in real-time
  - Thinking mode toggle works

**TC-UI-002: Artifact Panel**
- **Test**: Create document artifact
- **Verify**:
  - Side panel opens automatically
  - Content streams in real-time
  - Toolbar shows correct options

**TC-UI-003: Version History**
- **Test**: View document versions
- **Verify**:
  - All versions listed
  - Can switch between versions
  - Diff view works

**TC-UI-004: Settings Page**
- **Test**: Save API key
- **Verify**:
  - Key saved to localStorage
  - Validation works
  - Key used in requests

**TC-UI-005: Admin Dashboard**
- **Test**: Admin views configurations
- **Verify**:
  - All agent configs visible
  - Can edit and save
  - Changes reflected immediately

---

## Test Execution Plan

### Phase 1: Backend/API Testing (Week 1)
1. Set up API testing environment (Postman/Thunder Client)
2. Execute TC-API-001 through TC-API-013
3. Document results and issues
4. Fix critical bugs

### Phase 2: Database Testing (Week 1-2)
1. Set up test database
2. Execute TC-DB-001 through TC-DB-013
3. Verify RLS policies
4. Test cascade deletes

### Phase 3: Authentication Testing (Week 2)
1. Create test admin and user accounts
2. Execute TC-AUTH-001 through TC-AUTH-009
3. Verify role-based access
4. Test API key management

### Phase 4: Agent Testing - Basic (Week 2-3)
1. Execute TC-AGENT-001 through TC-AGENT-007
2. Test chat agent and provider tools
3. Verify tool delegation
4. Document agent behavior

### Phase 5: Agent Testing - Document (Week 3-4)
1. Execute TC-AGENT-008 through TC-AGENT-018
2. Test all document scenarios
3. Verify versioning and revert
4. Test suggestions workflow

### Phase 6: Agent Testing - Mermaid (Week 4-5)
1. Execute TC-AGENT-019 through TC-AGENT-030
2. Test all diagram scenarios
3. Verify syntax fixing
4. Test version management

### Phase 7: UI Integration (Week 5)
1. Execute TC-UI-001 through TC-UI-005
2. Test with Playwright
3. Verify real-time streaming
4. Test responsive design

### Phase 8: Regression Testing (Week 6)
1. Re-run all critical tests
2. Verify bug fixes
3. Performance testing
4. Load testing

---

## Test Data Requirements

### Users
- Admin user: `admin@test.com` / `Admin123!`
- Regular user 1: `user1@test.com` / `User123!`
- Regular user 2: `user2@test.com` / `User123!`

### API Keys
- Valid Google API key for testing
- Invalid API key for error testing

### Sample Documents
- Text document (500 words)
- Spreadsheet (10 rows × 5 columns)
- Mermaid flowchart
- Mermaid sequence diagram

### Sample Prompts
- See TEST_PROMPTS.md for detailed prompts

---

## Success Criteria

### Backend/API
- ✅ All API endpoints return correct status codes
- ✅ Rate limiting works as configured
- ✅ Error handling is consistent

### Database
- ✅ All CRUD operations work correctly
- ✅ Versioning system functions properly
- ✅ RLS policies enforce access control
- ✅ Cascade deletes work as expected

### Authentication
- ✅ Admin and user roles work correctly
- ✅ API key management is secure
- ✅ Unauthorized access is blocked

### Agents
- ✅ Chat agent orchestrates correctly
- ✅ Provider tools agent executes tools
- ✅ Document agent creates/updates/reverts
- ✅ Mermaid agent generates valid diagrams
- ✅ Multi-step execution works
- ✅ Thinking mode functions properly

### UI
- ✅ Real-time streaming works smoothly
- ✅ Artifacts display correctly
- ✅ Version history is accessible
- ✅ Settings persist correctly

---

## Risk Areas

### High Risk
1. **Agent Tool Execution** - Complex delegation logic
2. **Version Management** - Non-destructive reverts
3. **Real-time Streaming** - SSE connection stability
4. **API Key Security** - localStorage vs database

### Medium Risk
1. **Rate Limiting** - Edge cases and resets
2. **File Processing** - Large file handling
3. **Concurrent Updates** - Race conditions
4. **Database Performance** - Query optimization

### Low Risk
1. **UI Rendering** - Standard React components
2. **Authentication** - Supabase handles most logic
3. **Static Content** - Markdown rendering

---

## Automation Recommendations

### High Priority for Automation
1. API endpoint tests (TC-API-*)
2. Database CRUD tests (TC-DB-*)
3. Authentication tests (TC-AUTH-*)

### Medium Priority for Automation
1. Basic agent tests (TC-AGENT-001 to TC-AGENT-007)
2. UI integration tests (TC-UI-*)

### Manual Testing Required
1. Complex agent scenarios (multi-step, context switching)
2. Thinking mode verification
3. Diagram visual quality
4. User experience flows

---

## Next Steps

1. **Review this strategy** with the team
2. **Set up test environment** (test database, API keys)
3. **Create test data** (users, documents, diagrams)
4. **Begin Phase 1** (Backend/API testing)
5. **Document results** in test tracking sheet
6. **Iterate and improve** based on findings

---

## Appendix

### Test Tracking Template

| Test ID | Description | Status | Result | Notes | Date |
|---------|-------------|--------|--------|-------|------|
| TC-API-001 | Basic Chat Request | ⏳ Pending | - | - | - |
| TC-API-002 | Chat with Thinking | ⏳ Pending | - | - | - |
| ... | ... | ... | ... | ... | ... |

### Status Codes
- ⏳ Pending
- 🔄 In Progress
- ✅ Passed
- ❌ Failed
- ⚠️ Blocked

---

**Document Version**: 1.0  
**Last Updated**: 2024-11-10  
**Author**: Testing Team  
**Reviewers**: Development Team, Product Owner
