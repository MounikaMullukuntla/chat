# Implementation Plan

- [x] 1. Create admin configuration API routes





  - Create GET /api/admin/config/[configKey] endpoint to fetch agent configurations
  - Create PUT /api/admin/config/[configKey] endpoint to update configurations
  - Implement admin role validation middleware for API routes
  - Add request validation and error handling with proper error responses
  - _Requirements: 1.9, 1.10, 4.2, 7.1, 7.4_

- [x] 2. Implement reusable admin form components


  - Create SystemPromptEditor component with markdown support and preview
  - Create RateLimitConfiguration component with hourly/daily toggle
  - Create ModelSelector component with provider and model dropdowns
  - Create AgentConfigForm base component for consistent form handling
  - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

- [x] 3. Replace basic admin page with tabbed configuration interface
  - Replace current test admin page with proper admin dashboard
  - Create AdminLayout component with navigation tabs for 6 agent types
  - Add breadcrumbs and consistent admin page styling
  - Implement tab routing and state management
  - NOTE: This will be restructured in task 29 for provider-based architecture
  - _Requirements: 1.1, 1.2, 4.2, 4.3_

- [x] 4. Implement Routing Agent configuration tab (provider-agnostic)
  - Create routing-agent form using reusable components
  - Add system prompt editor, rate limits, and model selection
  - Wire up to admin_config table with dynamic configKey (routing_agent_<provider>)
  - Add form validation, save/reset functionality, and loading states
  - Make component provider-aware to work with any provider
  - _Requirements: 1.3, 1.9, 1.10_

- [ ] 5. Implement Chat Agent configuration tab (provider-agnostic)
  - Create chat-agent form with system prompt editor
  - Add capabilities toggles (image generation, extended thinking, file input)
  - Add tools configuration (Google Search, URL Context)
  - Add multi-select model dropdown with primary model indicator
  - Add advanced settings section (temperature, top-k, top-p)
  - Wire up to admin_config table with dynamic configKey (chat_agent_<provider>)
  - _Requirements: 1.4, 1.9, 1.10_

- [ ] 6. Implement Document Agent configuration tab (provider-agnostic)
  - Create document-agent form with system prompt editor
  - Add available tools checkboxes (create/update document)
  - Add model selection dropdown
  - Wire up to admin_config table with dynamic configKey (document_agent_<provider>)
  - _Requirements: 1.5, 1.9, 1.10_



- [ ] 7. Implement Python Code Agent configuration tab (provider-agnostic)
  - Create python-code-agent form with system prompt editor
  - Add available tools checkboxes (create/update Python code)
  - Add code execution settings (timeout, allowed libraries)
  - Add model selection dropdown
  - Wire up to admin_config table with dynamic configKey (python_code_agent_<provider>)
  - _Requirements: 1.6, 1.9, 1.10_


- [ ] 8. Implement Mermaid Agent configuration tab (provider-agnostic)
  - Create mermaid-agent form with system prompt editor
  - Add available tools checkboxes (create/update/fix diagrams)
  - Add supported diagram types info display
  - Add model selection dropdown
  - Wire up to admin_config table with dynamic configKey (mermaid_agent_<provider>)
  - _Requirements: 1.7, 1.9, 1.10_

- [ ] 9. Implement Git MCP Agent configuration tab (provider-agnostic)
  - Create git-mcp-agent form with system prompt editor
  - Add MCP server configuration (URL, connection test)
  - Add dynamic tools list from MCP server
  - Add repository permissions controls
  - Wire up to admin_config table with dynamic configKey (git_mcp_agent_<provider>)
  - _Requirements: 1.8, 1.9, 1.10_

- [ ] 10. Create usage analytics API routes
  - Create GET /api/usage/summary endpoint for user's usage summary
  - Create GET /api/usage/timeline endpoint for usage over time
  - Create GET /api/usage/details endpoint for detailed usage table
  - Create GET /api/usage/export endpoint for CSV export
  - Add date range filtering and pagination support
  - _Requirements: 2.2, 2.6, 2.8_

- [ ] 11. Create usage page structure and routing
  - Create app/usage directory with main usage page
  - Add usage page link to sidebar user nav above logout button
  - Create date range selector component with presets (7d, 30d, 90d)
  - Implement responsive layout for dashboard components
  - _Requirements: 2.1, 2.2_

- [ ] 12. Implement usage summary cards
  - Create SummaryCards component showing total API calls, tokens, costs
  - Add trend indicators comparing to previous period
  - Create breakdown display for input/output tokens and costs
  - Add loading states and error handling
  - _Requirements: 2.3, 2.8_

- [ ] 13. Implement usage analytics charts
  - Install and configure recharts library
  - Create timeline chart showing usage over selected period
  - Create agent distribution pie/donut chart
  - Create model usage bar chart
  - Add interactive features (hover tooltips, click filtering)
  - _Requirements: 2.4, 2.8_

