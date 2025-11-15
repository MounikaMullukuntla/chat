# Error Handling and Logging Implementation - Final Tasks

## Project: Code-Chatbot Application
## Date: November 14, 2025
## Version: 1.0 - IMPLEMENTATION READY

---

## CRITICAL QUESTIONS BEFORE IMPLEMENTATION

Please answer these questions to finalize the implementation approach:

### 1. Database Strategy
**Q1.1:** Do you want user activity logs and agent activity logs in separate tables or combined?
- **Option A (RECOMMENDED):** Separate tables (`user_activity_logs`, `agent_activity_logs`)
  - Pros: Better performance, easier queries, clear separation of concerns
  - Cons: More tables to manage
- **Option B:** Combined table with discriminator column
  - Pros: Single table, simpler schema
  - Cons: Mixed data types, harder to optimize

**Q1.2:** What is your log retention policy?
- How long should we keep error logs? (Recommendation: 90 days)
- How long should we keep user activity logs? (Recommendation: 30 days)
- How long should we keep agent activity logs? (Recommendation: 7 days for detailed, 90 days for summary)

**Q1.3:** Do you want automatic log archiving/purging?
- Should we create a scheduled job to archive old logs?
- Should we auto-delete logs after retention period?

### 2. Toggle Controls
**Q2.1:** Granularity of logging controls - which level do you prefer?
- **Option A (RECOMMENDED):** Category-level toggles
  - Global: `user_activity_logging_enabled` (true/false)
  - Global: `agent_activity_logging_enabled` (true/false)
  - Per-category: `log_auth_events`, `log_chat_events`, `log_admin_events`, etc.
- **Option B:** File-level toggles (too granular, not recommended)
- **Option C:** Simple global toggle (too coarse, not recommended)

**Q2.2:** Should logging toggles be:
- Stored in `admin_config` table? (Current approach)
- Stored in new `logging_config` table? (Dedicated table)
- Environment variables? (Less flexible)

### 3. Performance & Sampling
**Q3.1:** For high-frequency events (chat messages, AI requests), should we:
- **Option A (RECOMMENDED):** Log every event (with async batching)
- **Option B:** Sample logging (e.g., log 1 in every 10 events)
- **Option C:** Only log on errors

**Q3.2:** Should we batch log writes?
- **Recommended:** Yes - batch every 5 seconds or 100 logs, whichever comes first
- Alternative: Write immediately (simpler but slower)

### 4. Correlation IDs
**Q4.1:** How should we generate correlation IDs?
- **Option A (RECOMMENDED):** UUID v4 for each request
- **Option B:** Timestamp + user_id hash
- **Option C:** Sequential number per session

**Q4.2:** Where should correlation ID be stored?
- HTTP headers (X-Correlation-ID)
- Request context
- Both

### 5. Privacy & Compliance
**Q5.1:** Email hashing for user activity logs:
- **Recommended:** Use SHA-256 with salt
- Alternative: Store user_id only (no email)

**Q5.2:** Should we log IP addresses?
- Yes, but anonymize (e.g., 192.168.1.xxx)
- Yes, full IP address
- No, don't log IP addresses

**Q5.3:** Do you need GDPR compliance features?
- User data export endpoint
- User data deletion endpoint
- Data anonymization after X days

---

## IMPLEMENTATION PLAN

## PHASE 1: DATABASE SCHEMA (MIGRATIONS)

### 1.1 New Migration File: `0007_activity_logging_tables.sql`

**ASSUMING ANSWERS:**
- Q1.1: Option A (Separate tables)
- Q2.1: Option A (Category-level toggles)
- Q3.1: Option A (Log every event)
- Q4.1: Option A (UUID v4)

