# Integration Flow Tests

This directory contains integration tests for complex workflows and flows in the CodeChat application.

## Test Files

### Document Lifecycle Tests (`document-lifecycle.test.ts`)

Comprehensive integration tests for the complete document lifecycle including:

#### Test Coverage

1. **Document Creation Flow**
   - Creating new text documents
   - Creating Python code documents
   - Creating Mermaid diagram documents
   - Verifying initial version (v1) creation

2. **Document Update Flow with Versioning**
   - Creating subsequent versions (v2, v3, v4...)
   - Preserving all previous versions
   - Sequential version number assignment
   - Parent version tracking

3. **Version Comparison Flow**
   - Retrieving specific versions by version number
   - Getting latest version
   - Listing all versions in order
   - Comparing content between versions

4. **Version Revert Flow**
   - Reverting to previous versions (non-destructive)
   - Maintaining complete version history
   - Deleting versions after timestamp (destructive operations)

5. **Suggestion Generation and Acceptance**
   - Saving suggestions for documents
   - Accepting suggestions by creating new versions
   - Handling multiple suggestions independently
   - Tracking suggestion metadata

6. **Concurrent Edits Handling**
   - Handling rapid sequential updates
   - Maintaining data integrity with concurrent edits
   - Ensuring unique version numbers
   - Preserving all concurrent changes

7. **Document Retrieval and Filtering**
   - Getting all documents in a chat
   - Getting only latest versions
   - Filtering by document kind (text, python, mermaid)

8. **Error Handling**
   - Invalid document IDs
   - Invalid version numbers
   - Empty chat IDs

9. **Complete Document Lifecycle Journey**
   - End-to-end test: create → edit → suggest → accept → revert
   - Verifying complete version history

#### Running These Tests

```bash
# Run all integration flow tests
pnpm test:integration tests/integration/flows

# Run only document lifecycle tests
pnpm test:integration tests/integration/flows/document-lifecycle.test.ts

# Run with coverage
pnpm test:coverage tests/integration/flows/document-lifecycle.test.ts

# Run in watch mode
pnpm test:watch tests/integration/flows/document-lifecycle.test.ts
```

#### Test Structure

Each test follows the AAA pattern:
- **Arrange**: Set up test data (users, chats, documents)
- **Act**: Execute the functionality being tested
- **Assert**: Verify expected outcomes

Tests use:
- `beforeEach`: Create test user and chat for isolation
- `afterEach`: Clean up all test data to prevent pollution

#### Dependencies

These tests require:
- Supabase client (for database operations)
- Test helpers (`db-helpers.ts`)
- Document query functions (`lib/db/queries/document.ts`)

#### Test Data Isolation

Each test:
- Creates its own test user and chat
- Uses unique document IDs
- Cleans up all data after completion
- Runs independently without side effects

## Future Flow Tests

Additional flow tests to be implemented:

- **Multi-Agent Orchestration Tests**: Testing agent collaboration
- **Streaming Tests**: Testing real-time document streaming
- **Chat Flow Tests**: Testing complete chat workflows
- **GitHub MCP Flow Tests**: Testing GitHub integration flows
