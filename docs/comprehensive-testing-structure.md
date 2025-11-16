# Comprehensive Testing Structure

This document defines a complete testing structure that covers all components, endpoints, flows, and features identified in the codebase documentation.

## Testing Folder Structure

```
tests/
├── unit/
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── agents/
│   │   │   │   ├── chat-agent.test.ts
│   │   │   │   ├── provider-tools-agent.test.ts
│   │   │   │   ├── document-agent.test.ts
│   │   │   │   ├── python-agent.test.ts
│   │   │   │   ├── mermaid-agent.test.ts
│   │   │   │   └── git-mcp-agent.test.ts
│   │   │   ├── chat-agent-resolver.test.ts
│   │   │   ├── tool-builder.test.ts
│   │   │   ├── provider-abstraction.test.ts
│   │   │   ├── model-config.test.ts
│   │   │   └── streaming.test.ts
│   │   ├── db/
│   │   │   ├── queries/
│   │   │   │   ├── chat.test.ts
│   │   │   │   ├── message.test.ts
│   │   │   │   ├── document.test.ts
│   │   │   │   ├── suggestion.test.ts
│   │   │   │   ├── vote.test.ts
│   │   │   │   ├── stream.test.ts
│   │   │   │   ├── admin-config.test.ts
│   │   │   │   ├── model-config.test.ts
│   │   │   │   ├── usage-logs.test.ts
│   │   │   │   ├── rate-limit-tracking.test.ts
│   │   │   │   ├── github-repositories.test.ts
│   │   │   │   ├── error-logs.test.ts
│   │   │   │   ├── user-activity-logs.test.ts
│   │   │   │   └── agent-activity-logs.test.ts
│   │   │   ├── functions/
│   │   │   │   ├── validate-user-id.test.ts
│   │   │   │   ├── get-current-user-usage-summary.test.ts
│   │   │   │   ├── check-rate-limit.test.ts
│   │   │   │   ├── record-rate-limit-hit.test.ts
│   │   │   │   ├── cleanup-old-rate-limits.test.ts
│   │   │   │   ├── get-user-github-repos.test.ts
│   │   │   │   ├── log-error.test.ts
│   │   │   │   ├── get-recent-errors.test.ts
│   │   │   │   ├── log-user-activity.test.ts
│   │   │   │   ├── get-user-activity-summary.test.ts
│   │   │   │   ├── log-agent-activity.test.ts
│   │   │   │   └── get-agent-performance-metrics.test.ts
│   │   │   ├── triggers/
│   │   │   │   ├── chat-updated-trigger.test.ts
│   │   │   │   ├── message-created-trigger.test.ts
│   │   │   │   ├── document-updated-trigger.test.ts
│   │   │   │   ├── suggestion-created-trigger.test.ts
│   │   │   │   ├── vote-created-trigger.test.ts
│   │   │   │   └── cross-schema-validation.test.ts
│   │   │   ├── rls/
│   │   │   │   ├── chat-policies.test.ts
│   │   │   │   ├── message-policies.test.ts
│   │   │   │   ├── document-policies.test.ts
│   │   │   │   ├── suggestion-policies.test.ts
│   │   │   │   ├── vote-policies.test.ts
│   │   │   │   ├── stream-policies.test.ts
│   │   │   │   ├── admin-config-policies.test.ts
│   │   │   │   ├── model-config-policies.test.ts
│   │   │   │   ├── usage-logs-policies.test.ts
│   │   │   │   ├── rate-limit-policies.test.ts
│   │   │   │   ├── github-repos-policies.test.ts
│   │   │   │   ├── error-logs-policies.test.ts
│   │   │   │   ├── user-activity-policies.test.ts
│   │   │   │   └── agent-activity-policies.test.ts
│   │   │   └── migrations/
│   │   │       ├── migration-execution.test.ts
│   │   │       ├── rollback.test.ts
│   │   │       └── verification.test.ts
│   │   ├── verification/
│   │   │   ├── google-verification-service.test.ts
│   │   │   ├── github-verification-service.test.ts
│   │   │   ├── verification-error-codes.test.ts
│   │   │   └── verification-caching.test.ts
│   │   ├── storage/
│   │   │   ├── local-storage-manager.test.ts
│   │   │   ├── blob-storage.test.ts
│   │   │   ├── storage-helpers.test.ts
│   │   │   ├── mask-key.test.ts
│   │   │   ├── is-key-expired.test.ts
│   │   │   └── format-verification-time.test.ts
│   │   ├── github/
│   │   │   ├── mcp-operations.test.ts
│   │   │   ├── file-tree-builder.test.ts
│   │   │   ├── repository-fetcher.test.ts
│   │   │   ├── scope-validator.test.ts
│   │   │   └── pat-handler.test.ts
│   │   └── utils/
│   │       ├── helpers.test.ts
│   │       ├── formatters.test.ts
│   │       ├── validators.test.ts
│   │       └── sanitizers.test.ts
│   └── components/
│       ├── chat/
│       │   ├── artifact.test.tsx
│       │   ├── chat.test.tsx
│       │   ├── message.test.tsx
│       │   ├── multimodal-input.test.tsx
│       │   ├── file-preview.test.tsx
│       │   ├── thinking-display.test.tsx
│       │   └── message-parts.test.tsx
│       ├── github/
│       │   ├── github-repo-modal.test.tsx
│       │   ├── github-file-browser.test.tsx
│       │   ├── file-tree-node.test.tsx
│       │   └── repository-selector.test.tsx
│       ├── settings/
│       │   ├── settings-page.test.tsx
│       │   ├── api-key-input.test.tsx
│       │   ├── verification-status.test.tsx
│       │   ├── storage-info.test.tsx
│       │   └── model-config-panel.test.tsx
│       ├── admin/
│       │   ├── admin-dashboard.test.tsx
│       │   ├── config-editor.test.tsx
│       │   ├── usage-stats.test.tsx
│       │   └── error-logs-viewer.test.tsx
│       ├── model/
│       │   ├── model-selector.test.tsx
│       │   ├── provider-badge.test.tsx
│       │   └── capability-indicator.test.tsx
│       └── common/
│           ├── infinite-scroll.test.tsx
│           ├── loading-spinner.test.tsx
│           └── error-boundary.test.tsx
├── integration/
│   ├── api/
│   │   ├── chat/
│   │   │   ├── route.test.ts
│   │   │   ├── streaming.test.ts
│   │   │   ├── error-handling.test.ts
│   │   │   └── rate-limiting.test.ts
│   │   ├── files/
│   │   │   ├── upload.test.ts
│   │   │   ├── validation.test.ts
│   │   │   ├── blob-storage.test.ts
│   │   │   └── file-types.test.ts
│   │   ├── history/
│   │   │   ├── route.test.ts
│   │   │   ├── pagination.test.ts
│   │   │   ├── infinite-scroll.test.ts
│   │   │   └── filtering.test.ts
│   │   ├── documents/
│   │   │   ├── create.test.ts
│   │   │   ├── update.test.ts
│   │   │   ├── revert.test.ts
│   │   │   └── lifecycle.test.ts
│   │   ├── suggestions/
│   │   │   ├── create.test.ts
│   │   │   ├── list.test.ts
│   │   │   └── voting.test.ts
│   │   ├── admin/
│   │   │   ├── config-summary.test.ts
│   │   │   ├── config-update.test.ts
│   │   │   ├── model-config.test.ts
│   │   │   └── usage-stats.test.ts
│   │   ├── github/
│   │   │   ├── repositories.test.ts
│   │   │   ├── file-fetching.test.ts
│   │   │   ├── folder-fetching.test.ts
│   │   │   └── mcp-integration.test.ts
│   │   └── verification/
│   │       ├── google-verify.test.ts
│   │       ├── github-verify.test.ts
│   │       └── verification-flow.test.ts
│   ├── flows/
│   │   ├── document-lifecycle.test.ts
│   │   ├── agent-orchestration.test.ts
│   │   ├── multimodal-input-flow.test.ts
│   │   ├── file-upload-flow.test.ts
│   │   ├── github-integration-flow.test.ts
│   │   ├── thinking-mode-flow.test.ts
│   │   ├── artifact-creation-flow.test.ts
│   │   ├── model-switching-flow.test.ts
│   │   ├── api-key-verification-flow.test.ts
│   │   ├── chat-history-flow.test.ts
│   │   └── streaming-response-flow.test.ts
│   ├── database/
│   │   ├── transaction-integrity.test.ts
│   │   ├── cascade-operations.test.ts
│   │   ├── index-performance.test.ts
│   │   ├── rls-enforcement.test.ts
│   │   └── seed-data.test.ts
│   └── agents/
│       ├── chat-agent-integration.test.ts
│       ├── provider-tools-integration.test.ts
│       ├── document-agent-integration.test.ts
│       ├── python-agent-integration.test.ts
│       ├── mermaid-agent-integration.test.ts
│       ├── git-mcp-integration.test.ts
│       └── multi-agent-collaboration.test.ts
├── e2e/
│   ├── chat/
│   │   ├── chat-session.spec.ts
│   │   ├── message-streaming.spec.ts
│   │   ├── thinking-mode.spec.ts
│   │   ├── model-selection.spec.ts
│   │   └── error-recovery.spec.ts
│   ├── documents/
│   │   ├── document-creation.spec.ts
│   │   ├── document-editing.spec.ts
│   │   ├── document-revert.spec.ts
│   │   └── artifact-rendering.spec.ts
│   ├── files/
│   │   ├── file-upload.spec.ts
│   │   ├── file-preview.spec.ts
│   │   ├── multiple-files.spec.ts
│   │   └── file-type-support.spec.ts
│   ├── github/
│   │   ├── repository-connection.spec.ts
│   │   ├── file-browser.spec.ts
│   │   ├── folder-selection.spec.ts
│   │   ├── context-integration.spec.ts
│   │   └── pat-authentication.spec.ts
│   ├── settings/
│   │   ├── api-key-management.spec.ts
│   │   ├── google-verification.spec.ts
│   │   ├── github-verification.spec.ts
│   │   ├── storage-management.spec.ts
│   │   └── model-configuration.spec.ts
│   ├── admin/
│   │   ├── admin-config.spec.ts
│   │   ├── usage-monitoring.spec.ts
│   │   ├── error-tracking.spec.ts
│   │   └── agent-configuration.spec.ts
│   ├── python/
│   │   ├── python-execution.spec.ts
│   │   ├── code-generation.spec.ts
│   │   └── result-display.spec.ts
│   ├── mermaid/
│   │   ├── diagram-creation.spec.ts
│   │   ├── diagram-rendering.spec.ts
│   │   └── diagram-editing.spec.ts
│   ├── history/
│   │   ├── chat-history-navigation.spec.ts
│   │   ├── infinite-scroll.spec.ts
│   │   └── history-search.spec.ts
│   └── complete-flows/
│       ├── onboarding-to-first-chat.spec.ts
│       ├── multimodal-chat-session.spec.ts
│       ├── github-integrated-workflow.spec.ts
│       ├── document-collaboration.spec.ts
│       └── multi-provider-switching.spec.ts
├── security/
│   ├── authentication/
│   │   ├── supabase-auth.test.ts
│   │   ├── session-management.test.ts
│   │   └── unauthorized-access.test.ts
│   ├── rls/
│   │   ├── user-isolation.test.ts
│   │   ├── admin-privileges.test.ts
│   │   └── policy-enforcement.test.ts
│   ├── api-keys/
│   │   ├── key-storage-security.test.ts
│   │   ├── key-transmission.test.ts
│   │   ├── key-masking.test.ts
│   │   └── key-expiration.test.ts
│   ├── input-validation/
│   │   ├── sql-injection.test.ts
│   │   ├── xss-prevention.test.ts
│   │   └── file-upload-validation.test.ts
│   └── rate-limiting/
│       ├── rate-limit-enforcement.test.ts
│       ├── rate-limit-tracking.test.ts
│       └── cleanup-old-limits.test.ts
├── performance/
│   ├── database/
│   │   ├── query-performance.test.ts
│   │   ├── index-effectiveness.test.ts
│   │   └── connection-pooling.test.ts
│   ├── streaming/
│   │   ├── sse-performance.test.ts
│   │   ├── large-response-streaming.test.ts
│   │   └── concurrent-streams.test.ts
│   ├── pagination/
│   │   ├── infinite-scroll-performance.test.ts
│   │   └── large-dataset-handling.test.ts
│   └── file-handling/
│       ├── large-file-upload.test.ts
│       ├── multiple-file-processing.test.ts
│       └── blob-storage-performance.test.ts
├── accessibility/
│   ├── chat-interface.test.ts
│   ├── file-upload.test.ts
│   ├── github-browser.test.ts
│   ├── settings-page.test.ts
│   └── keyboard-navigation.test.ts
└── visual-regression/
    ├── chat-components/
    │   ├── message-rendering.spec.ts
    │   ├── artifact-display.spec.ts
    │   └── thinking-mode-ui.spec.ts
    ├── github-ui/
    │   ├── file-browser.spec.ts
    │   └── repository-modal.spec.ts
    └── settings/
        └── settings-page.spec.ts
```