```sql
-- =====================================================
-- Activity Logging Tables
-- File: 0007_activity_logging_tables.sql
-- Description: Creates tables for user and agent activity logging
-- =====================================================

-- User Activity Logs - Tracks user actions throughout the application
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    correlation_id UUID NOT NULL,
    activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN (
        'auth_login', 'auth_logout', 'auth_register',
        'chat_create', 'chat_view', 'chat_delete', 'chat_message_send',
        'document_create', 'document_view', 'document_update', 'document_delete',
        'admin_config_update', 'admin_dashboard_view',
        'vote_message', 'suggestion_view',
        'file_upload', 'artifact_create', 'artifact_execute'
    )),
    activity_category VARCHAR(50) NOT NULL CHECK (activity_category IN (
        'authentication', 'chat', 'document', 'admin', 'vote', 'file', 'artifact'
    )),
    activity_metadata JSONB DEFAULT '{}',
    resource_id UUID,           -- ID of the resource being acted upon (chat_id, document_id, etc.)
    resource_type VARCHAR(50),  -- Type of resource (chat, document, message, etc.)
    ip_address VARCHAR(45),     -- Anonymized if privacy settings require
    user_agent TEXT,
    request_path VARCHAR(500),
    request_method VARCHAR(10),
    session_id VARCHAR(100),
    success BOOLEAN DEFAULT true,
    error_message TEXT,         -- If success=false, why did it fail?
    created_at TIMESTAMP DEFAULT NOW()
);

-- Agent Activity Logs - Tracks AI agent operations and performance
CREATE TABLE IF NOT EXISTS agent_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,                       -- NULL for system operations
    correlation_id UUID NOT NULL,
    agent_type VARCHAR(50) NOT NULL CHECK (agent_type IN (
        'chat_model_agent', 'provider_tools_agent', 'document_agent',
        'python_agent', 'mermaid_agent', 'git_mcp_agent'
    )),
    operation_type VARCHAR(50) NOT NULL CHECK (operation_type IN (
        'initialization', 'tool_invocation', 'code_generation',
        'document_generation', 'diagram_generation', 'code_execution',
        'search', 'url_fetch', 'mcp_operation', 'streaming'
    )),
    operation_category VARCHAR(50) NOT NULL CHECK (operation_category IN (
        'generation', 'execution', 'tool_use', 'streaming', 'configuration'
    )),
    operation_metadata JSONB DEFAULT '{}',
    resource_id UUID,                   -- Document, code, diagram ID
    resource_type VARCHAR(50),          -- document, code, diagram, etc.

    -- Performance Metrics
    duration_ms INTEGER,                -- Operation duration in milliseconds
    start_time TIMESTAMP,
    end_time TIMESTAMP,

    -- AI Model Metrics
    model_id VARCHAR(100),
    provider VARCHAR(50),
    thinking_mode BOOLEAN DEFAULT false,
    input_tokens INTEGER,
    output_tokens INTEGER,
    reasoning_tokens INTEGER,
    total_tokens INTEGER,
    input_cost DECIMAL(10, 6),
    output_cost DECIMAL(10, 6),
    total_cost DECIMAL(10, 6),

    -- Execution Details
    success BOOLEAN DEFAULT true,
    error_type VARCHAR(100),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Tool-specific metrics (stored in metadata)
    -- Example metadata structure:
    -- {
    --   "tool_calls": 3,
    --   "mcp_session_id": "uuid",
    --   "code_lines": 50,
    --   "diagram_nodes": 10,
    --   "file_size_bytes": 1024,
    --   "chunk_count": 5
    -- }

    created_at TIMESTAMP DEFAULT NOW()
);

-- Logging Configuration - Admin toggles for logging control
-- Store in admin_config table with specific key
INSERT INTO admin_config (config_key, config_data) VALUES
('logging_settings', '{
  "error_logging_enabled": true,
  "user_activity_logging_enabled": true,
  "agent_activity_logging_enabled": true,
  "log_retention_days": {
    "error_logs": 90,
    "user_activity_logs": 30,
    "agent_activity_logs": 7
  },
  "category_toggles": {
    "log_auth_events": true,
    "log_chat_events": true,
    "log_document_events": true,
    "log_admin_events": true,
    "log_vote_events": true,
    "log_file_events": true,
    "log_artifact_events": true,
    "log_ai_operations": true,
    "log_tool_invocations": true,
    "log_code_execution": true
  },
  "performance_settings": {
    "batch_writes": true,
    "batch_size": 100,
    "batch_interval_ms": 5000,
    "async_logging": true,
    "sampling_enabled": false,
    "sampling_rate": 1.0
  },
  "privacy_settings": {
    "anonymize_ip": true,
    "hash_email": true,
    "log_user_agent": true,
    "exclude_sensitive_paths": ["/api/auth/callback"]
  }
}'::jsonb)
ON CONFLICT (config_key) DO UPDATE SET config_data = EXCLUDED.config_data;

-- Add comments
COMMENT ON TABLE user_activity_logs IS 'Tracks all user actions and interactions with the application';
COMMENT ON TABLE agent_activity_logs IS 'Tracks AI agent operations, performance metrics, and resource usage';

COMMENT ON COLUMN user_activity_logs.correlation_id IS 'UUID linking related logs across user and agent activities';
COMMENT ON COLUMN user_activity_logs.activity_metadata IS 'JSON containing activity-specific details (file size, chat model, etc.)';
COMMENT ON COLUMN user_activity_logs.ip_address IS 'User IP address (anonymized based on privacy settings)';

COMMENT ON COLUMN agent_activity_logs.correlation_id IS 'UUID linking this agent operation to user activity';
COMMENT ON COLUMN agent_activity_logs.duration_ms IS 'Total operation duration in milliseconds';
COMMENT ON COLUMN agent_activity_logs.operation_metadata IS 'JSON containing operation-specific metrics and details';
COMMENT ON COLUMN agent_activity_logs.reasoning_tokens IS 'Tokens used for extended thinking (if thinking mode enabled)';
```

