# Comprehensive Development Plan: Supabase Migration & Feature Enhancement

## Project Overview
This document outlines the complete migration from Vercel Postgres to Supabase and implementation of new admin, usage, and settings features for the AI chatbot application.

---

## PART 1: CURRENT CODEBASE ANALYSIS

### Current Technology Stack
- **Framework**: Next.js 15 (App Router, React Server Components)
- **AI/LLM**: AI SDK with xAI (Grok models), Vercel AI Gateway
- **Database**: Vercel Postgres with Drizzle ORM
- **Authentication**: NextAuth.js v5 (Credentials provider with guest mode)
- **File Storage**: Vercel Blob Storage
- **Caching**: Redis (optional, for resumable streams)
- **UI**: shadcn/ui, Tailwind CSS, Radix UI
- **State Management**: SWR for data fetching

### Target Technology Stack (After Migration)
- **Framework**: Next.js 15 (App Router, React Server Components)
- **AI/LLM**: Google Gemini API (direct calls from client)
- **Database**: Supabase Postgres with Drizzle ORM
- **Authentication**: Supabase Auth with RBAC
- **File Storage**: Supabase Storage
- **API Keys**: Browser localStorage (client-side)
- **UI**: shadcn/ui, Tailwind CSS, Radix UI
- **State Management**: SWR for data fetching

### Current Database Schema

#### 1. **User Authentication** (Managed by Supabase Auth)
```
Table: auth.users (Supabase managed, read-only from app)
- id: uuid (PK)
- email: varchar
- encrypted_password: varchar
- raw_user_meta_data: jsonb
  Example: {
    "role": "user|admin",
    "settings": {"theme": "dark", "defaultModel": "gemini-2.0-flash"},
    "isActive": true
  }
- created_at: timestamp
- last_sign_in_at: timestamp
```

**Note**: No custom User table - using Supabase Auth directly

#### 2. **Chat Table**
```
- id: uuid (PK, auto-generated)
- createdAt: timestamp
- title: text
- user_id: uuid (FK → auth.users.id via auth.uid())
- visibility: varchar (enum: 'public', 'private', default: 'private')
- lastContext: jsonb (stores AppUsage data - token counts, costs)
```

**FK Change**: `user_id` now references `auth.users(id)` directly

#### 3. **Message_v2 Table** (Current)
```
- id: uuid (PK, auto-generated)
- chatId: uuid (FK → Chat.id)
- role: varchar
- parts: json (message content parts)
- attachments: json (file attachments)
- createdAt: timestamp
```

#### 4. **Vote_v2 Table**
```
- chatId: uuid (FK → Chat.id)
- messageId: uuid (FK → Message_v2.id)
- isUpvoted: boolean
- PK: (chatId, messageId)
```

#### 5. **Document Table** (Artifacts)
```
- id: uuid (part of composite PK)
- createdAt: timestamp (part of composite PK)
- title: text
- content: text
- kind: varchar (enum: 'text', 'code', 'image', 'sheet')
- userId: uuid (FK → User.id)
- PK: (id, createdAt) - allows versioning
```

#### 6. **Suggestion Table** (Document suggestions)
```
- id: uuid (PK)
- documentId: uuid (FK → Document.id)
- documentCreatedAt: timestamp (FK → Document.createdAt)
- originalText: text
- suggestedText: text
- description: text
- isResolved: boolean (default: false)
- userId: uuid (FK → User.id)
- createdAt: timestamp
```

#### 7. **Stream Table** (Tracking active streams)
```
- id: uuid (PK)
- chatId: uuid (FK → Chat.id)
- createdAt: timestamp
```

### Current Authentication Flow
- NextAuth.js with custom Credentials provider
- Two auth modes:
  1. **Regular users**: Email/password (bcrypt hashed)
  2. **Guest users**: Auto-generated temporary accounts (email: `guest-{timestamp}`)
- Guest detection via regex pattern: `/^guest-\d+$/`
- Rate limiting based on user type (guest: 20 msgs/day, regular: 100 msgs/day)

### Current AI Architecture
- **Routing**: Not explicit - model selection handled via UI
- **Chat Model**: xAI Grok (grok-2-vision-1212, grok-3-mini)
- **Reasoning Model**: grok-3-mini with extracted reasoning middleware
- **Artifact Model**: grok-2-1212 for document generation
- **Title Model**: grok-2-1212 for chat title generation
- **Tools Available**: 
  - getWeather
  - createDocument
  - updateDocument
  - requestSuggestions

### Current Usage Tracking
- Token usage tracked via TokenLens library
- Usage data stored in `Chat.lastContext` field as JSONB
- Includes: promptTokens, completionTokens, totalTokens, cost estimates, modelId
- Rate limiting via message count per 24 hours

### Current File Storage
- Vercel Blob Storage for file uploads
- Used for attachments in chat messages

---

## PART 2: DATABASE MIGRATION PLAN

### What Changes Need to Be Made to Database Schema

#### A. New Tables to Create

##### 1. **admin_config Table** (System-wide configuration)
```
- id: uuid (PK, auto-generated)
- config_key: varchar(100) UNIQUE - e.g., 'routing_agent', 'chat_agent_google', etc.
- config_data: jsonb - stores all configuration as flexible JSON
- updated_at: timestamp (auto-update)
- updated_by: uuid (FK → auth.users.id) - admin who made the change
- created_at: timestamp
```

**Purpose**: Store all agent configurations centrally with versioning capability

**Initial config_keys**:
- `routing_agent_google` - stores: system_prompt, rate_limit_type, rate_limit_value, model_provider, model_name
- `chat_agent_google` - stores: system_prompt, rate_limit, capabilities, tools, models
- `document_agent_google` - stores: system_prompt, rate_limit, enabled_tools, models
- `python_code_agent_google` - stores: system_prompt, rate_limit, enabled_tools, code_execution_settings, models
- `mermaid_agent_google` - stores: system_prompt, rate_limit, enabled_tools, models
- `git_mcp_agent_google` - stores: system_prompt, rate_limit, mcp_config, models