## Test Coverage Areas

### 1. Database Layer (Unit + Integration)
- **14 Tables**: Chat, Message_v2, Document, Suggestion, Vote_v2, Stream, admin_config, model_config, usage_logs, rate_limit_tracking, github_repositories, error_logs, user_activity_logs, agent_activity_logs
- **12 Functions**: validate_user_id, get_current_user_usage_summary, check_rate_limit, etc.
- **15+ Triggers**: For data integrity and cross-schema validation
- **RLS Policies**: All 14 tables with SELECT, INSERT, UPDATE, DELETE policies
- **Migrations**: Execution, rollback, verification

### 2. AI Agents (Unit + Integration + E2E)
- **Chat Model Agent**: Main interface, streaming, model selection
- **Provider Tools Agent**: Google Search, URL fetch, code execution
- **Document Agent**: Create, update, revert operations
- **Python Agent**: Code generation and execution
- **Mermaid Agent**: Diagram creation and rendering
- **Git MCP Agent**: GitHub operations and integration
- **Multi-agent Collaboration**: Agent orchestration flows

### 3. API Endpoints (Integration)
- `/api/chat` - Chat streaming, error handling, rate limiting
- `/api/files/upload` - File upload, validation, blob storage
- `/api/history` - Pagination, infinite scroll, filtering
- `/api/documents/*` - Create, update, revert
- `/api/suggestions/*` - Create, list, voting
- `/api/admin/config/*` - Config management, usage stats
- `/api/github/*` - Repositories, files, folders, MCP integration
- `/api/verification/*` - Google and GitHub verification