### 1.2 New Migration File: `0008_activity_logging_indexes.sql`

```sql
-- =====================================================
-- Activity Logging Indexes
-- File: 0008_activity_logging_indexes.sql
-- Description: Creates indexes for activity logging tables
-- =====================================================

-- User Activity Logs Indexes
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_correlation ON user_activity_logs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_type ON user_activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_category ON user_activity_logs(activity_category);
CREATE INDEX IF NOT EXISTS idx_user_activity_created ON user_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_created ON user_activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_resource ON user_activity_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_success ON user_activity_logs(success, created_at DESC);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_user_activity_user_type_date
ON user_activity_logs(user_id, activity_type, created_at DESC);

-- Agent Activity Logs Indexes
CREATE INDEX IF NOT EXISTS idx_agent_activity_user_id ON agent_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_activity_correlation ON agent_activity_logs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_agent_activity_agent_type ON agent_activity_logs(agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_activity_operation ON agent_activity_logs(operation_type);
CREATE INDEX IF NOT EXISTS idx_agent_activity_category ON agent_activity_logs(operation_category);
CREATE INDEX IF NOT EXISTS idx_agent_activity_created ON agent_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_activity_model ON agent_activity_logs(model_id, provider);
CREATE INDEX IF NOT EXISTS idx_agent_activity_success ON agent_activity_logs(success, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_activity_resource ON agent_activity_logs(resource_type, resource_id);

-- Performance analysis indexes
CREATE INDEX IF NOT EXISTS idx_agent_activity_duration
ON agent_activity_logs(agent_type, duration_ms)
WHERE duration_ms IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agent_activity_cost
ON agent_activity_logs(created_at DESC, total_cost)
WHERE total_cost IS NOT NULL;

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_agent_activity_agent_op_date
ON agent_activity_logs(agent_type, operation_type, created_at DESC);
```

### 1.3 New Migration File: `0009_activity_logging_rls.sql`