##### 2. **usage_logs Table** (Detailed usage tracking)
```
- id: uuid (PK, auto-generated)
- user_id: uuid (FK → auth.users.id)
- chat_id: uuid (FK → Chat.id, nullable)
- agent_type: varchar(50) - 'routing', 'chat', 'artifact', 'git_mcp'
- model_used: varchar(100) - e.g., 'gemini-2.0-flash'
- provider: varchar(50) - 'google', 'openai', 'anthropic'
- input_tokens: integer
- output_tokens: integer
- total_tokens: integer
- input_cost: decimal(10, 6) - cost in USD
- output_cost: decimal(10, 6)
- total_cost: decimal(10, 6)
- request_timestamp: timestamp
- response_timestamp: timestamp
- duration_ms: integer
- metadata: jsonb - additional context (tool calls, errors, etc.)
```

**Purpose**: Comprehensive usage tracking for analytics and billing

##### 3. **rate_limit_tracking Table** (Track rate limits per user)
```
- id: uuid (PK, auto-generated)
- user_id: uuid (FK → auth.users.id)
- agent_type: varchar(50)
- period_start: timestamp
- period_end: timestamp
- request_count: integer
- limit_type: varchar(20) - 'hourly', 'daily'
- limit_value: integer
- created_at: timestamp
```

**Purpose**: Enforce rate limiting across different agents per user

##### 4. **github_repositories Table** (User's connected repos)
```
- id: uuid (PK, auto-generated)
- user_id: uuid (FK → auth.users.id)
- repo_owner: varchar(100)
- repo_name: varchar(100)
- repo_url: text
- default_branch: varchar(100)
- is_active: boolean (default: true)
- last_accessed: timestamp
- created_at: timestamp
```

**Purpose**: Store user's GitHub repositories for Git MCP integration

#### B. Tables to Modify

##### 1. **Chat Table** - Enhance usage tracking
```
ADD COLUMNS:
- total_input_tokens: integer (default: 0)
- total_output_tokens: integer (default: 0)
- total_cost: decimal(10, 6) (default: 0)
- updated_at: timestamp

MODIFY COLUMNS:
- userId → user_id (rename for consistency)
- Add FK: REFERENCES auth.users(id) ON DELETE CASCADE
```

##### 2. **Message_v2 Table** - Add usage per message
```
ADD COLUMNS:
- model_used: varchar(100)
- input_tokens: integer
- output_tokens: integer
- cost: decimal(10, 6)
```

##### 3. **Document Table** - Update foreign key
```
MODIFY COLUMNS:
- userId → user_id (rename for consistency)
- Add FK: REFERENCES auth.users(id) ON DELETE CASCADE
```

##### 4. **Suggestion Table** - Update foreign key
```
MODIFY COLUMNS:
- userId → user_id (rename for consistency)
- Add FK: REFERENCES auth.users(id) ON DELETE CASCADE
```

#### C. RBAC (Role-Based Access Control) Setup

**Supabase Auth with Role in User Metadata**:

1. **User Metadata Structure in `auth.users.raw_user_meta_data`**:
```json
{
  "role": "user",  // or "admin"
  "settings": {
    "theme": "dark",
    "defaultModel": "gemini-2.0-flash",
    "notifications": true
  },
  "isActive": true
}
```

2. **Set Role During Registration**:
```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password',
  options: {
    data: {
      role: 'user',  // default to 'user', manually set 'admin' for first admin
      isActive: true
    }
  }
})
```

3. **RLS Policies for Admin Access**:
```sql
-- Enable RLS on all tables
ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message_v2" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role from JWT
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS text AS $$
  SELECT COALESCE(
    auth.jwt() -> 'user_metadata' ->> 'role',
    'user'
  )::text;
$$ LANGUAGE sql STABLE;

-- Admin-only access to admin_config
CREATE POLICY "Admins can read admin_config" ON admin_config
  FOR SELECT USING (auth.user_role() = 'admin');

CREATE POLICY "Admins can update admin_config" ON admin_config
  FOR ALL USING (auth.user_role() = 'admin');

-- Users can only see their own chats
CREATE POLICY "Users can read own chats" ON chat
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own chats" ON chat
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chats" ON chat
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own chats" ON chat
  FOR DELETE USING (auth.uid() = user_id);

-- Admin can view all chats
CREATE POLICY "Admins can read all chats" ON chat
  FOR SELECT USING (auth.user_role() = 'admin');

-- Admins can view all usage logs, users only their own
CREATE POLICY "Admins can read all usage_logs" ON usage_logs
  FOR SELECT USING (
    auth.user_role() = 'admin' OR auth.uid() = user_id
  );

CREATE POLICY "Users can read own usage_logs" ON usage_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Messages: users can only access their own chat's messages
CREATE POLICY "Users can read own messages" ON "Message_v2"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat WHERE chat.id = "Message_v2"."chatId" AND chat.user_id = auth.uid()
    )
  );

-- Documents: users can only access their own
CREATE POLICY "Users can read own documents" ON "Document"
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own documents" ON "Document"
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

4. **Middleware Protection** (Server-side):
```typescript
// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()
  
  // Check if route is admin-only
  if (req.nextUrl.pathname.startsWith('/admin')) {
    const userRole = session?.user?.user_metadata?.role
    
    if (userRole !== 'admin') {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }
  
  return NextResponse.next()
}
```

5. **Client-side Guards** (UI):
```typescript
// components/auth/rbac-guard.tsx
'use client'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'

export function AdminOnly({ children }: { children: React.ReactNode }) {
  const user = useSupabaseUser()
  const isAdmin = user?.user_metadata?.role === 'admin'
  
  if (!isAdmin) return null
  return <>{children}</>
}
```

#### D. Indexes to Create (Performance optimization)
```sql
-- Usage analytics queries
CREATE INDEX idx_usage_logs_user_timestamp ON usage_logs(user_id, request_timestamp DESC);
CREATE INDEX idx_usage_logs_agent_timestamp ON usage_logs(agent_type, request_timestamp DESC);
CREATE INDEX idx_usage_logs_date_range ON usage_logs(request_timestamp);

-- Rate limiting queries
CREATE INDEX idx_rate_limit_user_agent ON rate_limit_tracking(user_id, agent_type, period_start);