### 4. UI Components (Unit + E2E)
- **Chat Components**: artifact, chat, message, multimodal-input, file-preview, thinking-display
- **GitHub Components**: github-repo-modal, github-file-browser, file-tree-node
- **Settings Components**: settings-page, api-key-input, verification-status, storage-info
- **Admin Components**: admin-dashboard, config-editor, usage-stats, error-logs-viewer
- **Model Components**: model-selector, provider-badge, capability-indicator
- **Common Components**: infinite-scroll, loading-spinner, error-boundary

### 5. User Flows (Integration + E2E)
- Multimodal input flow (text + files + GitHub context)
- File upload and processing flow
- GitHub integration flow (connect → browse → select)
- Thinking mode activation and display
- Artifact creation and rendering
- Model switching across providers
- API key verification flow
- Chat history with infinite scroll
- Streaming response flow
- Document lifecycle (create → edit → revert)

### 6. Security (Security Tests)
- Supabase authentication and session management
- RLS policy enforcement for all tables
- API key storage security (localStorage encryption considerations)
- Key transmission via HTTP headers
- Input validation (SQL injection, XSS prevention)
- Rate limiting enforcement and tracking
- User isolation and admin privileges

### 7. Verification Services (Unit + Integration)
- **Google AI Verification**: API key validation, error codes, caching
- **GitHub PAT Verification**: Scope checking (repo, read:user, user:email), token validation
- Verification error handling and retry logic
- Verification status UI updates