```sql
-- =====================================================
-- Activity Logging RLS Policies
-- File: 0009_activity_logging_rls.sql
-- Description: Creates RLS policies for activity logging tables
-- =====================================================

-- Enable RLS
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_activity_logs ENABLE ROW LEVEL SECURITY;

-- User Activity Logs Policies
DROP POLICY IF EXISTS "Users can read own activity logs" ON user_activity_logs;
CREATE POLICY "Users can read own activity logs" ON user_activity_logs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all activity logs" ON user_activity_logs;
CREATE POLICY "Admins can read all activity logs" ON user_activity_logs
  FOR SELECT USING (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "System can insert activity logs" ON user_activity_logs;
CREATE POLICY "System can insert activity logs" ON user_activity_logs
  FOR INSERT WITH CHECK (true);

-- Agent Activity Logs Policies
DROP POLICY IF EXISTS "Users can read own agent logs" ON agent_activity_logs;
CREATE POLICY "Users can read own agent logs" ON agent_activity_logs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all agent logs" ON agent_activity_logs;
CREATE POLICY "Admins can read all agent logs" ON agent_activity_logs
  FOR SELECT USING (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "System can insert agent logs" ON agent_activity_logs;
CREATE POLICY "System can insert agent logs" ON agent_activity_logs
  FOR INSERT WITH CHECK (true);

-- Grant permissions
GRANT ALL ON user_activity_logs TO anon;
GRANT ALL ON user_activity_logs TO authenticated;
GRANT ALL ON user_activity_logs TO service_role;

GRANT ALL ON agent_activity_logs TO anon;
GRANT ALL ON agent_activity_logs TO authenticated;
GRANT ALL ON agent_activity_logs TO service_role;
```

### 1.4 New Migration File: `0010_activity_logging_functions.sql`

```sql
-- =====================================================
-- Activity Logging Functions
-- File: 0010_activity_logging_functions.sql
-- Description: Helper functions for activity logging
-- =====================================================

-- Function to get logging configuration
CREATE OR REPLACE FUNCTION public.get_logging_config()
RETURNS JSONB AS $$
DECLARE
  config JSONB;
BEGIN
  SELECT config_data INTO config
  FROM admin_config
  WHERE config_key = 'logging_settings';

  RETURN COALESCE(config, '{
    "error_logging_enabled": true,
    "user_activity_logging_enabled": false,
    "agent_activity_logging_enabled": false
  }'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if user activity logging is enabled
CREATE OR REPLACE FUNCTION public.is_user_activity_logging_enabled()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    (SELECT config_data->>'user_activity_logging_enabled' = 'true'
     FROM admin_config
     WHERE config_key = 'logging_settings'),
    false
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if agent activity logging is enabled
CREATE OR REPLACE FUNCTION public.is_agent_activity_logging_enabled()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    (SELECT config_data->>'agent_activity_logging_enabled' = 'true'
     FROM admin_config
     WHERE config_key = 'logging_settings'),
    false
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to purge old logs based on retention policy
CREATE OR REPLACE FUNCTION public.purge_old_activity_logs()
RETURNS TABLE (
  user_logs_deleted BIGINT,
  agent_logs_deleted BIGINT,
  error_logs_deleted BIGINT
) AS $$
DECLARE
  config JSONB;
  user_retention_days INTEGER;
  agent_retention_days INTEGER;
  error_retention_days INTEGER;
  user_deleted BIGINT;
  agent_deleted BIGINT;
  error_deleted BIGINT;
BEGIN
  -- Get retention configuration
  SELECT config_data INTO config
  FROM admin_config
  WHERE config_key = 'logging_settings';

  user_retention_days := COALESCE((config->'log_retention_days'->>'user_activity_logs')::INTEGER, 30);
  agent_retention_days := COALESCE((config->'log_retention_days'->>'agent_activity_logs')::INTEGER, 7);
  error_retention_days := COALESCE((config->'log_retention_days'->>'error_logs')::INTEGER, 90);

  -- Delete old user activity logs
  WITH deleted_user AS (
    DELETE FROM user_activity_logs
    WHERE created_at < NOW() - INTERVAL '1 day' * user_retention_days
    RETURNING *
  )
  SELECT COUNT(*) INTO user_deleted FROM deleted_user;

  -- Delete old agent activity logs
  WITH deleted_agent AS (
    DELETE FROM agent_activity_logs
    WHERE created_at < NOW() - INTERVAL '1 day' * agent_retention_days
    RETURNING *
  )
  SELECT COUNT(*) INTO agent_deleted FROM deleted_agent;

  -- Delete old error logs (resolved ones only)
  WITH deleted_error AS (
    DELETE FROM error_logs
    WHERE created_at < NOW() - INTERVAL '1 day' * error_retention_days
    AND resolved = true
    RETURNING *
  )
  SELECT COUNT(*) INTO error_deleted FROM deleted_error;

  RETURN QUERY SELECT user_deleted, agent_deleted, error_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_logging_config() TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_activity_logging_enabled() TO authenticated;
GRANT EXECUTE ON FUNCTION is_agent_activity_logging_enabled() TO authenticated;
GRANT EXECUTE ON FUNCTION purge_old_activity_logs() TO service_role; -- Admin only
```

