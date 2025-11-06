# Requirements Document

## Introduction

This feature implements a comprehensive admin system with usage analytics and AI integration for the Supabase-based chatbot application. The system provides administrators with full control over AI agent configurations, detailed usage tracking and analytics, and dynamic AI backend integration that reads from admin configurations. This combines three related phases: Admin Page Implementation (Phase 5), Usage Page Implementation (Phase 6), and Backend AI Integration (Phase 9).

## Requirements

### Requirement 1: Admin Page with Agent Configuration

**User Story:** As an administrator, I want to configure all AI agents through a web interface, so that I can customize system prompts, rate limits, and model selections without code changes.

#### Acceptance Criteria

1. WHEN an admin user accesses /admin THEN the system SHALL display a tabbed interface with 6 agent configuration tabs
2. WHEN a non-admin user attempts to access /admin THEN the system SHALL redirect them to the home page
3. WHEN an admin configures the Routing Agent Google tab THEN the system SHALL allow editing of system prompt, rate limits, model provider, model selection, and agent routing configuration
4. WHEN an admin configures the Chat Agent tab THEN the system SHALL allow editing of system prompt, rate limits, capabilities (image generation, extended thinking, file input), tools (Google Search, URL Context), and model selection
5. WHEN an admin configures the Document Agent tab THEN the system SHALL allow editing of system prompt, rate limits, available tools (create/update document), and model selection
6. WHEN an admin configures the Python Code Agent tab THEN the system SHALL allow editing of system prompt, rate limits, available tools, code execution settings, allowed libraries, and model selection
7. WHEN an admin configures the Mermaid Agent tab THEN the system SHALL allow editing of system prompt, rate limits, available tools (create/update/fix diagrams), and model selection
8. WHEN an admin configures the Git MCP Agent tab THEN the system SHALL allow editing of system prompt, rate limits, MCP server configuration, available tools, repository permissions, and model selection
9. WHEN an admin saves any configuration THEN the system SHALL validate the form data and store it in the admin_config table
10. WHEN an admin loads any configuration tab THEN the system SHALL populate the form with current values from the admin_config table

### Requirement 2: Usage Analytics Dashboard

**User Story:** As an administrator, I want to view comprehensive usage analytics and cost tracking, so that I can monitor system usage, costs, and performance across all users and agents.

#### Acceptance Criteria

1. WHEN an admin accesses the usage page THEN the system SHALL display a dashboard with date range selector, summary cards, charts, and detailed usage table
2. WHEN a user selects a date range THEN the system SHALL update all dashboard components to show data for that period
3. WHEN the system displays summary cards THEN it SHALL show total API calls, total tokens consumed (input/output), and total costs with trend indicators
4. WHEN the system displays usage charts THEN it SHALL show timeline chart (usage over time), agent distribution chart (usage by agent type), and model usage chart (tokens by model)
5. WHEN the system displays the detailed usage table THEN it SHALL show timestamp, user, agent type, model used, token counts, costs, duration, and status for each API call
6. WHEN a user interacts with the usage table THEN the system SHALL support sorting, filtering, pagination, and CSV export
7. WHEN the system calculates cost projections THEN it SHALL estimate future costs based on current usage trends for 7/30/90 day periods
8. WHEN the system queries usage data THEN it SHALL read from the usage_logs table with proper aggregations and filtering

### Requirement 3: Backend AI Integration with Dynamic Configuration

**User Story:** As a system, I want to dynamically read AI agent configurations from the database and apply them to API calls, so that admin changes take effect immediately without code deployments.

#### Acceptance Criteria

1. WHEN the system processes an AI request THEN it SHALL read the appropriate agent configuration from the admin_config table
2. WHEN the system makes an AI API call THEN it SHALL use the system prompt, model selection, and settings from the admin configuration
3. WHEN the system processes a request THEN it SHALL check rate limits based on the admin-configured limits for that agent type
4. WHEN the system completes an AI API call THEN it SHALL log usage data (tokens, costs, duration, metadata) to the usage_logs table
5. WHEN the system encounters rate limit violations THEN it SHALL return appropriate error responses and not process the request
6. WHEN the system reads user API keys THEN it SHALL retrieve them from client-side localStorage and never send them to the backend
7. WHEN the system makes Google AI API calls THEN it SHALL use the user's Google API key from localStorage on the client side
8. WHEN the system makes GitHub API calls THEN it SHALL use the user's GitHub PAT from localStorage on the client side
9. WHEN user API keys are missing THEN the system SHALL display setup prompts directing users to the settings page

### Requirement 4: Role-Based Access Control

**User Story:** As a system administrator, I want to ensure only admin users can access admin features, so that regular users cannot modify system configurations.

#### Acceptance Criteria

1. WHEN the system checks user permissions THEN it SHALL read the user role from Supabase auth user metadata
2. WHEN a user attempts to access admin routes THEN the system SHALL verify the user has role='admin' in their metadata
3. WHEN the middleware processes admin route requests THEN it SHALL redirect non-admin users to the home page
4. WHEN the system applies RLS policies THEN it SHALL ensure users can only access their own data and admins can access admin_config and all usage_logs
5. WHEN the system creates the first admin user THEN it SHALL set user_metadata with role='admin' during registration

### Requirement 5: Settings Page for API Key Management

**User Story:** As a user, I want to securely manage my API keys in the browser, so that I can use my own Google AI and GitHub credentials without sharing them with the server.

#### Acceptance Criteria

1. WHEN a user accesses the settings page THEN the system SHALL display API key management sections for Google AI and GitHub
2. WHEN a user enters an API key THEN the system SHALL store it in browser localStorage only
3. WHEN a user tests an API key THEN the system SHALL make a client-side test API call to validate the key
4. WHEN the system displays API key status THEN it SHALL show valid/invalid/not set indicators
5. WHEN a user logs out THEN the system SHALL clear all API keys from localStorage
6. WHEN the system displays security warnings THEN it SHALL inform users that keys are stored locally and never sent to servers
7. WHEN a user toggles key visibility THEN the system SHALL show/hide the actual key values

### Requirement 6: User Interface Enhancements

**User Story:** As a user, I want enhanced UI controls for repository selection and thinking mode, so that I can easily connect GitHub repositories and enable advanced reasoning.

#### Acceptance Criteria

1. WHEN a user views the chat interface THEN the system SHALL display a GitHub repository selector above the message input
2. WHEN a user selects a repository THEN the system SHALL store the selection and include it in Git MCP Agent context
3. WHEN a user connects a new repository THEN the system SHALL validate the GitHub URL and store it in the github_repositories table
4. WHEN a user enables thinking mode THEN the system SHALL route requests to the reasoning model and display the thinking process
5. WHEN the system displays thinking mode results THEN it SHALL show the reasoning in a collapsible section of the message
6. WHEN thinking mode is enabled THEN the system SHALL disable artifact tools and focus on reasoning only

### Requirement 7: Error Handling and Logging

**User Story:** As an administrator, I want comprehensive error logging and monitoring, so that I can troubleshoot issues and maintain system reliability.

#### Acceptance Criteria

1. WHEN the system encounters errors THEN it SHALL log them to the error_logs table with appropriate categorization
2. WHEN the system logs errors THEN it SHALL include error type, category, message, details, request context, and user information
3. WHEN an admin views error logs THEN the system SHALL provide filtering, sorting, and resolution tracking capabilities
4. WHEN the system handles API failures THEN it SHALL provide meaningful error messages to users while logging technical details
5. WHEN the system validates configurations THEN it SHALL prevent invalid settings and provide clear validation messages