-- Chat queries
CREATE INDEX idx_chat_user_created ON chat(user_id, created_at DESC);

-- Repository lookup
CREATE INDEX idx_github_repos_user ON github_repositories(user_id, is_active);

-- User lookup (now using auth.users directly)
CREATE INDEX idx_chat_user_id ON chat(user_id);
CREATE INDEX idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX idx_github_repos_user_id ON github_repositories(user_id);
```

#### D. Initial Setup Strategy (Fresh Install)

**This is a fresh project starting from template - no existing data to migrate.**

1. **Database Creation**:
   - Run `0001_initial_schema.sql` on fresh Supabase project
   - Creates all tables with correct structure from the start
   - No User table - uses Supabase auth.users directly
   - All foreign keys point to auth.users(id) from beginning

2. **First Admin User Creation**:
   - Developer signs up via Supabase Auth
   - Manually set role='admin' in user_metadata via Supabase Dashboard
   - Or use SQL to update after signup

3. **Seed Data**:
   - Default admin_config entries created automatically
   - No user data to backfill
   - No chat history to migrate

4. **No Breaking Changes**:
   - This is initial setup, not a migration
   - All developers start with same fresh schema
   - No backwards compatibility needed

---

## PART 3: SUPABASE SETUP & MIGRATION

### Phase 1: Supabase Project Setup

#### Step 1: Create Supabase Project
- Navigate to supabase.com and create new project
- Note down project URL and anon/service keys
- Configure database password

#### Step 2: Configure Supabase Authentication
**Providers to Enable**:
- Email/Password (primary)
- Magic Link (future consideration)
- OAuth providers (future: GitHub, Google)

**Auth Settings**:
- Disable email confirmation for development (enable in production)
- Configure JWT expiry (default: 1 hour)
- Set up redirect URLs for production/staging
- **Custom Claims**: Add `role` to JWT claims for RBAC

**RLS (Row Level Security) Policies**:
- Users can only access their own data (chats, messages, documents)
- Admin users can access admin_config and all usage_logs
- Implement via Supabase RLS policies with `auth.jwt() ->> 'role'` checks

**Create First Admin User**:
1. Sign up via Supabase Auth UI or API
2. Set user metadata during signup: `{role: 'admin', isActive: true}`
3. Or update existing user via Supabase Dashboard → Authentication → Users → Edit User
4. No need for separate User table - role lives in auth.users metadata

#### Step 3: Database Setup
- Use Supabase SQL editor to create all tables
- Apply RLS policies
- Create necessary indexes
- Set up database triggers for updated_at timestamps

#### Step 4: File Storage Setup
**Create Buckets**:
1. `chat-attachments` - for message file uploads
   - Public: No
   - Allowed MIME types: images/*, application/pdf, text/*
   - Max file size: 10MB

2. `user-documents` - for artifact exports
   - Public: No
   - Max file size: 50MB

**Storage Policies**:
- Users can upload to their own folders
- Users can read their own files
- No public access by default

---

## PART 4: NEW FEATURES IMPLEMENTATION PLAN

### Feature Set 1: Admin Page

#### **Tab 1: Routing Agent Google Configuration**

**Purpose**: Configure the main routing agent (Google-based) that directs requests to specialized agents

**UI Components**:
1. **System Prompt Editor**
   - Rich text area (CodeMirror) with markdown support
   - Default prompt provided, customizable
   - Preview panel showing rendered prompt
   - Save/Reset buttons

2. **Rate Limit Configuration**
   - Toggle: Per Hour / Per Day
   - Number input for limit value
   - Visual indicator of current usage vs. limit

3. **Model Provider Selection**
   - Dropdown: Google (default), OpenAI (future), Anthropic (future)
   - Disabled options shown with "Coming Soon" badge

4. **Model Selection**
   - Dropdown populated based on selected provider
   - For Google: Gemini 2.0 Flash (default), Gemini 2.5 Flash, Gemini 2.5 Pro

5. **Agent Routing Configuration**
   - Table showing available agents:
     - Chat Agent
     - Document Agent
     - Python Code Agent
     - Mermaid Agent
     - Git MCP Agent
   - Each row shows: Agent Name, Current Model, Status (Active/Inactive)

**Functionality**:
- Form validation before save
- Real-time preview of changes
- Audit log of configuration changes
- Revert to previous configuration option

**Database Interaction**:
- Reads from `admin_config` WHERE config_key = 'routing_agent_google'
- Updates as JSON: `{systemPrompt, rateLimitType, rateLimitValue, modelProvider, modelName, agentRouting}`

---

#### **Tab 2: Google Chat Agent Configuration**

**Purpose**: Configure the main conversational agent with multimodal capabilities

**UI Components**:
1. **System Prompt Editor** (same as Tab 1)

2. **Rate Limit Configuration** (same as Tab 1)

3. **Capabilities Section**
   - Checkbox: Image Generation (Imagen integration)
   - Checkbox: Extended Thinking (reasoning mode)
   - Checkbox: File Input (accept file uploads)
   - Each with info tooltip explaining feature

4. **Tools Configuration**
   - Checkbox: Google Search (grounding with search)
   - Checkbox: URL Context (fetch and analyze web pages)
   - Each tool with configuration button (e.g., search depth, URL whitelist)

5. **Model Selection**
   - Multi-select dropdown (user can enable multiple models)
   - Options: Gemini 2.0 Flash, Gemini 2.5 Flash, Gemini 2.5 Pro
   - Default model indicator
   - Model capability indicators (context window, tokens/sec)

**Advanced Settings** (collapsible):
- Temperature slider (0.0 - 2.0)
- Top-K, Top-P parameters
- Max output tokens
- Safety settings configuration

**Functionality**:
- Test Configuration button (sends test prompt to verify setup)
- Model comparison view
- Cost estimation calculator

**Database Interaction**:
- Reads from `admin_config` WHERE config_key = 'chat_agent_google'
- Updates as JSON: `{systemPrompt, rateLimit, capabilities, tools, models, advancedSettings}`

---

#### **Tab 3: Google Document Agent Configuration**

**Purpose**: Configure the specialized agent for text document creation and editing

**UI Components**:
1. **System Prompt Editor** (same as Tab 1)

2. **Rate Limit Configuration** (same as Tab 1)

3. **Available Tools** (Checkbox list with status)
   - ✅ Create Document (Text)
   - ✅ Update Document (Text)

4. **Document Templates** (Future feature)
   - Predefined templates for common document types
   - Custom template creator

5. **Model Selection**
   - Dropdown: Gemini 2.0 Flash, Gemini 2.5 Flash, Gemini 2.5 Pro
   - Default model indicator

**Functionality**:
- Preview document generation
- Template management
- Test document creation

**Database Interaction**:
- Reads from `admin_config` WHERE config_key = 'document_agent_google'
- Updates as JSON: `{systemPrompt, rateLimit, enabledTools, models, defaultModel}`

---

#### **Tab 4: Google Python Code Agent Configuration**

**Purpose**: Configure the specialized agent for Python code generation with browser execution

**UI Components**:
1. **System Prompt Editor** (same as Tab 1)

2. **Rate Limit Configuration** (same as Tab 1)

3. **Available Tools** (Checkbox list with status)
   - ✅ Create Python Code File (Browser executable)
   - ✅ Update Python Code File

4. **Code Execution Settings**
   - Checkbox: Enable browser-based Python execution
   - Execution timeout (seconds)
   - Allowed libraries (multi-select):
     - numpy
     - pandas
     - matplotlib
     - requests
     - (Add custom libraries)

5. **Model Selection**
   - Dropdown: Gemini 2.0 Flash, Gemini 2.5 Flash, Gemini 2.5 Pro
   - Default model indicator

**Functionality**:
- Test code generation
- Preview code execution
- Manage allowed libraries

**Database Interaction**:
- Reads from `admin_config` WHERE config_key = 'python_code_agent_google'
- Updates as JSON: `{systemPrompt, rateLimit, enabledTools, codeExecutionSettings, models, defaultModel}`

---

#### **Tab 5: Google Mermaid Agent Configuration**

**Purpose**: Configure the specialized agent for Mermaid diagram creation

**UI Components**:
1. **System Prompt Editor** (same as Tab 1)

2. **Rate Limit Configuration** (same as Tab 1)

3. **Available Tools** (Checkbox list with status)
   - ✅ Create Mermaid Diagram
   - ✅ Update Mermaid Diagram
   - ✅ Fix Mermaid Diagram (auto-correction)

4. **Supported Diagram Types** (Info display)
   - Flowchart
   - Sequence Diagram
   - Class Diagram
   - ER Diagram
   - Gantt Chart
   - State Diagram
   - Pie Chart

5. **Model Selection**
   - Dropdown: Gemini 2.0 Flash, Gemini 2.5 Flash, Gemini 2.5 Pro
   - Default model indicator

**Functionality**:
- Preview diagram generation
- Test diagram creation
- Diagram syntax validation

**Database Interaction**:
- Reads from `admin_config` WHERE config_key = 'mermaid_agent_google'
- Updates as JSON: `{systemPrompt, rateLimit, enabledTools, models, defaultModel}`

---

#### **Tab 6: Google Git MCP Agent Configuration**

**Purpose**: Configure the agent that integrates with GitHub repositories via MCP

**UI Components**:
1. **System Prompt Editor** (same as Tab 1)

2. **Rate Limit Configuration** (same as Tab 1)

3. **MCP Server Configuration**
   - MCP Server URL input
   - Connection test button
   - Status indicator (Connected/Disconnected)

4. **Available MCP Tools** (Dynamic list from MCP server)
   - Auto-populated from connected MCP server
   - Enable/disable individual tools
   - Tool descriptions and parameters

5. **Repository Permissions**
   - Checkbox: Allow read operations
   - Checkbox: Allow write operations (commits, PRs)
   - Whitelist/blacklist file patterns

**Functionality**:
- Test MCP connection
- Refresh available tools
- Security audit log for Git operations

**Database Interaction**:
- Reads from `admin_config` WHERE config_key = 'git_mcp_agent_google'
- Updates as JSON: `{systemPrompt, rateLimit, mcpServerUrl, enabledTools, permissions}`

---

### Feature Set 2: Usage Page

**Purpose**: Provide comprehensive analytics and cost tracking for administrators and users

**UI Layout**: Dashboard-style with cards and charts

#### **Component 1: Date Range Selector**
- Preset ranges: Today, Last 7 Days, Last 30 Days, Last 90 Days, Custom
- Date picker for custom range
- Apply/Clear buttons

#### **Component 2: Summary Cards** (KPI Cards)
1. **Total API Calls Made**
   - Large number display
   - Trend indicator (↑↓ vs. previous period)
   - Breakdown by agent type (pie chart)

2. **Total Tokens Consumed**
   - Input Tokens (with cost)
   - Output Tokens (with cost)
   - Combined total
   - Visual split (stacked bar)

3. **Total Cost**
   - Input Cost
   - Output Cost
   - Total Cost (prominent)
   - Currency indicator (USD)

#### **Component 3: Usage Charts**
1. **Timeline Chart**
   - Line chart showing usage over selected period
   - Multiple series: API calls, tokens, cost
   - Toggle switches to show/hide series
   - Hover tooltips with exact values

2. **Agent Distribution**
   - Pie/donut chart showing usage by agent type
   - Routing Agent, Chat Agent, Artifact Agent, Git MCP Agent
   - Click to filter table below

3. **Model Usage**
   - Bar chart showing tokens by model
   - Gemini 2.0 Flash, Gemini 2.5 Flash, Gemini 2.5 Pro
   - Cost per model

#### **Component 4: Detailed Usage Table**
**Columns**:
- Timestamp
- User (email/name)
- Agent Type
- Model Used
- Input Tokens
- Output Tokens
- Total Tokens
- Input Cost
- Output Cost
- Total Cost
- Duration (ms)
- Status (Success/Error)

**Features**:
- Sortable columns
- Filterable (by agent, model, user, status)
- Pagination
- Export to CSV
- Row expansion for metadata/details

#### **Component 5: Cost Projection**
- Based on current usage trends
- Estimated cost for next 7/30/90 days
- Budget alert configuration

**Functionality**:
- Real-time updates (with manual refresh button)
- Export reports (PDF/CSV)
- Share dashboard view (URL with filters)

**Database Queries**:
- Main data from `usage_logs` table
- Aggregations by date range, agent, model, user
- Optimized with database indexes

---

### Feature Set 3: Settings Page

**Purpose**: User-specific configuration for API keys and preferences

**UI Layout**: Form-based with sections

#### **Section 1: API Keys Management** (localStorage)

**Google API Key**
- Label: "Google AI API Key"
- Input: Password field (hidden by default)
- Show/Hide toggle button
- Test Connection button (client-side API call to Google AI)
- Status indicator: Valid ✅ / Invalid ❌ / Not Set ⚠️
- Help text: "Required for Gemini models. Get your key from Google AI Studio."
- Link to Google AI Studio
- **Security Warning**: "Your API key is stored locally in your browser and never sent to our servers."

**GitHub Personal Access Token (PAT)**
- Label: "GitHub Personal Access Token"
- Input: Password field (hidden by default)
- Show/Hide toggle button
- Test Connection button (client-side API call to GitHub)
- Status indicator: Valid ✅ / Invalid ❌ / Not Set ⚠️
- Help text: "Required for Git MCP Agent. Token needs repo read/write permissions."
- Link to GitHub token creation page
- **Security Warning**: "Your token is stored locally in your browser and never sent to our servers."

**Security Notes**:
- ✅ Keys stored in browser localStorage only
- ✅ Never sent to backend servers
- ⚠️ Users responsible for key security
- ⚠️ Keys cleared on logout
- ⚠️ Warn users about browser security (don't use on shared computers)

**localStorage Structure**:
```javascript
{
  "apiKeys": {
    "google": "AIza...",
    "github": "ghp_..."
  },
  "lastValidated": {
    "google": "2025-01-15T10:30:00Z",
    "github": "2025-01-15T10:35:00Z"
  }
}
```

#### **Section 2: User Preferences** (Future)
- Default chat model selection
- Theme preference (light/dark/system)
- Language preference
- Notification settings
- Export data option

**Functionality**:
- Validate API keys on blur (client-side test API calls)
- localStorage CRUD operations (client-side only)
- Clear keys on logout
- Auto-clear after inactivity (optional)

**No Backend Required**:
- ❌ No `/api/settings/api-keys` routes
- ❌ No encryption utilities
- ❌ No database storage
- ✅ Pure client-side implementation

---

### Feature Set 4: User Input UI Enhancements

**Purpose**: Improve user experience with repository selection and model controls

#### **Enhancement 1: Git Repository Selector**

**Location**: Above or beside the message input area (context bar)

**UI Components**:
1. **Repository Dropdown**
   - Icon: GitHub logo
   - Placeholder: "Select a repository"
   - Dropdown list of user's connected repos
   - Search/filter repos
   - "Connect New Repo" button at bottom

2. **Repository Info Display** (when selected)
   - Repo name and owner
   - Default branch indicator
   - Last accessed time
   - "Change" or "Clear" button

3. **Connect New Repository Modal**
   - Input: GitHub repo URL
   - Validate and fetch repo info
   - Confirm connection
   - Auto-populate `github_repositories` table

**Functionality**:
- Persist selected repo in session/cookie
- Auto-suggest repos based on recent usage
- Show repo status (accessible/error)
- Context sent to Git MCP Agent with each message

**Database Interaction**:
- Fetch from `github_repositories` WHERE user_id = current_user AND is_active = true
- Update last_accessed on selection

---

#### **Enhancement 2: Thinking Model Toggle**

**Location**: In model selector dropdown or as separate toggle

**UI Components**:
1. **Toggle Switch**
   - Label: "Extended Thinking"
   - Tooltip: "Enable advanced reasoning for complex problems (uses more tokens)"
   - Icon: Brain/Thinking indicator

2. **Visual Indicator** (when enabled)
   - Badge on model selector: "Thinking Mode"
   - Different color scheme
   - Token cost multiplier shown

**Functionality**:
- When enabled, use reasoning model (with extracted thinking)
- Show thinking process in collapsible section of message
- Disable artifact tools in thinking mode (reasoning-only)
- Persist preference per chat or globally

**Backend Integration**:
- Route to appropriate model based on toggle
- Track usage separately in `usage_logs` with agent_type = 'reasoning'

---

## PART 5: IMPLEMENTATION STEPS

### Phase 1: Database & Supabase Setup (Week 1)

**Step 1.1**: Create Supabase project and configure
- [x] Create new Supabase project
- [x] Note credentials (URL, anon key, service key)
- [x] Configure authentication providers

**Step 1.2**: Create database schema
- [x] Write SQL migration file for all new tables (`0001_initial_schema.sql`)
- [x] Apply indexes (included in migration)
- [x] Set up RLS policies (included in migration)
- [x] Create database functions/triggers (`auth.user_role()` helper)
- [x] Add seed data (6 agent configs)
- [ ] **TODO**: Apply migration to Supabase (`pnpm db:migrate`)

**Step 1.3**: Set up file storage
- [ ] Create buckets
- [ ] Configure storage policies
- [ ] Test upload/download

**Step 1.4**: Update environment variables
- [x] Add NEXT_PUBLIC_SUPABASE_URL (already in .env.local)
- [x] Add NEXT_PUBLIC_SUPABASE_ANON_KEY (already in .env.local)
- [x] Add SUPABASE_SERVICE_ROLE_KEY (already in .env.local)
- [x] Add POSTGRES_URL for Drizzle (already in .env.local)
- [x] Add NEXT_PUBLIC_SITE_URL (already in .env.local)
- [x] Update .env.example with new Supabase structure
- [ ] **TODO**: Clean up .env.local (remove commented lines)
- [ ] **TODO**: Remove AUTH_SECRET from code (will do in Phase 3)
- [ ] **TODO**: Remove AI_GATEWAY, BLOB, REDIS references from code

---

### Phase 2: Initial Database Setup (Week 1)

**Step 2.1**: Install Supabase client
- [ ] Install @supabase/supabase-js
- [ ] Install @supabase/auth-helpers-nextjs
- [ ] Create Supabase client utility files (server & client)

**Step 2.2**: Update Drizzle configuration
- [ ] Configure Drizzle for Supabase Postgres connection
- [ ] Update drizzle.config.ts with Supabase connection string
- [ ] Verify connection works

**Step 2.3**: Run initial schema creation
- [ ] Apply `0001_initial_schema.sql` to Supabase
- [ ] Verify all tables created
- [ ] Verify RLS policies active
- [ ] Verify indexes created
- [ ] Check seed data (admin_config)

**Step 2.4**: Update schema.ts for new structure
- [ ] Remove old User table definition
- [ ] Update all FKs to reference auth.users(id)
- [ ] Add new table definitions (admin_config, usage_logs, etc.)
- [ ] Update TypeScript types

---

### Phase 3: Authentication Migration (Week 2)

**Step 3.1**: Remove NextAuth and install Supabase Auth
- [ ] Uninstall next-auth package
- [ ] Remove app/(auth)/auth.ts and auth.config.ts
- [ ] Install @supabase/auth-helpers-nextjs
- [ ] Create Supabase auth client utilities

**Step 3.2**: Implement Supabase Auth flows
- [ ] Create login page with Supabase Auth
- [ ] Create register page with Supabase Auth
- [ ] Implement logout functionality
- [ ] Add role to user metadata during registration
- [ ] Remove guest user functionality (not needed with Supabase)

**Step 3.3**: Implement RBAC middleware
- [ ] Create middleware.ts for Supabase auth
- [ ] Check user session with getSession()
- [ ] Extract role from user metadata
- [ ] Protect /admin/* routes (redirect if not admin)
- [ ] Update all auth checks across routes
- [ ] Test protected routes

**Step 3.4**: Create first admin user
- [ ] Sign up via Supabase Auth UI or API
- [ ] Set user_metadata: `{role: 'admin', isActive: true}` during signup
- [ ] Or update via Supabase Dashboard → Auth → Users
- [ ] Verify role appears in JWT token
- [ ] Test admin access to /admin routes
- [ ] Verify RLS policies work correctly

---

### Phase 4: File Storage Migration (Week 2)

**Step 4.1**: Replace Vercel Blob with Supabase Storage
- [ ] Update file upload utilities
- [ ] Implement Supabase Storage upload/download
- [ ] Handle presigned URLs for private files

**Step 4.2**: Update file references
- [ ] Update message attachment handling
- [ ] Update artifact export functionality
- [ ] Test file operations

---

### Phase 5: Admin Page Implementation (Week 3-4)

**Step 5.1**: Create admin route structure
- [ ] Create app/(admin) directory
- [ ] Set up layout with RBAC check (redirect non-admins)
- [ ] Create admin navigation
- [ ] Add "Admin" badge/indicator in UI for admin users
- [ ] Test access control (non-admin should be redirected)

**Step 5.2**: Implement Routing Agent Google Tab
- [ ] Create routing-agent-google configuration form
- [ ] Implement system prompt editor
- [ ] Add rate limit controls
- [ ] Add model selection dropdown
- [ ] Wire up to admin_config table
- [ ] Test save/load functionality

**Step 5.3**: Implement Chat Agent Tab
- [ ] Create chat-agent configuration form
- [ ] Add capabilities toggles
- [ ] Add tools configuration
- [ ] Add model multi-select
- [ ] Implement advanced settings
- [ ] Test configuration

**Step 5.4**: Implement Document Agent Tab
- [ ] Create document-agent configuration form
- [ ] Add tool checkboxes (create, update)
- [ ] Add model selection
- [ ] Wire up to backend

**Step 5.5**: Implement Python Code Agent Tab
- [ ] Create python-code-agent configuration form
- [ ] Add tool checkboxes (create, update code)
- [ ] Add code execution settings
- [ ] Add allowed libraries management
- [ ] Add model selection
- [ ] Wire up to backend

**Step 5.6**: Implement Mermaid Agent Tab
- [ ] Create mermaid-agent configuration form
- [ ] Add tool checkboxes (create, update, fix diagrams)
- [ ] Add model selection
- [ ] Wire up to backend

**Step 5.7**: Implement Git MCP Agent Tab
- [ ] Create git-mcp-agent configuration form
- [ ] Add MCP server connection UI
- [ ] Add tool list (dynamic)
- [ ] Add permission controls
- [ ] Add model selection

**Step 5.8**: Admin dashboard
- [ ] Create admin overview/dashboard
- [ ] Add quick stats
- [ ] Add recent activity log

---

### Phase 6: Usage Page Implementation (Week 4-5)

**Step 6.1**: Create usage page structure
- [ ] Create app/(admin)/usage or app/usage route
- [ ] Set up page layout

**Step 6.2**: Implement date range selector
- [ ] Create date picker component
- [ ] Add preset ranges
- [ ] Wire up to state management

**Step 6.3**: Implement summary cards
- [ ] Create KPI card component
- [ ] Fetch and display total API calls
- [ ] Fetch and display token consumption
- [ ] Fetch and display costs
- [ ] Add trend indicators

**Step 6.4**: Implement charts
- [ ] Install charting library (recharts/chart.js)
- [ ] Create timeline chart component
- [ ] Create agent distribution chart
- [ ] Create model usage chart
- [ ] Wire up to usage_logs data

**Step 6.5**: Implement detailed table
- [ ] Create data table component
- [ ] Add sorting functionality
- [ ] Add filtering
- [ ] Add pagination
- [ ] Add export to CSV

**Step 6.6**: Implement cost projection
- [ ] Calculate usage trends
- [ ] Display projections
- [ ] Add budget alerts

---

### Phase 7: Settings Page Implementation (Week 5)

**Step 7.1**: Create settings page structure
- [ ] Create app/settings route
- [ ] Set up page layout with sections

**Step 7.2**: Implement API key management (localStorage)
- [ ] Create API key input component
- [ ] Add show/hide toggle
- [ ] Implement localStorage save/load/delete
- [ ] Add security warnings
- [ ] Show "stored locally" badges

**Step 7.3**: Implement client-side validation
- [ ] Create test connection function for Google AI API
- [ ] Create test connection function for GitHub API
- [ ] Update status indicators based on test results
- [ ] Store last validated timestamp

**Step 7.4**: Implement key lifecycle
- [ ] Clear keys on logout
- [ ] Warn before clearing keys
- [ ] Export/import keys functionality (optional)
- [ ] Test localStorage persistence

---

### Phase 8: User Input UI Enhancements (Week 6)

**Step 8.1**: Implement Git repository selector
- [ ] Create repository dropdown component
- [ ] Fetch user's GitHub repos
- [ ] Add connect new repo modal
- [ ] Implement repo selection persistence
- [ ] Wire up to Git MCP Agent context

**Step 8.2**: Implement thinking model toggle
- [ ] Create toggle component
- [ ] Add to model selector area
- [ ] Update routing logic to use reasoning model
- [ ] Show thinking process in messages
- [ ] Test token usage tracking

---

### Phase 9: Backend AI Integration (Week 6-7)

**Step 9.1**: Update AI provider configuration
- [ ] Support dynamic model selection from admin config
- [ ] Read system prompts from admin_config
- [ ] Implement rate limiting based on admin config

**Step 9.2**: Implement usage logging
- [ ] Add usage logging middleware
- [ ] Log all API calls to usage_logs table
- [ ] Track tokens and costs
- [ ] Add error logging

**Step 9.3**: Implement rate limiting
- [ ] Create rate limit checking function
- [ ] Check against rate_limit_tracking table
- [ ] Update counts on each request
- [ ] Return appropriate errors when limit exceeded

**Step 9.4**: Integrate user API keys (client-side)
- [ ] Read Google API key from localStorage on client
- [ ] Pass user's key to Google AI API calls (client-side)
- [ ] Read GitHub PAT from localStorage
- [ ] Pass GitHub PAT to GitHub API calls (client-side)
- [ ] Handle missing key scenarios (show setup prompt)
- [ ] Never send user keys to backend

---

### Phase 10: Testing & Optimization (Week 7-8)

**Step 10.1**: Unit testing
- [ ] Test database queries
- [ ] Test authentication flows
- [ ] Test API routes
- [ ] Test utility functions

**Step 10.2**: Integration testing
- [ ] Test admin page workflows
- [ ] Test usage page data accuracy
- [ ] Test settings page functionality
- [ ] Test user input enhancements

**Step 10.3**: Performance optimization
- [ ] Optimize database queries
- [ ] Add caching where appropriate
- [ ] Optimize chart rendering
- [ ] Test with large datasets

**Step 10.4**: Security audit
- [ ] Review RLS policies (especially admin access)
- [ ] Test RBAC - verify non-admins cannot access /admin
- [ ] Test role tampering (client can't fake admin role)
- [ ] Verify auth.uid() used correctly in all queries
- [ ] Test localStorage security (keys not accessible cross-domain)
- [ ] Verify API keys never sent to backend
- [ ] Test rate limiting
- [ ] Test foreign key cascade deletes (when user deleted)
- [ ] Verify admin user creation process

---

### Phase 11: Documentation & Deployment (Week 8)

**Step 11.1**: Update documentation
- [ ] Update README with Supabase setup
- [ ] Document new features
- [ ] Create admin guide
- [ ] Create user guide

**Step 11.2**: Environment setup guide
- [ ] Document environment variables
- [ ] Create setup scripts
- [ ] Document database migrations

**Step 11.3**: Deployment
- [ ] Deploy to staging
- [ ] Run migration scripts
- [ ] Test all features
- [ ] Deploy to production

---

## PART 6: DETAILED TECHNICAL SPECIFICATIONS

### Database Connection Configuration

**Supabase Connection String Format**:
```
postgresql://postgres:[PASSWORD]@[PROJECT_REF].supabase.co:5432/postgres
```

**Environment Variables** (Simplified):
```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[SERVICE_KEY]