---

## PHASE 2: CENTRALIZED LOGGING LIBRARY

### 2.1 Create `lib/logging/activity-logger.ts`

**Purpose:** Centralized library for logging user and agent activities

**Location:** `lib/logging/activity-logger.ts`

**Implementation:**
```typescript
/**
 * Activity Logging System
 *
 * Centralized logging for user activities and agent operations
 * with toggle control, batching, and privacy compliance
 */

import { v4 as uuidv4 } from 'uuid';

// Activity Types
export enum UserActivityType {
  AUTH_LOGIN = 'auth_login',
  AUTH_LOGOUT = 'auth_logout',
  AUTH_REGISTER = 'auth_register',
  CHAT_CREATE = 'chat_create',
  CHAT_VIEW = 'chat_view',
  CHAT_DELETE = 'chat_delete',
  CHAT_MESSAGE_SEND = 'chat_message_send',
  DOCUMENT_CREATE = 'document_create',
  DOCUMENT_VIEW = 'document_view',
  DOCUMENT_UPDATE = 'document_update',
  DOCUMENT_DELETE = 'document_delete',
  ADMIN_CONFIG_UPDATE = 'admin_config_update',
  ADMIN_DASHBOARD_VIEW = 'admin_dashboard_view',
  VOTE_MESSAGE = 'vote_message',
  SUGGESTION_VIEW = 'suggestion_view',
  FILE_UPLOAD = 'file_upload',
  ARTIFACT_CREATE = 'artifact_create',
  ARTIFACT_EXECUTE = 'artifact_execute',
}

export enum ActivityCategory {
  AUTHENTICATION = 'authentication',
  CHAT = 'chat',
  DOCUMENT = 'document',
  ADMIN = 'admin',
  VOTE = 'vote',
  FILE = 'file',
  ARTIFACT = 'artifact',
}

export enum AgentType {
  CHAT_MODEL_AGENT = 'chat_model_agent',
  PROVIDER_TOOLS_AGENT = 'provider_tools_agent',
  DOCUMENT_AGENT = 'document_agent',
  PYTHON_AGENT = 'python_agent',
  MERMAID_AGENT = 'mermaid_agent',
  GIT_MCP_AGENT = 'git_mcp_agent',
}

export enum AgentOperationType {
  INITIALIZATION = 'initialization',
  TOOL_INVOCATION = 'tool_invocation',
  CODE_GENERATION = 'code_generation',
  DOCUMENT_GENERATION = 'document_generation',
  DIAGRAM_GENERATION = 'diagram_generation',
  CODE_EXECUTION = 'code_execution',
  SEARCH = 'search',
  URL_FETCH = 'url_fetch',
  MCP_OPERATION = 'mcp_operation',
  STREAMING = 'streaming',
}

export enum AgentOperationCategory {
  GENERATION = 'generation',
  EXECUTION = 'execution',
  TOOL_USE = 'tool_use',
  STREAMING = 'streaming',
  CONFIGURATION = 'configuration',
}

// Interfaces
export interface UserActivityLog {
  user_id: string;
  correlation_id?: string;
  activity_type: UserActivityType;
  activity_category: ActivityCategory;
  activity_metadata?: Record<string, any>;
  resource_id?: string;
  resource_type?: string;
  ip_address?: string;
  user_agent?: string;
  request_path?: string;
  request_method?: string;
  session_id?: string;
  success?: boolean;
  error_message?: string;
}

export interface AgentActivityLog {
  user_id?: string;
  correlation_id: string;
  agent_type: AgentType;
  operation_type: AgentOperationType;
  operation_category: AgentOperationCategory;
  operation_metadata?: Record<string, any>;
  resource_id?: string;
  resource_type?: string;

  // Performance
  duration_ms?: number;
  start_time?: Date;
  end_time?: Date;

  // AI Model metrics
  model_id?: string;
  provider?: string;
  thinking_mode?: boolean;
  input_tokens?: number;
  output_tokens?: number;
  reasoning_tokens?: number;
  total_tokens?: number;
  input_cost?: number;
  output_cost?: number;
  total_cost?: number;

  // Execution
  success?: boolean;
  error_type?: string;
  error_message?: string;
  retry_count?: number;
}

// Logging configuration cache
let loggingConfig: any = null;
let configLastFetched: number = 0;
const CONFIG_CACHE_TTL = 60000; // 1 minute

// Batch queue for async logging
let userActivityBatch: UserActivityLog[] = [];
let agentActivityBatch: AgentActivityLog[] = [];
let batchTimer: NodeJS.Timeout | null = null;

/**
 * Get logging configuration with caching
 */
async function getLoggingConfig(): Promise<any> {
  const now = Date.now();

  // Return cached config if fresh
  if (loggingConfig && (now - configLastFetched) < CONFIG_CACHE_TTL) {
    return loggingConfig;
  }

  try {
    // Fetch from database
    const { createBrowserClient } = await import('@supabase/ssr');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createBrowserClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabase
      .from('admin_config')
      .select('config_data')
      .eq('config_key', 'logging_settings')
      .single();

    if (!error && data) {
      loggingConfig = data.config_data;
      configLastFetched = now;
      return loggingConfig;
    }
  } catch (err) {
    console.error('Failed to fetch logging config:', err);
  }

  // Fallback config
  return {
    user_activity_logging_enabled: false,
    agent_activity_logging_enabled: false,
  };
}

/**
 * Check if user activity logging is enabled
 */
export async function isUserActivityLoggingEnabled(): Promise<boolean> {
  const config = await getLoggingConfig();
  return config.user_activity_logging_enabled === true;
}

/**
 * Check if agent activity logging is enabled
 */
export async function isAgentActivityLoggingEnabled(): Promise<boolean> {
  const config = await getLoggingConfig();
  return config.agent_activity_logging_enabled === true;
}

/**
 * Flush batch to database
 */
async function flushBatch() {
  if (userActivityBatch.length === 0 && agentActivityBatch.length === 0) {
    return;
  }

  try {
    const { createBrowserClient } = await import('@supabase/ssr');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createBrowserClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // Insert user activity logs
    if (userActivityBatch.length > 0) {
      const { error } = await supabase
        .from('user_activity_logs')
        .insert(userActivityBatch);

      if (error) {
        console.error('Failed to insert user activity logs:', error);
      } else {
        userActivityBatch = [];
      }
    }

    // Insert agent activity logs
    if (agentActivityBatch.length > 0) {
      const { error } = await supabase
        .from('agent_activity_logs')
        .insert(agentActivityBatch);

      if (error) {
        console.error('Failed to insert agent activity logs:', error);
      } else {
        agentActivityBatch = [];
      }
    }
  } catch (err) {
    console.error('Failed to flush activity log batch:', err);
  }
}

/**
 * Schedule batch flush
 */
function scheduleBatchFlush() {
  if (batchTimer) {
    return; // Already scheduled
  }

  batchTimer = setTimeout(async () => {
    await flushBatch();
    batchTimer = null;
  }, 5000); // Flush every 5 seconds
}

/**
 * Log user activity
 */
export async function logUserActivity(log: UserActivityLog): Promise<void> {
  try {
    // Check if logging is enabled
    if (!(await isUserActivityLoggingEnabled())) {
      return;
    }

    // Generate correlation ID if not provided
    if (!log.correlation_id) {
      log.correlation_id = uuidv4();
    }

    // Get config for batch settings
    const config = await getLoggingConfig();
    const batchEnabled = config.performance_settings?.batch_writes !== false;

    if (batchEnabled) {
      // Add to batch
      userActivityBatch.push(log);

      // Flush if batch is full
      if (userActivityBatch.length >= (config.performance_settings?.batch_size || 100)) {
        await flushBatch();
      } else {
        scheduleBatchFlush();
      }
    } else {
      // Write immediately
      const { createBrowserClient } = await import('@supabase/ssr');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      const supabase = createBrowserClient(supabaseUrl, serviceRoleKey);
      await supabase.from('user_activity_logs').insert(log);
    }
  } catch (err) {
    console.error('Failed to log user activity:', err);
  }
}

/**
 * Log agent activity
 */
export async function logAgentActivity(log: AgentActivityLog): Promise<void> {
  try {
    // Check if logging is enabled
    if (!(await isAgentActivityLoggingEnabled())) {
      return;
    }

    // Get config for batch settings
    const config = await getLoggingConfig();
    const batchEnabled = config.performance_settings?.batch_writes !== false;

    if (batchEnabled) {
      // Add to batch
      agentActivityBatch.push(log);

      // Flush if batch is full
      if (agentActivityBatch.length >= (config.performance_settings?.batch_size || 100)) {
        await flushBatch();
      } else {
        scheduleBatchFlush();
      }
    } else {
      // Write immediately
      const { createBrowserClient } = await import('@supabase/ssr');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      const supabase = createBrowserClient(supabaseUrl, serviceRoleKey);
      await supabase.from('agent_activity_logs').insert(log);
    }
  } catch (err) {
    console.error('Failed to log agent activity:', err);
  }
}

/**
 * Performance tracking helper
 */
export class PerformanceTracker {
  private startTime: number;
  private log: Partial<AgentActivityLog>;

  constructor(log: Partial<AgentActivityLog>) {
    this.startTime = Date.now();
    this.log = {
      ...log,
      start_time: new Date(),
      correlation_id: log.correlation_id || uuidv4(),
    };
  }

  async end(additionalData?: Partial<AgentActivityLog>): Promise<void> {
    const endTime = Date.now();
    const duration_ms = endTime - this.startTime;

    await logAgentActivity({
      ...this.log,
      ...additionalData,
      duration_ms,
      end_time: new Date(),
    } as AgentActivityLog);
  }

  getCorrelationId(): string {
    return this.log.correlation_id!;
  }
}

// Export utility to create correlation ID
export function createCorrelationId(): string {
  return uuidv4();
}
```

