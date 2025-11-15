# Database Design Documentation

## Table of Contents
- [Overview](#overview)
- [Entity Relationship Diagram](#entity-relationship-diagram)
- [Database Schema](#database-schema)
  - [Core Tables](#core-tables)
  - [Admin & Analytics Tables](#admin--analytics-tables)
  - [Activity Logging Tables](#activity-logging-tables)
- [Database Functions](#database-functions)
- [Indexes](#indexes)
- [Triggers](#triggers)
- [Row Level Security (RLS)](#row-level-security-rls)
- [Seed Data](#seed-data)
- [Supabase Setup](#supabase-setup)
- [Database Migrations](#database-migrations)
- [Schema Changes](#schema-changes)
- [TODOs](#todos)

---

## Overview

This application uses **Supabase** (PostgreSQL) as its database. The database is designed to support:

- **Multi-user chat conversations** with AI agents
- **Document management** with version control
- **AI model configuration** with pricing management
- **Usage tracking** and rate limiting
- **Error logging** and activity monitoring
- **GitHub repository integration** for MCP operations

**Key Design Principles:**
- User management handled by **Supabase Auth** (`auth.users` table)
- Cross-schema foreign keys simulated using **triggers** and **functions**
- **Row Level Security (RLS)** for data isolation and authorization
- **Comprehensive logging** for debugging and analytics
- **Version control** for documents (artifacts)

---

## Entity Relationship Diagram

```mermaid
erDiagram
    AUTH_USERS ||--o{ CHAT : "has many"
    AUTH_USERS ||--o{ DOCUMENT : "has many"
    AUTH_USERS ||--o{ GITHUB_REPOSITORIES : "has many"
    AUTH_USERS ||--o{ USAGE_LOGS : "has many"
    AUTH_USERS ||--o{ RATE_LIMIT_TRACKING : "has many"
    AUTH_USERS ||--o{ ERROR_LOGS : "has many"
    AUTH_USERS ||--o{ USER_ACTIVITY_LOGS : "has many"
    AUTH_USERS ||--o{ AGENT_ACTIVITY_LOGS : "has many"

    CHAT ||--o{ MESSAGE_V2 : "contains"
    CHAT ||--o{ VOTE_V2 : "has"
    CHAT ||--o{ STREAM : "has"
    CHAT ||--o{ DOCUMENT : "may have"
    CHAT ||--o{ USAGE_LOGS : "tracks"

    MESSAGE_V2 ||--o{ VOTE_V2 : "has"

    DOCUMENT ||--o{ SUGGESTION : "has"
    DOCUMENT ||--o{ DOCUMENT : "has parent version"

    MODEL_CONFIG ||--o{ ADMIN_CONFIG : "referenced by provider"

    AUTH_USERS {
        uuid id PK
        string email
        jsonb raw_user_meta_data
        timestamp created_at
    }

    CHAT {
        uuid id PK
        uuid user_id FK
        timestamp createdAt
        text title
        varchar visibility
        jsonb lastContext
        int total_input_tokens
        int total_output_tokens
        decimal total_cost
        timestamp updated_at
    }

    MESSAGE_V2 {
        uuid id PK
        uuid chatId FK
        varchar role
        json parts
        json attachments
        timestamp createdAt
        varchar model_used
        int input_tokens
        int output_tokens
        decimal cost
    }

    VOTE_V2 {
        uuid chatId PK_FK
        uuid messageId PK_FK
        boolean isUpvoted
    }

    DOCUMENT {
        uuid id PK
        timestamp createdAt PK
        text title
        text content
        varchar kind
        uuid user_id FK
        uuid chat_id FK
        uuid parent_version_id FK
        int version_number
        jsonb metadata
    }

    SUGGESTION {
        uuid id PK
        uuid documentId FK
        timestamp documentCreatedAt FK
        text originalText
        text suggestedText
        text description
        boolean isResolved
        uuid user_id FK
        timestamp createdAt
    }

    STREAM {
        uuid id PK
        uuid chatId FK
        timestamp createdAt
    }

    ADMIN_CONFIG {
        uuid id PK
        varchar config_key UK
        jsonb config_data
        uuid updated_by FK
        timestamp updated_at
        timestamp created_at
    }

    MODEL_CONFIG {
        uuid id PK
        varchar model_id UK
        varchar name
        text description
        varchar provider
        boolean is_active
        boolean is_default
        boolean thinking_enabled
        decimal input_pricing_per_million_tokens
        decimal output_pricing_per_million_tokens
        jsonb metadata
        timestamp created_at
        timestamp updated_at
    }

    USAGE_LOGS {
        uuid id PK
        uuid user_id FK
        uuid chat_id FK
        varchar agent_type
        varchar model_used
        varchar provider
        int input_tokens
        int output_tokens
        int total_tokens
        decimal input_cost
        decimal output_cost
        decimal total_cost
        timestamp request_timestamp
        timestamp response_timestamp
        int duration_ms
        jsonb metadata
    }

    RATE_LIMIT_TRACKING {
        uuid id PK
        uuid user_id FK
        varchar agent_type
        timestamp period_start
        timestamp period_end
        int request_count
        varchar limit_type
        int limit_value
        timestamp created_at
    }

    GITHUB_REPOSITORIES {
        uuid id PK
        uuid user_id FK
        varchar repo_owner
        varchar repo_name
        text repo_url
        varchar default_branch
        boolean is_active
        timestamp last_accessed
        timestamp created_at
    }

    ERROR_LOGS {
        uuid id PK
        uuid user_id FK
        varchar error_type
        varchar error_category
        text error_message
        jsonb error_details
        varchar request_path
        varchar request_method
        text user_agent
        varchar ip_address
        varchar session_id
        varchar severity
        boolean resolved
        uuid resolved_by FK
        timestamp resolved_at
        text resolution_notes
        timestamp created_at
    }

    USER_ACTIVITY_LOGS {
        uuid id PK
        uuid user_id FK
        uuid correlation_id
        varchar activity_type
        varchar activity_category
        jsonb activity_metadata
        uuid resource_id
        varchar resource_type
        varchar ip_address
        text user_agent
        varchar request_path
        varchar request_method
        varchar session_id
        boolean success
        text error_message
        timestamp created_at
    }

    AGENT_ACTIVITY_LOGS {
        uuid id PK
        uuid user_id FK
        uuid correlation_id
        varchar agent_type
        varchar operation_type
        varchar operation_category
        jsonb operation_metadata
        uuid resource_id
        varchar resource_type
        int duration_ms
        timestamp start_time
        timestamp end_time
        varchar model_id
        varchar provider
        boolean thinking_mode
        int input_tokens
        int output_tokens
        int reasoning_tokens
        int total_tokens
        decimal input_cost
        decimal output_cost
        decimal total_cost
        boolean success
        varchar error_type
        text error_message
        int retry_count
        timestamp created_at
    }
```

---

## Authentication Flow

```mermaid
flowchart TB
    Start([User Visits App]) --> CheckAuth{Authenticated?}
    CheckAuth -->|No| ShowLogin[Show Login Page]
    ShowLogin --> LoginMethod{Login Method}

    LoginMethod -->|Email/Password| EmailAuth[Supabase Email Auth]
    LoginMethod -->|OAuth Provider| OAuthAuth[Supabase OAuth]

    EmailAuth --> SupabaseAuth[Supabase Auth Service]
    OAuthAuth --> SupabaseAuth

    SupabaseAuth --> CreateSession[Create Session + JWT]
    CreateSession --> SetCookies[Set Auth Cookies]
    SetCookies --> CheckUserMeta{Check user_metadata}

    CheckUserMeta -->|Has role| LoadRole[Load User Role]
    CheckUserMeta -->|No role| SetDefaultRole[Set role='user']

    LoadRole --> CheckAdmin{Is Admin?}
    SetDefaultRole --> CheckAdmin

    CheckAdmin -->|Yes| AdminDashboard[Access Admin Features]
    CheckAdmin -->|No| UserDashboard[Access User Features]

    CheckAuth -->|Yes| ValidateSession{Valid Session?}
    ValidateSession -->|Yes| LoadRole
    ValidateSession -->|No| RefreshToken{Refresh Token Valid?}

    RefreshToken -->|Yes| CreateSession
    RefreshToken -->|No| ShowLogin

    AdminDashboard --> RLS[RLS Policies Check]
    UserDashboard --> RLS

    RLS --> DataAccess[Access Allowed Data Only]

    style SupabaseAuth fill:#4CAF50
    style RLS fill:#FF9800
    style AdminDashboard fill:#2196F3
    style UserDashboard fill:#9C27B0
```

---

## Database Schema

### Core Tables

#### 1. **Chat**
**Purpose:** Main container for chat conversations between users and AI agents.

**Used in:**
- `lib/db/queries/chat.ts` - All chat CRUD operations
- Chat history display
- Message organization

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | UUID | Primary key | PK, DEFAULT gen_random_uuid() |
| `createdAt` | TIMESTAMP | When chat was created | NOT NULL, DEFAULT NOW() |
| `title` | TEXT | Chat title/summary | NOT NULL |
| `user_id` | UUID | References auth.users | NOT NULL, validated by trigger |
| `visibility` | VARCHAR(10) | 'public' or 'private' | NOT NULL, DEFAULT 'private' |
| `lastContext` | JSONB | Last usage/context data | NULL |
| `total_input_tokens` | INTEGER | Total input tokens used | DEFAULT 0 |
| `total_output_tokens` | INTEGER | Total output tokens used | DEFAULT 0 |
| `total_cost` | DECIMAL(10,6) | Total cost in dollars | DEFAULT 0 |
| `updated_at` | TIMESTAMP | Last update timestamp | DEFAULT NOW() |

**Relationships:**
- Has many `Message_v2` (CASCADE DELETE)
- Has many `Vote_v2` (CASCADE DELETE)
- Has many `Stream` (CASCADE DELETE)
- May have many `Document` (CASCADE DELETE)
- Belongs to `auth.users` via `user_id`

---

#### 2. **Message_v2**
**Purpose:** Stores individual messages within chat conversations.

**Used in:**
- `lib/db/queries/chat.ts` - Message retrieval and storage
- Chat message display
- AI response tracking

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | UUID | Primary key | PK, DEFAULT gen_random_uuid() |
| `chatId` | UUID | References Chat.id | NOT NULL, FK CASCADE DELETE |
| `role` | VARCHAR(20) | Message role (user/assistant/system) | NOT NULL |
| `parts` | JSON | Message content parts | NOT NULL |
| `attachments` | JSON | File attachments | NOT NULL, DEFAULT '[]' |
| `createdAt` | TIMESTAMP | When message was sent | NOT NULL, DEFAULT NOW() |
| `model_used` | VARCHAR(100) | AI model identifier | NULL |
| `input_tokens` | INTEGER | Tokens in input | NULL |
| `output_tokens` | INTEGER | Tokens in output | NULL |
| `cost` | DECIMAL(10,6) | Message cost | NULL |

**Relationships:**
- Belongs to `Chat` via `chatId` (CASCADE DELETE)
- Has many `Vote_v2` (CASCADE DELETE)

---

#### 3. **Vote_v2**
**Purpose:** Stores user votes (upvote/downvote) on AI messages.

**Used in:**
- `lib/db/queries/chat.ts` - Vote tracking
- Message feedback system

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `chatId` | UUID | References Chat.id | PK, FK CASCADE DELETE |
| `messageId` | UUID | References Message_v2.id | PK, FK CASCADE DELETE |
| `isUpvoted` | BOOLEAN | True=upvote, False=downvote | NOT NULL |

**Relationships:**
- Belongs to `Chat` via `chatId` (CASCADE DELETE)
- Belongs to `Message_v2` via `messageId` (CASCADE DELETE)

---

#### 4. **Document**
**Purpose:** Stores artifacts (text documents, Python code, Mermaid diagrams, spreadsheets) with full version control.

**Used in:**
- `lib/db/queries/document.ts` - Document CRUD and versioning
- Artifact panel display
- Version history

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | UUID | Document identifier (same across versions) | PK (composite with createdAt) |
| `createdAt` | TIMESTAMP | Version creation timestamp | PK (composite with id) |
| `title` | TEXT | Document title | NOT NULL |
| `content` | TEXT | Document content | NULL |
| `kind` | VARCHAR(20) | 'text', 'python code', 'mermaid code', 'sheet' | NOT NULL, DEFAULT 'text' |
| `user_id` | UUID | References auth.users | NOT NULL, validated by trigger |
| `chat_id` | UUID | References Chat.id | NULL, FK CASCADE DELETE |
| `parent_version_id` | UUID | Parent version for version tree | NULL, FK SET NULL |
| `version_number` | INTEGER | Sequential version number | NOT NULL, DEFAULT 1 |
| `metadata` | JSONB | Version metadata (update type, line range, agent info) | DEFAULT '{}' |

**Relationships:**
- Belongs to `auth.users` via `user_id`
- Belongs to `Chat` via `chat_id` (optional, CASCADE DELETE)
- Self-referencing via `parent_version_id` (version tree)
- Has many `Suggestion` (CASCADE DELETE)

**Version Control:**
- Same `id` for all versions of a document
- `version_number` increments sequentially (1, 2, 3...)
- `parent_version_id` creates version tree structure
- `createdAt` is part of primary key for temporal tracking

---

#### 5. **Suggestion**
**Purpose:** Stores inline edit suggestions for documents.

**Used in:**
- `lib/db/queries/document.ts` - Suggestion management
- Document improvement workflow

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | UUID | Primary key | PK, DEFAULT gen_random_uuid() |
| `documentId` | UUID | References Document.id | NOT NULL, FK CASCADE DELETE |
| `documentCreatedAt` | TIMESTAMP | References Document.createdAt | NOT NULL, FK CASCADE DELETE |
| `originalText` | TEXT | Text to be replaced | NOT NULL |
| `suggestedText` | TEXT | Suggested replacement | NOT NULL |
| `description` | TEXT | Explanation of suggestion | NULL |
| `isResolved` | BOOLEAN | Whether suggestion was applied | NOT NULL, DEFAULT false |
| `user_id` | UUID | References auth.users | NOT NULL, validated by trigger |
| `createdAt` | TIMESTAMP | When suggestion was created | NOT NULL, DEFAULT NOW() |

**Relationships:**
- Belongs to `Document` via composite FK (documentId, documentCreatedAt)
- Belongs to `auth.users` via `user_id`

---

#### 6. **Stream**
**Purpose:** Tracks active streaming sessions for real-time AI responses.

**Used in:**
- `lib/db/queries/chat.ts` - Stream tracking
- Real-time response handling

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | UUID | Primary key | PK, DEFAULT gen_random_uuid() |
| `chatId` | UUID | References Chat.id | NOT NULL, FK CASCADE DELETE |
| `createdAt` | TIMESTAMP | When stream started | NOT NULL, DEFAULT NOW() |

**Relationships:**
- Belongs to `Chat` via `chatId` (CASCADE DELETE)

---

### Admin & Analytics Tables

#### 7. **admin_config**
**Purpose:** Stores agent configurations (system prompts, rate limits, tool settings).

**Used in:**
- `lib/db/queries/admin.ts` - Configuration management
- Agent initialization
- Admin dashboard

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | UUID | Primary key | PK, DEFAULT gen_random_uuid() |
| `config_key` | VARCHAR(100) | Unique config identifier | UNIQUE, NOT NULL |
| `config_data` | JSONB | Configuration JSON | NOT NULL |
| `updated_by` | UUID | References auth.users | NULL |
| `updated_at` | TIMESTAMP | Last update | DEFAULT NOW() |
| `created_at` | TIMESTAMP | Creation time | DEFAULT NOW() |

**Config Key Format:**
- `{agent_type}_{provider}` - e.g., `chat_model_agent_google`
- Special keys: `app_settings`, `logging_settings`

**Supported Agent Types:**
- `chat_model_agent` - Main chat interface
- `provider_tools_agent` - Google Search, URL fetch, code execution
- `document_agent` - Document create/update/revert
- `python_agent` - Python code create/update/fix/explain
- `mermaid_agent` - Mermaid diagram create/update/fix
- `git_mcp_agent` - GitHub operations

**Relationships:**
- References `auth.users` via `updated_by` (for audit trail)

---

#### 8. **model_config**
**Purpose:** Centralized storage for AI model configurations including pricing and capabilities.

**Used in:**
- `lib/db/queries/model-config.ts` - Model management
- Model selection UI
- Cost calculation

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | UUID | Primary key | PK, DEFAULT gen_random_uuid() |
| `model_id` | VARCHAR(100) | Unique model identifier | UNIQUE, NOT NULL |
| `name` | VARCHAR(200) | Display name | NOT NULL |
| `description` | TEXT | Model description | NULL |
| `provider` | VARCHAR(50) | 'google', 'openai', 'anthropic' | NOT NULL |
| `is_active` | BOOLEAN | Whether model is available | DEFAULT true |
| `is_default` | BOOLEAN | Default model for provider | DEFAULT false |
| `thinking_enabled` | BOOLEAN | Supports reasoning/thinking | DEFAULT true |
| `input_pricing_per_million_tokens` | DECIMAL(10,4) | Input cost per million tokens | NOT NULL |
| `output_pricing_per_million_tokens` | DECIMAL(10,4) | Output cost per million tokens | NOT NULL |
| `metadata` | JSONB | Context window, capabilities, etc. | DEFAULT '{}' |
| `created_at` | TIMESTAMP | Creation time | DEFAULT NOW() |
| `updated_at` | TIMESTAMP | Last update | DEFAULT NOW() |

**Constraints:**
- Only one model can be `is_default=true` per provider (enforced by trigger)

**Relationships:**
- Referenced by provider in `admin_config`

---

#### 9. **usage_logs**
**Purpose:** Detailed analytics for API usage tracking.

**Used in:**
- `lib/db/queries/usage.ts` - Usage analytics
- Cost tracking
- Admin analytics dashboard

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | UUID | Primary key | PK, DEFAULT gen_random_uuid() |
| `user_id` | UUID | References auth.users | NOT NULL, validated by trigger |
| `chat_id` | UUID | References Chat.id | NULL, FK SET NULL |
| `agent_type` | VARCHAR(50) | Agent that processed request | NOT NULL |
| `model_used` | VARCHAR(100) | Model identifier | NULL |
| `provider` | VARCHAR(50) | AI provider | NULL |
| `input_tokens` | INTEGER | Input tokens | NULL |
| `output_tokens` | INTEGER | Output tokens | NULL |
| `total_tokens` | INTEGER | Total tokens | NULL |
| `input_cost` | DECIMAL(10,6) | Input cost | NULL |
| `output_cost` | DECIMAL(10,6) | Output cost | NULL |
| `total_cost` | DECIMAL(10,6) | Total cost | NULL |
| `request_timestamp` | TIMESTAMP | When request started | DEFAULT NOW() |
| `response_timestamp` | TIMESTAMP | When response completed | NULL |
| `duration_ms` | INTEGER | Request duration | NULL |
| `metadata` | JSONB | Additional context | NULL |

**Relationships:**
- Belongs to `auth.users` via `user_id`
- Belongs to `Chat` via `chat_id` (optional)

---

#### 10. **rate_limit_tracking**
**Purpose:** Enforces rate limits per user and agent type.

**Used in:**
- `lib/db/queries/usage.ts` - Rate limit checks
- Request throttling

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | UUID | Primary key | PK, DEFAULT gen_random_uuid() |
| `user_id` | UUID | References auth.users | NOT NULL, validated by trigger |
| `agent_type` | VARCHAR(50) | Agent type | NOT NULL |
| `period_start` | TIMESTAMP | Rate limit period start | NOT NULL |
| `period_end` | TIMESTAMP | Rate limit period end | NOT NULL |
| `request_count` | INTEGER | Requests in period | DEFAULT 0 |
| `limit_type` | VARCHAR(20) | 'hourly' or 'daily' | NOT NULL |
| `limit_value` | INTEGER | Max requests allowed | NOT NULL |
| `created_at` | TIMESTAMP | Creation time | DEFAULT NOW() |

**Relationships:**
- Belongs to `auth.users` via `user_id`

---

#### 11. **github_repositories**
**Purpose:** Stores user's connected GitHub repositories for Git MCP operations.

**Used in:**
- `lib/db/queries/github.ts` - Repository management
- GitHub MCP agent

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | UUID | Primary key | PK, DEFAULT gen_random_uuid() |
| `user_id` | UUID | References auth.users | NOT NULL, validated by trigger |
| `repo_owner` | VARCHAR(100) | GitHub username/org | NOT NULL |
| `repo_name` | VARCHAR(100) | Repository name | NOT NULL |
| `repo_url` | TEXT | Full repository URL | NULL |
| `default_branch` | VARCHAR(100) | Main branch name | DEFAULT 'main' |
| `is_active` | BOOLEAN | Whether repo is active | DEFAULT true |
| `last_accessed` | TIMESTAMP | Last access time | NULL |
| `created_at` | TIMESTAMP | When repo was added | DEFAULT NOW() |

**Relationships:**
- Belongs to `auth.users` via `user_id`

---

#### 12. **error_logs**
**Purpose:** Comprehensive error tracking for debugging and monitoring.

**Used in:**
- Error tracking across the application
- Admin error monitoring dashboard
- Debugging and troubleshooting

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | UUID | Primary key | PK, DEFAULT gen_random_uuid() |
| `user_id` | UUID | References auth.users | NULL |
| `error_type` | VARCHAR(50) | 'auth', 'api', 'admin', 'app', 'user', 'permission', 'system' | NOT NULL |
| `error_category` | VARCHAR(100) | Specific error category | NOT NULL |
| `error_message` | TEXT | Error message | NOT NULL |
| `error_details` | JSONB | Stack trace, context | NULL |
| `request_path` | VARCHAR(500) | URL path | NULL |
| `request_method` | VARCHAR(10) | HTTP method | NULL |
| `user_agent` | TEXT | Browser/client info | NULL |
| `ip_address` | VARCHAR(45) | User IP address | NULL |
| `session_id` | VARCHAR(100) | Session identifier | NULL |
| `severity` | VARCHAR(20) | 'info', 'warning', 'error', 'critical' | NOT NULL, DEFAULT 'error' |
| `resolved` | BOOLEAN | Whether error is resolved | DEFAULT false |
| `resolved_by` | UUID | Admin who resolved | NULL |
| `resolved_at` | TIMESTAMP | When resolved | NULL |
| `resolution_notes` | TEXT | Resolution details | NULL |
| `created_at` | TIMESTAMP | When error occurred | DEFAULT NOW() |

**Relationships:**
- May belong to `auth.users` via `user_id`
- May reference `auth.users` via `resolved_by` (admin)

---

### Activity Logging Tables

#### 13. **user_activity_logs**
**Purpose:** Tracks user actions throughout the application.

**Used in:**
- User behavior analytics
- Audit trail
- Security monitoring

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | UUID | Primary key | PK, DEFAULT gen_random_uuid() |
| `user_id` | UUID | References auth.users | NOT NULL, validated by trigger |
| `correlation_id` | UUID | Links related activities | NOT NULL |
| `activity_type` | VARCHAR(50) | Specific activity (auth_login, chat_create, etc.) | NOT NULL |
| `activity_category` | VARCHAR(50) | Category (authentication, chat, document, etc.) | NOT NULL |
| `activity_metadata` | JSONB | Activity-specific details | DEFAULT '{}' |
| `resource_id` | UUID | ID of resource being acted upon | NULL |
| `resource_type` | VARCHAR(50) | Type of resource (chat, document, etc.) | NULL |
| `ip_address` | VARCHAR(45) | User IP (anonymized if needed) | NULL |
| `user_agent` | TEXT | Browser/client info | NULL |
| `request_path` | VARCHAR(500) | URL path | NULL |
| `request_method` | VARCHAR(10) | HTTP method | NULL |
| `session_id` | VARCHAR(100) | Session identifier | NULL |
| `success` | BOOLEAN | Whether action succeeded | DEFAULT true |
| `error_message` | TEXT | Error if failed | NULL |
| `created_at` | TIMESTAMP | When activity occurred | DEFAULT NOW() |

**Activity Types:**
- Auth: `auth_login`, `auth_logout`, `auth_register`
- Chat: `chat_create`, `chat_view`, `chat_delete`, `chat_message_send`
- Document: `document_create`, `document_view`, `document_update`, `document_delete`
- Admin: `admin_config_update`, `admin_dashboard_view`, `admin_provider_view`
- Others: `vote_message`, `suggestion_view`, `file_upload`, `artifact_create`, `artifact_execute`

**Relationships:**
- Belongs to `auth.users` via `user_id`
- Links to `agent_activity_logs` via `correlation_id`

---

#### 14. **agent_activity_logs**
**Purpose:** Tracks AI agent operations and performance metrics.

**Used in:**
- Agent performance monitoring
- Cost tracking
- Debugging agent issues

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | UUID | Primary key | PK, DEFAULT gen_random_uuid() |
| `user_id` | UUID | References auth.users | NULL (for system operations) |
| `correlation_id` | UUID | Links to user activity | NOT NULL |
| `agent_type` | VARCHAR(50) | Agent type | NOT NULL |
| `operation_type` | VARCHAR(50) | Specific operation | NOT NULL |
| `operation_category` | VARCHAR(50) | Category (generation, execution, etc.) | NOT NULL |
| `operation_metadata` | JSONB | Operation-specific metrics | DEFAULT '{}' |
| `resource_id` | UUID | Document, code, diagram ID | NULL |
| `resource_type` | VARCHAR(50) | Resource type | NULL |
| `duration_ms` | INTEGER | Operation duration | NULL |
| `start_time` | TIMESTAMP | Operation start | NULL |
| `end_time` | TIMESTAMP | Operation end | NULL |
| `model_id` | VARCHAR(100) | AI model used | NULL |
| `provider` | VARCHAR(50) | AI provider | NULL |
| `thinking_mode` | BOOLEAN | Thinking/reasoning enabled | DEFAULT false |
| `input_tokens` | INTEGER | Input tokens | NULL |
| `output_tokens` | INTEGER | Output tokens | NULL |
| `reasoning_tokens` | INTEGER | Thinking tokens | NULL |
| `total_tokens` | INTEGER | Total tokens | NULL |
| `input_cost` | DECIMAL(10,6) | Input cost | NULL |
| `output_cost` | DECIMAL(10,6) | Output cost | NULL |
| `total_cost` | DECIMAL(10,6) | Total cost | NULL |
| `success` | BOOLEAN | Whether operation succeeded | DEFAULT true |
| `error_type` | VARCHAR(100) | Error type if failed | NULL |
| `error_message` | TEXT | Error details | NULL |
| `retry_count` | INTEGER | Number of retries | DEFAULT 0 |
| `created_at` | TIMESTAMP | When operation occurred | DEFAULT NOW() |

**Agent Types:**
- `chat_model_agent`, `provider_tools_agent`, `document_agent`
- `python_agent`, `mermaid_agent`, `git_mcp_agent`

**Operation Types:**
- `initialization`, `tool_invocation`, `code_generation`
- `document_generation`, `diagram_generation`, `code_execution`
- `search`, `url_fetch`, `mcp_operation`, `streaming`

**Relationships:**
- May belong to `auth.users` via `user_id`
- Links to `user_activity_logs` via `correlation_id`

---

## Database Functions

### 1. **get_user_role()**
**Purpose:** Helper function to get user role from JWT for RLS policies.

**Returns:** TEXT ('admin' or 'user')

**Used in:** RLS policies to check admin access

**Definition:**
```sql
SELECT COALESCE(
  current_setting('request.jwt.claims', true)::json -> 'user_metadata' ->> 'role',
  'user'
)::TEXT;
```

---

### 2. **validate_user_id()**
**Purpose:** Validates that user_id exists in auth.users before INSERT/UPDATE.

**Returns:** TRIGGER

**Used in:** Triggers on all tables with user_id column

**Behavior:**
- Checks if user_id exists in auth.users
- Raises exception if user not found
- Provides FK-like protection (cross-schema FKs not allowed in Supabase)

**Definition:** See `lib/db/migrations/0002_functions.sql:18-33`

---

### 3. **handle_auth_user_deletion()**
**Purpose:** Cascade deletes user data when auth.users row is deleted.

**Returns:** TRIGGER

**Used in:** Trigger on auth.users BEFORE DELETE

**Behavior:**
- Deletes user's chats (cascades to messages, votes, streams)
- Deletes user's documents (cascades to suggestions)
- Deletes usage logs, rate limits, GitHub repos
- Clears `resolved_by` and `updated_by` references in error_logs and admin_config

**Definition:** See `lib/db/migrations/0002_functions.sql:38-69`

---

### 4. **get_current_user_usage_summary()**
**Purpose:** Get current user's usage summary with agent breakdown.

**Parameters:**
- `p_start_date` DATE (default: 30 days ago)
- `p_end_date` DATE (default: today)

**Returns:** TABLE with columns:
- `total_calls` BIGINT
- `total_input_tokens` BIGINT
- `total_output_tokens` BIGINT
- `total_tokens` BIGINT
- `total_cost` NUMERIC
- `agent_breakdown` JSONB

**Security:** SECURITY INVOKER (uses RLS policies)

**Used in:** Usage analytics API

**Definition:** See `lib/db/migrations/0002_functions.sql:72-124`

---

### 5. **is_current_user_admin()**
**Purpose:** Check if current user is an admin.

**Returns:** BOOLEAN

**Security:** SECURITY INVOKER

**Used in:** Admin route guards, UI conditional rendering

**Definition:** See `lib/db/migrations/0002_functions.sql:127-136`

---

### 6. **update_admin_config_timestamp()**
**Purpose:** Auto-update `updated_at` timestamp when admin_config is modified.

**Returns:** TRIGGER

**Used in:** Trigger on admin_config BEFORE UPDATE

**Definition:** See `lib/db/migrations/0002_functions.sql:139-145`

---

### 7. **update_model_config_timestamp()**
**Purpose:** Auto-update `updated_at` timestamp when model_config is modified.

**Returns:** TRIGGER

**Used in:** Trigger on model_config BEFORE UPDATE

**Definition:** See `lib/db/migrations/0002_functions.sql:148-154`

---

### 8. **ensure_single_default_model_per_provider()**
**Purpose:** Ensures only one model is default per provider.

**Returns:** TRIGGER

**Used in:** Trigger on model_config BEFORE INSERT OR UPDATE

**Behavior:**
- If setting a model as default, unsets other defaults for same provider
- Prevents removing last default model for a provider

**Definition:** See `lib/db/migrations/0002_functions.sql:157-185`

---

### 9. **validate_admin_config_data()**
**Purpose:** Validates admin config JSON structure before INSERT/UPDATE.

**Returns:** TRIGGER

**Used in:** Trigger on admin_config BEFORE INSERT OR UPDATE

**Validation Rules:**
- Agent configs must have `enabled` and `rateLimit` fields
- Rate limit must have `perMinute`, `perHour`, `perDay`
- Tool-based agents must have `tools` configuration
- Provider tools agent must have `systemPrompt`
- Chat model agent must have `capabilities` and `tools`

**Definition:** See `lib/db/migrations/0002_functions.sql:188-300`

---

### 10. **get_logging_config()**
**Purpose:** Get logging configuration from admin_config.

**Returns:** JSONB

**Security:** SECURITY DEFINER

**Default:** Returns default logging config if not set

**Definition:** See `lib/db/migrations/0002_functions.sql:307-322`

---

### 11. **is_user_activity_logging_enabled()**
**Purpose:** Check if user activity logging is enabled.

**Returns:** BOOLEAN

**Security:** SECURITY DEFINER

**Definition:** See `lib/db/migrations/0002_functions.sql:325-335`

---

### 12. **is_agent_activity_logging_enabled()**
**Purpose:** Check if agent activity logging is enabled.

**Returns:** BOOLEAN

**Security:** SECURITY DEFINER

**Definition:** See `lib/db/migrations/0002_functions.sql:338-348`

---

### 13. **purge_old_activity_logs()**
**Purpose:** Purge old logs based on retention policy in logging_settings.

**Returns:** TABLE with columns:
- `user_logs_deleted` BIGINT
- `agent_logs_deleted` BIGINT
- `error_logs_deleted` BIGINT

**Security:** SECURITY DEFINER

**Behavior:**
- Reads retention days from logging_settings
- Deletes old user activity logs
- Deletes old agent activity logs
- Deletes old resolved error logs

**Definition:** See `lib/db/migrations/0002_functions.sql:351-402`

---

## Indexes

**Purpose:** Optimize query performance for common access patterns.

### Chat Indexes
- `idx_chat_user_id` - Lookup chats by user
- `idx_chat_user_created` - User's chats sorted by creation date

### Message Indexes
- `idx_message_chat` - Messages in a chat (ordered by creation)

### Document Indexes
- `idx_document_user_id` - User's documents
- `idx_document_user` - User's documents sorted by creation
- `idx_document_versions` - Version history lookup
- `idx_document_chat` - Documents in a chat
- `idx_document_parent` - Version tree navigation
- `idx_document_kind` - Filter by document type

### Suggestion Indexes
- `idx_suggestion_user_id` - User's suggestions

### Usage Logs Indexes
- `idx_usage_logs_user_id` - User's usage logs
- `idx_usage_logs_user_timestamp` - User's usage over time
- `idx_usage_logs_agent_timestamp` - Agent usage over time
- `idx_usage_logs_date_range` - Date range queries
- `idx_usage_logs_model_provider` - Model/provider analytics
- `idx_usage_logs_date_agent` - Charts by date and agent
- `idx_usage_logs_cost_date` - Cost calculations

### Rate Limit Indexes
- `idx_rate_limit_user_id` - User's rate limits
- `idx_rate_limit_user_agent` - Rate limit lookup
- `idx_rate_limit_user_agent_period` - Composite for rate checks

### GitHub Repository Indexes
- `idx_github_repos_user_id` - User's repositories
- `idx_github_repos_user` - User's active repos
- `idx_github_repos_user_active` - Active repos by last access

### Error Logs Indexes
- `idx_error_logs_user_id` - User's errors
- `idx_error_logs_error_type` - Filter by error type
- `idx_error_logs_error_category` - Filter by category
- `idx_error_logs_severity` - Filter by severity
- `idx_error_logs_created_at` - Sort by date
- `idx_error_logs_resolved` - Filter resolved/unresolved
- `idx_error_logs_user_created` - User errors by date
- `idx_error_logs_type_severity` - Composite for monitoring

### Admin Config Indexes
- `idx_admin_config_key` - Lookup by config key
- `idx_admin_config_updated` - Sort by update time

### Model Config Indexes
- `idx_model_config_model_id` - Lookup by model ID
- `idx_model_config_provider` - Filter by provider
- `idx_model_config_provider_active` - Active models per provider
- `idx_model_config_provider_default` - Default model per provider
- `idx_model_config_active` - All active models

### User Activity Logs Indexes
- `idx_user_activity_user_id` - User's activities
- `idx_user_activity_correlation` - Linked activities
- `idx_user_activity_type` - Filter by activity type
- `idx_user_activity_category` - Filter by category
- `idx_user_activity_created` - Sort by date
- `idx_user_activity_user_created` - User activities by date
- `idx_user_activity_resource` - Resource-based lookup
- `idx_user_activity_success` - Filter by success/failure
- `idx_user_activity_user_type_date` - Composite for analytics

### Agent Activity Logs Indexes
- `idx_agent_activity_user_id` - User's agent activities
- `idx_agent_activity_correlation` - Linked to user activities
- `idx_agent_activity_agent_type` - Filter by agent type
- `idx_agent_activity_operation` - Filter by operation
- `idx_agent_activity_category` - Filter by category
- `idx_agent_activity_created` - Sort by date
- `idx_agent_activity_model` - Model usage analytics
- `idx_agent_activity_success` - Filter by success/failure
- `idx_agent_activity_resource` - Resource-based lookup
- `idx_agent_activity_duration` - Performance analysis
- `idx_agent_activity_cost` - Cost analytics
- `idx_agent_activity_agent_op_date` - Composite for analytics

**Definition:** See `lib/db/migrations/0003_indexes.sql`

---

## Triggers

**Purpose:** Enforce data integrity and business rules.

### CASCADE DELETE Trigger
- **Trigger:** `on_auth_user_deleted`
- **Table:** `auth.users`
- **Event:** BEFORE DELETE
- **Function:** `handle_auth_user_deletion()`
- **Purpose:** Clean up user data when user is deleted

### User ID Validation Triggers
- **Trigger:** `validate_chat_user_id`
- **Table:** `Chat`
- **Event:** BEFORE INSERT OR UPDATE
- **Function:** `validate_user_id()`
- **Purpose:** Ensure user_id exists in auth.users

- **Trigger:** `validate_document_user_id`
- **Table:** `Document`
- **Event:** BEFORE INSERT OR UPDATE
- **Function:** `validate_user_id()`

- **Trigger:** `validate_suggestion_user_id`
- **Table:** `Suggestion`
- **Event:** BEFORE INSERT OR UPDATE
- **Function:** `validate_user_id()`

- **Trigger:** `validate_usage_logs_user_id`
- **Table:** `usage_logs`
- **Event:** BEFORE INSERT OR UPDATE
- **Function:** `validate_user_id()`

- **Trigger:** `validate_rate_limit_user_id`
- **Table:** `rate_limit_tracking`
- **Event:** BEFORE INSERT OR UPDATE
- **Function:** `validate_user_id()`

- **Trigger:** `validate_github_repos_user_id`
- **Table:** `github_repositories`
- **Event:** BEFORE INSERT OR UPDATE
- **Function:** `validate_user_id()`

### Timestamp Update Triggers
- **Trigger:** `trigger_admin_config_updated_at`
- **Table:** `admin_config`
- **Event:** BEFORE UPDATE
- **Function:** `update_admin_config_timestamp()`
- **Purpose:** Auto-update updated_at field

- **Trigger:** `trigger_model_config_updated_at`
- **Table:** `model_config`
- **Event:** BEFORE UPDATE
- **Function:** `update_model_config_timestamp()`

### Config Validation Triggers
- **Trigger:** `trigger_validate_admin_config`
- **Table:** `admin_config`
- **Event:** BEFORE INSERT OR UPDATE
- **Function:** `validate_admin_config_data()`
- **Purpose:** Validate JSON structure

- **Trigger:** `trigger_ensure_single_default_model`
- **Table:** `model_config`
- **Event:** BEFORE INSERT OR UPDATE
- **Function:** `ensure_single_default_model_per_provider()`
- **Purpose:** Ensure only one default model per provider

**Definition:** See `lib/db/migrations/0004_triggers.sql`

---

## Row Level Security (RLS)

**Purpose:** Data isolation and authorization at the database level.

### Core Tables RLS Policies

#### Chat Table
- **Policy:** "Users can read own chats"
  - **Operation:** SELECT
  - **Rule:** `auth.uid() = user_id`

- **Policy:** "Users can create own chats"
  - **Operation:** INSERT
  - **Rule:** `auth.uid() = user_id`

- **Policy:** "Users can update own chats"
  - **Operation:** UPDATE
  - **Rule:** `auth.uid() = user_id`

- **Policy:** "Users can delete own chats"
  - **Operation:** DELETE
  - **Rule:** `auth.uid() = user_id`

- **Policy:** "Admins can read all chats"
  - **Operation:** SELECT
  - **Rule:** `public.get_user_role() = 'admin'`

#### Message_v2 Table
- **Policy:** "Users can read own messages"
  - **Operation:** SELECT
  - **Rule:** Message belongs to user's chat

- **Policy:** "Users can create messages in own chats"
  - **Operation:** INSERT
  - **Rule:** Message belongs to user's chat

#### Vote_v2 Table
- **Policy:** "Users can vote on messages in own chats"
  - **Operation:** ALL
  - **Rule:** Vote belongs to user's chat

#### Document Table
- **Policy:** "Users can read own documents"
  - **Operation:** SELECT
  - **Rule:** `auth.uid() = user_id`

- **Policy:** "Users can create own documents"
  - **Operation:** INSERT
  - **Rule:** `auth.uid() = user_id`

- **Policy:** "Users can update own documents"
  - **Operation:** UPDATE
  - **Rule:** `auth.uid() = user_id`

- **Policy:** "Users can delete own documents"
  - **Operation:** DELETE
  - **Rule:** `auth.uid() = user_id`

#### Suggestion Table
- Similar to Document (users can manage own suggestions)

#### Stream Table
- **Policy:** "Users can access streams in own chats"
  - **Operation:** ALL
  - **Rule:** Stream belongs to user's chat

### Admin & Analytics Tables RLS Policies

#### admin_config Table
- **Policy:** "Admins can read admin_config"
  - **Operation:** SELECT
  - **Rule:** `public.get_user_role() = 'admin'`

- **Policy:** "Admins can update admin_config"
  - **Operation:** ALL
  - **Rule:** `public.get_user_role() = 'admin'`

#### model_config Table
- **Policy:** "Authenticated users can read model_config"
  - **Operation:** SELECT
  - **Rule:** `auth.uid() IS NOT NULL`

- **Policy:** "Admins can manage model_config"
  - **Operation:** ALL
  - **Rule:** `public.get_user_role() = 'admin'`

#### usage_logs Table
- **Policy:** "Users can read own usage_logs"
  - **Operation:** SELECT
  - **Rule:** `auth.uid() = user_id`

- **Policy:** "Admins can read all usage_logs"
  - **Operation:** SELECT
  - **Rule:** `public.get_user_role() = 'admin'`

- **Policy:** "System can create usage_logs"
  - **Operation:** INSERT
  - **Rule:** `true` (anyone can insert)

#### rate_limit_tracking Table
- **Policy:** "Users can read own rate_limits"
  - **Operation:** SELECT
  - **Rule:** `auth.uid() = user_id`

- **Policy:** "System can manage rate_limits"
  - **Operation:** ALL
  - **Rule:** `true` (system-managed)

#### github_repositories Table
- **Policy:** "Users can manage own repositories"
  - **Operation:** ALL
  - **Rule:** `auth.uid() = user_id`

#### error_logs Table
- **Policy:** "Users can read own error_logs"
  - **Operation:** SELECT
  - **Rule:** `auth.uid() = user_id`

- **Policy:** "Admins can read all error_logs"
  - **Operation:** SELECT
  - **Rule:** `public.get_user_role() = 'admin'`

- **Policy:** "Admins can update error_logs"
  - **Operation:** UPDATE
  - **Rule:** `public.get_user_role() = 'admin'`

- **Policy:** "System can insert error_logs"
  - **Operation:** INSERT
  - **Rule:** `true`

### Activity Logging Tables RLS Policies

#### user_activity_logs Table
- **Policy:** "Users can read own activity logs"
  - **Operation:** SELECT
  - **Rule:** `auth.uid() = user_id`

- **Policy:** "Admins can read all activity logs"
  - **Operation:** SELECT
  - **Rule:** `public.get_user_role() = 'admin'`

- **Policy:** "System can insert activity logs"
  - **Operation:** INSERT
  - **Rule:** `true`

#### agent_activity_logs Table
- **Policy:** "Users can read own agent logs"
  - **Operation:** SELECT
  - **Rule:** `auth.uid() = user_id`

- **Policy:** "Admins can read all agent logs"
  - **Operation:** SELECT
  - **Rule:** `public.get_user_role() = 'admin'`

- **Policy:** "System can insert agent logs"
  - **Operation:** INSERT
  - **Rule:** `true`

**Definition:** See `lib/db/migrations/0005_rls.sql`

---

## Seed Data

### 1. **App Settings** (`0006_seed_data_app_settings.sql`)

**Config Key:** `app_settings`

**Data:**
```json
{
  "activeProvider": "google",
  "availableProviders": ["google", "openai", "anthropic"]
}
```

**Config Key:** `logging_settings`

**Data:**
```json
{
  "error_logging_enabled": true,
  "user_activity_logging_enabled": false,
  "agent_activity_logging_enabled": false,
  "log_retention_days": {
    "error_logs": 90,
    "user_activity_logs": 30,
    "agent_activity_logs": 7
  },
  "category_toggles": {
    "log_auth_events": true,
    "log_chat_events": true,
    ...
  },
  "performance_settings": {
    "batch_writes": true,
    "batch_size": 100,
    ...
  },
  "privacy_settings": {
    "anonymize_ip": false,
    ...
  }
}
```

---

### 2. **Google Agent Configurations** (`0006_seed_data_google.sql`)

Inserts 6 agent configurations for Google provider:

1. **chat_model_agent_google** - Main chat interface
   - System prompt with tool usage guidelines
   - File input capabilities configuration
   - Tools: providerToolsAgent, documentAgent, pythonAgent, mermaidAgent, gitMcpAgent
   - Rate limits: 10/min, 100/hour, 1000/day

2. **provider_tools_agent_google** - External services
   - Tools: googleSearch, urlContext, codeExecution
   - Rate limits: 8/min, 80/hour, 500/day

3. **document_agent_google** - Document operations
   - Tools: create, update, suggestion, revert
   - Each tool has systemPrompt and userPromptTemplate
   - Rate limits: 5/min, 50/hour, 200/day

4. **python_agent_google** - Python code operations
   - Tools: create, update, fix, explain, generate, revert
   - Rate limits: 5/min, 50/hour, 200/day

5. **mermaid_agent_google** - Diagram operations
   - Tools: create, update, fix, generate, revert
   - Rate limits: 3/min, 25/hour, 100/day

6. **git_mcp_agent_google** - GitHub operations
   - Tools: repos, issues, pull_requests, users, code_search, branches
   - Rate limits: 5/min, 50/hour, 200/day

**Note:** Similar configurations exist for OpenAI and Anthropic providers in separate seed files.

---

### 3. **Model Configurations** (`0007_seed_data_model_config.sql`)

**Google Models:**
- gemini-2.0-flash (default)
- gemini-2.5-flash
- gemini-2.5-pro
- gemma-3 (inactive)

**OpenAI Models:**
- gpt-4o (default)
- gpt-4o-mini
- gpt-4-turbo (inactive)

**Anthropic Models:**
- claude-3-5-sonnet-20241022 (default)
- claude-3-5-haiku-20241022
- claude-3-opus-20240229 (inactive)

Each model includes:
- Pricing (input/output per million tokens)
- Metadata (context window, max output tokens)
- Active/default status
- Thinking/reasoning capability flag

---

## Supabase Setup

### Create Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up with GitHub or email
3. Create a new project
4. Wait for project provisioning (2-3 minutes)

### Get Environment Variables

After project creation, navigate to:
**Settings → API**

You'll need these 4 variables:

#### 1. **NEXT_PUBLIC_SUPABASE_URL**
- **Location:** Project Settings → API → Project URL
- **Example:** `https://xxxxxxxxxxxxx.supabase.co`
- **Usage:** Public URL for Supabase client

#### 2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
- **Location:** Project Settings → API → Project API keys → anon public
- **Example:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Usage:** Public anon key for client-side operations (respects RLS)

#### 3. **SUPABASE_SERVICE_ROLE_KEY**
- **Location:** Project Settings → API → Project API keys → service_role
- **Example:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **⚠️ WARNING:** This key bypasses RLS! Keep it secret!
- **Usage:** Server-side admin operations

#### 4. **POSTGRES_URL**
- **Location:** Project Settings → Database → Connection string → URI
- **Example:** `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres`
- **Usage:** Direct database connection for migrations

**Important:** Click "Show" to reveal each key and copy the full value.

### Add to .env.local

Create a `.env.local` file in the project root:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
POSTGRES_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
```

---

## Database Migrations

### Available Commands

#### 1. **npm run db:reset**
**Purpose:** Drop all tables, functions, and triggers

**Usage:**
```bash
npm run db:reset
```

**What it does:**
- Drops all tables in reverse dependency order
- Drops all functions
- Drops all triggers
- Cleans the database completely

**⚠️ WARNING:** This is destructive! All data will be lost.

**When to use:**
- Starting fresh
- Fixing migration issues
- Resetting test database

**Implementation:** See `lib/db/reset.ts`

---

#### 2. **npm run db:migrate**
**Purpose:** Run all migrations to set up the database

**Usage:**
```bash
npm run db:migrate
```

**What it does:**
Runs migrations in this order:
1. `0001_tables.sql` - Create all tables
2. `0002_functions.sql` - Create all functions
3. `0003_indexes.sql` - Create all indexes
4. `0004_triggers.sql` - Create all triggers
5. `0005_rls.sql` - Enable RLS and create policies
6. `0006_seed_data_app_settings.sql` - Insert app settings
7. `0006_seed_data_google.sql` - Insert Google agent configs
8. `0006_seed_data_openai.sql` - Insert OpenAI agent configs
9. `0006_seed_data_anthropic.sql` - Insert Anthropic agent configs
10. `0007_seed_data_model_config.sql` - Insert model configurations

**When to use:**
- Initial setup
- After running db:reset
- Deploying to new environment

**Implementation:** See `lib/db/migrate.ts`

---

#### 3. **npm run db:verify**
**Purpose:** Verify database migration was successful

**Usage:**
```bash
npm run db:verify
```

**What it checks:**
- ✅ All expected tables exist
- ✅ All expected functions exist
- ✅ All expected indexes exist
- ✅ All expected triggers exist
- ✅ All expected RLS policies exist
- ✅ Seed data is present and correct

**Output:** Detailed report of what passed/failed

**When to use:**
- After running db:migrate
- Troubleshooting database issues
- Verifying production database

**Implementation:** See `lib/db/verify-migration.ts`

---

### Complete Setup Flow

```bash
# 1. Reset database (optional, if starting fresh)
npm run db:reset

# 2. Run migrations
npm run db:migrate

# 3. Verify everything worked
npm run db:verify
```

**Expected Output:**
```
✅ PASSED - Tables
✅ PASSED - Functions
✅ PASSED - Indexes
✅ PASSED - Triggers
✅ PASSED - RLS Policies
✅ PASSED - Seed Data
```

---

## Schema Changes

### How to Make Schema Changes

When you need to modify the database schema, follow these steps:

#### 1. **Create New SQL Files**

Create separate files for different migration types:

```
lib/db/migrations/
  0008_new_tables.sql          # New tables
  0009_new_functions.sql       # New functions
  0010_new_indexes.sql         # New indexes
  0011_new_triggers.sql        # New triggers
  0012_new_rls.sql             # New RLS policies
```

**Example - Adding a new table:**

`lib/db/migrations/0008_new_feature_table.sql`:
```sql
-- New feature table
CREATE TABLE IF NOT EXISTS "FeatureName" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add index
CREATE INDEX IF NOT EXISTS idx_feature_user ON "FeatureName"(user_id);

-- Add RLS
ALTER TABLE "FeatureName" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own features" ON "FeatureName"
  FOR ALL USING (auth.uid() = user_id);
```

---

#### 2. **Update `_journal.json`**

Add your new migration to `lib/db/migrations/meta/_journal.json`:

```json
{
  "version": "7",
  "dialect": "postgresql",
  "entries": [
    ...existing entries...,
    {
      "idx": 10,
      "version": "7",
      "when": 1730500000000,
      "tag": "0008_new_feature_table",
      "breakpoints": true
    }
  ]
}
```

**Notes:**
- `idx` increments sequentially
- `when` is Unix timestamp in milliseconds (current time)
- `tag` matches your SQL filename (without .sql extension)

---

#### 3. **Update Migration Script**

Update `lib/db/migrate.ts` to include new migration:

```typescript
const migrationFiles = [
  "0001_tables.sql",
  "0002_functions.sql",
  ...
  "0008_new_feature_table.sql", // Add here
];
```

---

#### 4. **Update Verification Script**

Update `lib/db/verify-migration.ts` to check new schema:

```typescript
// Add to expectedTables array
const expectedTables = [
  "Chat",
  "Message_v2",
  ...
  "FeatureName", // Add here
];

// Add specific verification checks if needed
const featureCheck = await connection`
  SELECT COUNT(*) FROM "FeatureName"
`;
```

---

#### 5. **Update Drizzle Schema**

Add TypeScript types in `lib/db/drizzle-schema.ts`:

```typescript
export const featureName = pgTable("FeatureName", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull(),
  data: jsonb("data").notNull().default({}),
  created_at: timestamp("created_at").defaultNow(),
});

export type FeatureName = typeof featureName.$inferSelect;
export type NewFeatureName = typeof featureName.$inferInsert;
```

---

#### 6. **Create Query Functions**

Add query functions in `lib/db/queries/`:

Create `lib/db/queries/feature.ts`:
```typescript
import "server-only";
import { eq } from "drizzle-orm";
import { db } from "./base";
import { featureName } from "../drizzle-schema";

export async function getFeaturesByUserId({ userId }: { userId: string }) {
  return await db
    .select()
    .from(featureName)
    .where(eq(featureName.user_id, userId));
}

export async function createFeature({ userId, data }: { userId: string; data: any }) {
  const [created] = await db
    .insert(featureName)
    .values({ user_id: userId, data })
    .returning();
  return created;
}
```

---

#### 7. **Test Migration**

```bash
# Reset and run new migration
npm run db:reset
npm run db:migrate

# Verify
npm run db:verify
```

---

### Schema Change Best Practices

1. **Separate Concerns** - Keep tables, functions, indexes, triggers, and RLS in separate files
2. **Idempotent Migrations** - Always use `IF NOT EXISTS` or `IF EXISTS` clauses
3. **Version Numbers** - Use sequential numbering (0008, 0009, 0010...)
4. **Test Locally First** - Always test on local/dev environment before production
5. **Backup Production** - Take Supabase backup before running migrations
6. **Document Changes** - Add comments in SQL explaining what and why
7. **Rollback Plan** - Know how to undo changes if something goes wrong

---

### Admin and Model Config Updates

**Admin configurations** and **model configurations** should be updated via the UI:

1. **Admin Configurations:**
   - Go to Admin Dashboard → Agent Configuration
   - Edit agent settings (system prompts, rate limits, tools)
   - Changes saved to `admin_config` table

2. **Model Configurations:**
   - Go to Admin Dashboard → Model Configuration
   - Edit model settings (pricing, active status, default)
   - Changes saved to `model_config` table

**Why not via migrations?**
- These are operational settings, not schema
- Need hot-reload without downtime
- Admins should control without code deployments

**When to use migrations:**
- Adding new agent types
- Adding new providers
- Changing table structure
- Adding new validation rules

---

## TODOs

### High Priority

- [ ] **Setup Supabase Storage**
  - Create storage buckets for file uploads
  - Configure RLS policies for storage
  - Add file upload limits
  - Document storage setup in this file

- [ ] **Optimize Database Performance**
  - Review and optimize indexes based on query patterns
  - Add composite indexes for common query combinations
  - Consider partitioning for large tables (usage_logs, activity_logs)
  - Add query performance monitoring

- [ ] **Optimize RLS Policies**
  - Review RLS policy performance
  - Consider using security definer functions for complex checks
  - Add RLS exemptions for service role where appropriate

### Medium Priority

- [ ] **Add Database Backup Strategy**
  - Document Supabase backup procedures
  - Set up automated backups
  - Test restore procedures

- [ ] **Implement Data Retention Policies**
  - Set up automated cleanup for old logs
  - Archive historical data
  - Document retention periods

- [ ] **Add Database Monitoring**
  - Set up query performance monitoring
  - Track slow queries
  - Monitor database size and growth

### Low Priority

- [ ] **Consider Materialized Views**
  - For usage analytics
  - For admin dashboards
  - Document refresh strategies

- [ ] **Add Database Health Checks**
  - Connectivity checks
  - RLS policy validation
  - Data consistency checks

---

## Additional Resources

- **Supabase Documentation:** https://supabase.com/docs
- **PostgreSQL Documentation:** https://www.postgresql.org/docs/
- **Drizzle ORM Documentation:** https://orm.drizzle.team/

---

**Last Updated:** 2024-11-15