- [ ] 14. Implement detailed usage table
  - Create UsageTable component with sortable columns
  - Add filtering by agent type, model, status
  - Implement pagination with configurable page sizes
  - Add CSV export functionality
  - Add row expansion for metadata details
  - _Requirements: 2.5, 2.6, 2.8_

- [ ] 15. Implement cost projection feature
  - Create cost projection calculations based on usage trends
  - Display estimated costs for 7/30/90 day periods
  - Add budget alert configuration (future feature placeholder)
  - Create projection visualization component
  - _Requirements: 2.7, 2.8_

- [ ] 16. Add admin-only usage analytics tab
  - Create admin-only tab in usage page accessible only to admins
  - Add user filter dropdown for viewing specific user usage
  - Create overall system usage metrics display
  - Implement admin usage API endpoints with user filtering
  - Add placeholder for future admin usage features
  - _Requirements: 2.8, 4.2, 4.4_

- [ ] 17. Create settings page structure
  - Create app/settings directory with main settings page
  - Create SettingsLayout component with sections
  - Add settings page link to sidebar user nav
  - Implement responsive layout for settings sections
  - _Requirements: 5.1, 5.7_

- [ ] 18. Implement API key management for providers
  - Create APIKeyManager component for Google AI API key
  - Add show/hide toggle and validation status indicators
  - Implement client-side test connection for Google AI API
  - Add security warnings about local storage
  - Store keys in localStorage with proper structure
  - _Requirements: 5.2, 5.3, 5.4, 5.6, 5.7_

- [ ] 19. Implement API key management for integrations
  - Create APIKeyManager component for GitHub PAT
  - Add show/hide toggle and validation status indicators
  - Implement client-side test connection for GitHub API
  - Add help text and links to token creation pages
  - Handle key lifecycle (clear on logout)
  - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.7_

- [ ] 20. Create GitHub repository selector UI
  - Create RepositorySelector component above message input
  - Add dropdown with user's connected repositories
  - Create "Connect New Repo" modal with URL validation
  - Implement repository selection persistence
  - Add repository info display when selected
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 21. Implement thinking mode toggle
  - Create ThinkingModeToggle component in model selector area
  - Add toggle switch with brain/thinking icon
  - Show token cost multiplier and usage warnings
  - Implement thinking mode preference persistence
  - Add visual indicators when thinking mode is enabled
  - _Requirements: 6.4, 6.5, 6.6_

- [ ] 22. Create backend AI integration service
  - Create AIConfigService to read admin configurations dynamically
  - Implement model selection logic based on admin config
  - Create system prompt injection from admin config
  - Add provider-specific API call handling
  - _Requirements: 3.1, 3.2, 3.6, 3.7, 3.8_

- [ ] 23. Implement usage logging middleware
  - Create usage logging middleware for all AI API calls
  - Log tokens, costs, duration, and metadata to usage_logs table
  - Add error logging for failed API calls
  - Implement batch logging for performance
  - _Requirements: 3.4, 7.1, 7.2, 7.4_

- [ ] 24. Implement rate limiting service
  - Create RateLimitService to check and enforce limits
  - Read rate limits from admin configuration
  - Update rate_limit_tracking table on each request
  - Return appropriate error responses when limits exceeded
  - _Requirements: 3.3, 3.5, 7.4_

- [ ] 25. Integrate client-side API key usage
  - Read Google API key from localStorage for AI API calls
  - Read GitHub PAT from localStorage for GitHub API calls
  - Handle missing API key scenarios with setup prompts
  - Ensure API keys never reach backend servers
  - _Requirements: 3.6, 3.7, 3.8, 3.9, 5.6_

- [ ] 26. Implement comprehensive error handling
  - Create error logging service for all error categories
  - Add user-friendly error messages and recovery suggestions
  - Implement error boundaries for admin and usage pages
  - Add error monitoring and alerting capabilities
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 27. Add GitHub repository management
  - Create API routes for GitHub repository CRUD operations
  - Implement repository validation and GitHub API integration
  - Add repository management UI in settings page
  - Store repository data in github_repositories table
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 28. Create database migration for admin features
  - Create 0002_admin_usage_enhancements.sql migration file
  - Add missing admin_config seed data for all 6 agent types
  - Add any missing indexes for usage analytics performance
  - Add any missing columns or constraints needed
  - Update schema.ts with any new types or modifications
  - _Requirements: 1.9, 1.10, 2.8, 3.1_

- [x] 29. Restructure admin interface with provider-based architecture





  - Create new admin dashboard at /admin with provider selection dropdown
  - Move current admin page to /admin/[provider] (e.g., /admin/google)
  - Create provider management interface to add/remove providers
  - Implement dynamic config key generation (agent_type + provider)
  - Auto-create all 6 agent configs when new provider is added
  - Update AdminLayout to be provider-aware and fetch tabs dynamically
  - _Requirements: 1.1, 1.2, 1.9, 1.10_