### 2.2 Create `lib/logging/index.ts`

```typescript
/**
 * Logging System Exports
 */

export {
  ActivityCategory,
  AgentOperationCategory,
  AgentOperationType,
  AgentType,
  createCorrelationId,
  isAgentActivityLoggingEnabled,
  isUserActivityLoggingEnabled,
  logAgentActivity,
  logUserActivity,
  PerformanceTracker,
  UserActivityType,
  type AgentActivityLog,
  type UserActivityLog,
} from './activity-logger';

// Re-export error logging
export * from '../errors/logger';
```

---

## PHASE 3: FILE MODIFICATIONS

### 3.1 High-Priority API Routes (17 files to modify)

#### File: `app/api/admin/models/route.ts`

**Tasks:**
1. Import logging utilities
2. Add performance tracking for GET requests
3. Log admin viewing models list
4. Log provider filter usage

**Code changes:**
```typescript
import { logUserActivity, logAgentActivity, UserActivityType, ActivityCategory } from '@/lib/logging';

// In GET handler - AFTER successful response
await logUserActivity({
  user_id: user.id,
  activity_type: UserActivityType.ADMIN_DASHBOARD_VIEW,
  activity_category: ActivityCategory.ADMIN,
  activity_metadata: {
    action: 'view_models',
    provider_filter: provider || 'all',
    model_count: models.length
  },
  request_path: request.url,
  request_method: 'GET'
});

// Add performance tracking
const startTime = Date.now();
// ... existing query logic
const duration = Date.now() - startTime;

await logAgentActivity({
  correlation_id: createCorrelationId(),
  agent_type: AgentType.CHAT_MODEL_AGENT, // or SYSTEM if more appropriate
  operation_type: AgentOperationType.CONFIGURATION,
  operation_category: AgentOperationCategory.CONFIGURATION,
  operation_metadata: {
    operation: 'list_models',
    provider_filter: provider,
    result_count: models.length
  },
  duration_ms: duration,
  success: true
});
```