# For direct Postgres connection (Drizzle)
POSTGRES_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres

# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Removed (No longer needed):
# ❌ AUTH_SECRET (using Supabase Auth)
# ❌ AI_GATEWAY_API_KEY (direct API calls)
# ❌ ENCRYPTION_KEY (localStorage, not encrypted)
# ❌ REDIS_URL (not using resumable streams)
# ❌ BLOB_READ_WRITE_TOKEN (using Supabase Storage)
```

### API Routes to Create

1. **Admin Config Routes**
   - GET `/api/admin/config/[configKey]` - Get configuration
   - PUT `/api/admin/config/[configKey]` - Update configuration
   - GET `/api/admin/config` - Get all configurations

2. **Usage Routes**
   - GET `/api/usage?from=X&to=Y&agent=Z` - Get usage data
   - GET `/api/usage/summary` - Get summary statistics
   - GET `/api/usage/export` - Export usage data

3. **Settings Routes** (No API key routes needed - localStorage only)
   - ❌ No API key endpoints (client-side localStorage)
   - Future: User preferences endpoints if needed

4. **Repository Routes**
   - GET `/api/repositories` - Get user's connected repos
   - POST `/api/repositories` - Connect new repository
   - DELETE `/api/repositories/[id]` - Disconnect repository

### File Structure Changes

```
app/
├── (admin)/                    # NEW
│   ├── layout.tsx             # Admin layout with auth check
│   ├── page.tsx               # Admin dashboard
│   ├── routing-agent/         # Tab 1
│   │   └── page.tsx
│   ├── chat-agent/            # Tab 2
│   │   └── page.tsx
│   ├── document-agent/        # Tab 3
│   │   └── page.tsx
│   ├── python-code-agent/     # Tab 4
│   │   └── page.tsx
│   ├── mermaid-agent/         # Tab 5
│   │   └── page.tsx
│   └── git-mcp-agent/         # Tab 6
│       └── page.tsx
├── (usage)/                    # NEW
│   └── page.tsx               # Usage analytics page
├── (settings)/                 # NEW
│   └── page.tsx               # Settings page
├── api/
│   ├── admin/                 # NEW
│   │   └── config/
│   │       └── [...]/route.ts
│   ├── usage/                 # NEW
│   │   └── route.ts
│   └── repositories/          # NEW
│       └── route.ts
lib/
├── db/
│   ├── supabase-client.ts    # NEW - Supabase client
│   └── supabase-queries.ts   # NEW - Supabase queries
├── auth/
│   ├── client.ts             # NEW - Supabase auth client
│   └── rbac.ts               # NEW - RBAC utilities
├── storage/
│   └── api-keys.ts           # NEW - localStorage API key management
├── ai/
│   ├── config-loader.ts      # NEW - Load config from DB
│   └── rate-limiter.ts       # NEW - Rate limiting logic
components/
├── admin/                     # NEW - Admin components
│   ├── config-form.tsx
│   ├── system-prompt-editor.tsx
│   └── rate-limit-control.tsx
├── usage/                     # NEW - Usage components
│   ├── date-range-selector.tsx
│   ├── usage-chart.tsx
│   └── usage-table.tsx
├── settings/                  # NEW - Settings components
│   └── api-key-input.tsx
└── auth/                      # NEW - Auth components
    ├── login-form.tsx
    ├── register-form.tsx
    └── rbac-guard.tsx         # Wrapper for admin-only components