### 8. Storage Systems (Unit + Integration)
- **Local Storage**: API key storage, masking, expiration tracking
- **Blob Storage**: File uploads, retrieval, deletion
- Storage helpers: maskKey(), isKeyExpired(), formatVerificationTime()
- Storage management UI

### 9. Performance (Performance Tests)
- Database query optimization and index effectiveness
- SSE streaming performance with large responses
- Infinite scroll pagination with large datasets
- Large file upload handling
- Concurrent stream management

### 10. Accessibility (A11y Tests)
- Chat interface keyboard navigation
- File upload accessibility
- GitHub file browser screen reader support
- Settings page WCAG compliance

## Testing Tools and Frameworks

### Recommended Stack:
- **Unit Tests**: Jest + React Testing Library
- **Integration Tests**: Jest + Supertest (API) + MSW (mocking)
- **E2E Tests**: Playwright
- **Database Tests**: Jest + Supabase Test Helpers
- **Performance Tests**: Playwright Performance API
- **Accessibility Tests**: jest-axe + Playwright
- **Visual Regression**: Playwright + Percy/Chromatic

## Test Execution Strategy

### Local Development:
```bash
npm run test:unit           # Run all unit tests
npm run test:integration    # Run integration tests
npm run test:e2e           # Run E2E tests with Playwright
npm run test:security      # Run security-specific tests
npm run test:performance   # Run performance benchmarks
npm run test:a11y         # Run accessibility tests
npm run test:all          # Run all tests
```

### CI/CD Pipeline:
1. **PR Checks**: Unit + Integration + Security tests
2. **Merge to Main**: All tests including E2E
3. **Nightly Builds**: Performance + Visual Regression
4. **Pre-deployment**: Full test suite + smoke tests

## Coverage Goals

- **Unit Tests**: 80%+ code coverage
- **Integration Tests**: 90%+ endpoint coverage
- **E2E Tests**: 100% critical user journey coverage
- **Security Tests**: 100% RLS policy coverage
- **Database Tests**: 100% table/function/trigger coverage

## File References

This testing structure covers functionality from:
- `app/(chat)/api/chat/route.ts`
- `app/(chat)/api/files/upload/route.ts`
- `app/(chat)/api/history/route.ts`
- `app/api/admin/config/summary/route.ts`
- `components/multimodal-input.tsx`
- `components/model-selector.tsx`
- `components/github-repo-modal.tsx`
- `components/github-file-browser.tsx`
- `components/message.tsx`
- `lib/ai/chat-agent-resolver.ts`
- `lib/db/queries/*`
- `lib/verification/google-verification-service.ts`
- `lib/storage/local-storage-manager.ts`
- All database tables, functions, triggers, and RLS policies documented in `database-design.md`