#### File: `app/(chat)/api/chat/route.ts` (CRITICAL - Most Important)

**Tasks:**
1. Add comprehensive logging for POST and DELETE
2. Track file processing
3. Log AI model usage
4. Track performance metrics

**Code changes:**
```typescript
import { logUserActivity, logAgentActivity, PerformanceTracker, createCorrelationId } from '@/lib/logging';

// At the START of POST handler
const correlationId = createCorrelationId();
const requestStartTime = Date.now();

// After chat creation/retrieval
await logUserActivity({
  user_id: user.id,
  correlation_id: correlationId,
  activity_type: chat ? UserActivityType.CHAT_MESSAGE_SEND : UserActivityType.CHAT_CREATE,
  activity_category: ActivityCategory.CHAT,
  activity_metadata: {
    chat_id: id,
    model_selected: selectedChatModel,
    thinking_enabled: thinkingEnabled,
    file_count: fileParts.length,
    message_length: message.parts.reduce((sum, p) => sum + (p.type === 'text' ? p.text.length : 0), 0)
  },
  resource_id: id,
  resource_type: 'chat',
  request_path: request.url,
  request_method: 'POST',
  success: true
});

// Track AI agent performance
const agentTracker = new PerformanceTracker({
  user_id: user.id,
  correlation_id: correlationId,
  agent_type: AgentType.CHAT_MODEL_AGENT,
  operation_type: AgentOperationType.STREAMING,
  operation_category: AgentOperationCategory.STREAMING,
  model_id: selectedChatModel,
  thinking_mode: thinkingEnabled,
  resource_id: id,
  resource_type: 'chat'
});

// ... AI streaming logic

// In onFinish callback - track tokens and cost
await agentTracker.end({
  input_tokens: calculateInputTokens(),
  output_tokens: calculateOutputTokens(),
  total_cost: calculateCost(),
  success: true
});
```