```

---

## PART 7: RISK MITIGATION

### Potential Issues & Solutions

1. **Initial Setup Errors**
   - **Risk**: Developers may struggle with initial Supabase setup
   - **Mitigation**: 
     - Comprehensive setup documentation in README
     - Single migration file (0001_initial_schema.sql) - easy to apply
     - Clear error messages and troubleshooting guide
     - Migration README with verification steps

2. **Authentication Conflicts**
   - **Risk**: User sessions broken during auth migration
   - **Mitigation**:
     - Clean break from NextAuth to Supabase Auth
     - All users must re-register (acceptable for new feature set)
     - Migrate user data by email matching
     - Provide clear migration instructions

3. **API Key Security (localStorage)**
   - **Risk**: User API keys stored in browser localStorage vulnerable
   - **Mitigation**:
     - Clear security warnings in UI
     - Auto-clear on logout
     - Warn against using on shared computers
     - Consider optional session-only storage
     - Keys never transmitted to backend (client-side API calls only)
     - XSS protection via React (no dangerouslySetInnerHTML)

4. **Admin Access Control**
   - **Risk**: Non-admins accessing admin routes
   - **Mitigation**:
     - Multi-layer RBAC: RLS policies + middleware + UI guards
     - Server-side role verification on all admin API endpoints
     - Admin role stored in Supabase Auth user metadata (tamper-proof)
     - Audit log for all admin actions

5. **Rate Limiting Bypass**
   - **Risk**: Users could bypass rate limits
   - **Mitigation**:
     - Implement server-side checks only
     - Use database transactions for count updates
     - Add multiple fallback checks
     - Monitor for suspicious patterns

6. **Performance Degradation**
   - **Risk**: New usage tracking could slow down responses
   - **Mitigation**:
     - Use async logging (after request completion)
     - Implement database indexes
     - Use connection pooling
     - Cache frequently accessed configs

---

## PART 8: SUCCESS METRICS

### Metrics to Track Post-Implementation

1. **Technical Metrics**
   - Database query response times (< 100ms for 95th percentile)
   - API endpoint response times
   - Error rates (< 0.1%)
   - Uptime (> 99.9%)

2. **Usage Metrics**
   - Daily active users
   - API calls per user
   - Token consumption trends
   - Cost per user

3. **Feature Adoption**
   - % of users who configured API keys
   - % of users who connected GitHub repos
   - % of users using thinking model
   - Admin configuration changes per week

4. **User Satisfaction**
   - Error rate in chat interactions
   - Average session duration
   - Feature usage patterns

---

## PART 9: FUTURE ENHANCEMENTS

### Post-MVP Features (Not in current scope)

1. **Multi-Provider Support**
   - OpenAI integration
   - Anthropic integration
   - Provider switching per chat

2. **Advanced Analytics**
   - User cohort analysis
   - A/B testing framework
   - Predictive cost modeling

3. **Team/Organization Features**
   - Multi-user workspaces
   - Shared repositories
   - Team usage quotas

4. **Enhanced Artifacts**
   - More artifact types (React components, HTML/CSS)
   - Real-time collaboration
   - Version control for artifacts

5. **Git MCP Enhancements**
   - Pull request creation
   - Code review assistance
   - Automated testing integration

---

## SUMMARY

This development plan provides a comprehensive roadmap for:
1. ✅ Migrating from Vercel Postgres to Supabase (DB + Auth + Storage)
2. ✅ Implementing RBAC with admin-only access to admin pages
3. ✅ Implementing Admin configuration pages for 6 specialized agents (routing, chat, document, python_code, mermaid, git_mcp)
4. ✅ Building Usage analytics and tracking
5. ✅ Creating Settings page with localStorage API key management
6. ✅ Enhancing User Input UI with Git repo selector and thinking toggle

**Architecture Decisions**:
- ✅ Supabase Auth (replacing NextAuth)
- ✅ localStorage for API keys (no database storage)
- ✅ RBAC with role in Supabase Auth user metadata
- ✅ Direct Google AI API calls (no AI Gateway)
- ✅ No Redis, no Vercel Blob (Supabase equivalents)

**Estimated Timeline**: 6-7 weeks for full implementation and testing (simplified from 8 weeks - no data migration needed)
**Team Size**: 2-3 developers recommended
**Complexity**: Medium to High (due to data migration and new feature development)

The plan is designed to be executed in phases with minimal disruption to existing functionality, maintaining backward compatibility throughout the migration process.

## KEY CHANGES FROM ORIGINAL PLAN

1. **Removed `user_api_keys` table** - API keys stored in browser localStorage
2. **Removed custom `User` table** - Using Supabase `auth.users` directly with metadata
3. **Added RBAC** - Role-based access control with admin role in Supabase Auth metadata
4. **Simplified environment** - Removed AUTH_SECRET, AI_GATEWAY_API_KEY, ENCRYPTION_KEY, REDIS_URL, BLOB_READ_WRITE_TOKEN
5. **Admin protection** - Multi-layer access control (RLS + middleware + UI guards)
6. **Security model** - User-managed API keys (client-side only, never sent to backend)
7. **FK Structure** - All user references now point to `auth.users(id)` via `auth.uid()`