**(Continue for all 67 files...)**

---

## SUMMARY OF FILES TO MODIFY

### TOTAL: 67 Files Across 11 Categories

**Category 1: API Routes** (10 files) - ADD user activity logging, ADD agent performance metrics
**Category 2: Page Components** (7 files) - ADD error boundaries, ADD page view logging
**Category 3: Server Actions** (1 file) - ADD transaction logging, ADD performance tracking
**Category 4: Artifact Components** (6 files) - ADD execution logging, ADD performance metrics
**Category 5: Admin Components** (9 files) - ADD config change logging, ADD validation
**Category 6: AI Provider Libraries** (10 files) - ADD agent operation logging, ADD performance tracking
**Category 7: Authentication Libraries** (4 files) - ADD auth event logging (NO passwords)
**Category 8: Editor Libraries** (5 files) - ADD operation logging
**Category 9: Storage Libraries** (4 files) - ADD storage operation logging (NO API keys)
**Category 10: Verification Services** (2 files) - ADD verification logging (NO tokens)
**Category 11: AI Tool Libraries** (9 files) - ADD tool execution logging, ADD metrics

---

## PHASE 4: ADMIN PANEL UI

### 4.1 Create Logging Settings Page

**File:** `app/admin/logging/page.tsx`

**Purpose:** Admin UI to toggle logging settings

**Features:**
- Toggle user activity logging
- Toggle agent activity logging
- Configure retention periods
- View logging statistics
- Manual log purge

---

## NEXT STEPS

1. **Answer Critical Questions** (above)
2. **Run Migrations** (0007-0010)
3. **Create Logging Library** (lib/logging)
4. **Modify Files in Priority Order:**
   - Phase 1: Critical routes (chat, document, history)
   - Phase 2: Admin components
   - Phase 3: AI agents
   - Phase 4: Remaining files
5. **Test Thoroughly**
6. **Deploy**

---

## EFFORT ESTIMATE

- Database migrations: 2 hours
- Logging library: 4 hours
- File modifications (67 files): 20-30 hours
- Admin UI: 4 hours
- Testing: 8 hours
- Documentation: 2 hours

**TOTAL: 40-50 hours**

Would you like me to proceed with specific file modifications after you answer the critical questions?
