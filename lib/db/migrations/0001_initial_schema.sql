-- =====================================================
-- Initial Database Schema for AI Code Chatbot
-- This creates a fresh database with all tables
-- No migration needed - fresh install
-- =====================================================

BEGIN;

-- =====================================================
-- 1. EXISTING TABLES (from template - modified for Supabase Auth)
-- =====================================================

-- Chat table (modified: user_id references auth.users)
CREATE TABLE IF NOT EXISTS "Chat" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    title TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    visibility VARCHAR(10) CHECK (visibility IN ('public', 'private')) NOT NULL DEFAULT 'private',
    "lastContext" JSONB,
    total_input_tokens INTEGER DEFAULT 0,
    total_output_tokens INTEGER DEFAULT 0,
    total_cost DECIMAL(10, 6) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Message_v2 table (with usage tracking)
CREATE TABLE IF NOT EXISTS "Message_v2" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "chatId" UUID NOT NULL REFERENCES "Chat"(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    parts JSON NOT NULL,
    attachments JSON NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    model_used VARCHAR(100),
    input_tokens INTEGER,
    output_tokens INTEGER,
    cost DECIMAL(10, 6)
);

-- Vote_v2 table
CREATE TABLE IF NOT EXISTS "Vote_v2" (
    "chatId" UUID NOT NULL REFERENCES "Chat"(id) ON DELETE CASCADE,
    "messageId" UUID NOT NULL REFERENCES "Message_v2"(id) ON DELETE CASCADE,
    "isUpvoted" BOOLEAN NOT NULL,
    PRIMARY KEY ("chatId", "messageId")
);

-- Document table (artifacts - modified for auth.users)
CREATE TABLE IF NOT EXISTS "Document" (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    title TEXT NOT NULL,
    content TEXT,
    kind VARCHAR(10) CHECK (kind IN ('text', 'code', 'image', 'sheet')) NOT NULL DEFAULT 'text',
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    PRIMARY KEY (id, "createdAt")
);

-- Suggestion table (modified for auth.users)
CREATE TABLE IF NOT EXISTS "Suggestion" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "documentId" UUID NOT NULL,
    "documentCreatedAt" TIMESTAMP NOT NULL,
    "originalText" TEXT NOT NULL,
    "suggestedText" TEXT NOT NULL,
    description TEXT,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY ("documentId", "documentCreatedAt") REFERENCES "Document"(id, "createdAt") ON DELETE CASCADE
);

-- Stream table
CREATE TABLE IF NOT EXISTS "Stream" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "chatId" UUID NOT NULL REFERENCES "Chat"(id) ON DELETE CASCADE,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 2. NEW TABLES (Admin & Analytics)
-- =====================================================

-- Admin configuration table
CREATE TABLE IF NOT EXISTS admin_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_data JSONB NOT NULL,
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Usage logs for analytics
CREATE TABLE IF NOT EXISTS usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    chat_id UUID REFERENCES "Chat"(id) ON DELETE SET NULL,
    agent_type VARCHAR(50) NOT NULL,
    model_used VARCHAR(100),
    provider VARCHAR(50),
    input_tokens INTEGER,
    output_tokens INTEGER,
    total_tokens INTEGER,
    input_cost DECIMAL(10, 6),
    output_cost DECIMAL(10, 6),
    total_cost DECIMAL(10, 6),
    request_timestamp TIMESTAMP DEFAULT NOW(),
    response_timestamp TIMESTAMP,
    duration_ms INTEGER,
    metadata JSONB
);

-- Rate limit tracking
CREATE TABLE IF NOT EXISTS rate_limit_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    agent_type VARCHAR(50) NOT NULL,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    request_count INTEGER DEFAULT 0,
    limit_type VARCHAR(20) CHECK (limit_type IN ('hourly', 'daily')) NOT NULL,
    limit_value INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- GitHub repositories
CREATE TABLE IF NOT EXISTS github_repositories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    repo_owner VARCHAR(100) NOT NULL,
    repo_name VARCHAR(100) NOT NULL,
    repo_url TEXT,
    default_branch VARCHAR(100) DEFAULT 'main',
    is_active BOOLEAN DEFAULT true,
    last_accessed TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 3. INDEXES (Performance)
-- =====================================================

-- Chat indexes
CREATE INDEX IF NOT EXISTS idx_chat_user_created ON "Chat"(user_id, "createdAt" DESC);

-- Message indexes
CREATE INDEX IF NOT EXISTS idx_message_chat ON "Message_v2"("chatId", "createdAt" ASC);

-- Usage logs indexes
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_timestamp ON usage_logs(user_id, request_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_agent_timestamp ON usage_logs(agent_type, request_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_date_range ON usage_logs(request_timestamp);

-- Rate limit indexes
CREATE INDEX IF NOT EXISTS idx_rate_limit_user_agent ON rate_limit_tracking(user_id, agent_type, period_start);

-- Repository indexes
CREATE INDEX IF NOT EXISTS idx_github_repos_user ON github_repositories(user_id, is_active);

-- Document indexes
CREATE INDEX IF NOT EXISTS idx_document_user ON "Document"(user_id, "createdAt" DESC);

-- Admin config indexes
CREATE INDEX IF NOT EXISTS idx_admin_config_key ON admin_config(config_key);

-- =====================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE "Chat" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message_v2" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Vote_v2" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Suggestion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Stream" ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE github_repositories ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role from JWT
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    auth.jwt() -> 'user_metadata' ->> 'role',
    'user'
  )::TEXT;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Chat policies
CREATE POLICY "Users can read own chats" ON "Chat"
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own chats" ON "Chat"
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chats" ON "Chat"
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own chats" ON "Chat"
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all chats" ON "Chat"
  FOR SELECT USING (auth.user_role() = 'admin');

-- Message policies
CREATE POLICY "Users can read own messages" ON "Message_v2"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Chat" WHERE "Chat".id = "Message_v2"."chatId" AND "Chat".user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in own chats" ON "Message_v2"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Chat" WHERE "Chat".id = "Message_v2"."chatId" AND "Chat".user_id = auth.uid()
    )
  );

-- Vote policies
CREATE POLICY "Users can vote on messages in own chats" ON "Vote_v2"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "Chat" WHERE "Chat".id = "Vote_v2"."chatId" AND "Chat".user_id = auth.uid()
    )
  );

-- Document policies
CREATE POLICY "Users can read own documents" ON "Document"
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own documents" ON "Document"
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents" ON "Document"
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents" ON "Document"
  FOR DELETE USING (auth.uid() = user_id);

-- Suggestion policies
CREATE POLICY "Users can read own suggestions" ON "Suggestion"
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own suggestions" ON "Suggestion"
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own suggestions" ON "Suggestion"
  FOR UPDATE USING (auth.uid() = user_id);

-- Stream policies
CREATE POLICY "Users can access streams in own chats" ON "Stream"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "Chat" WHERE "Chat".id = "Stream"."chatId" AND "Chat".user_id = auth.uid()
    )
  );

-- Admin config policies (admin-only)
CREATE POLICY "Admins can read admin config" ON admin_config
  FOR SELECT USING (auth.user_role() = 'admin');

CREATE POLICY "Admins can update admin config" ON admin_config
  FOR ALL USING (auth.user_role() = 'admin');

-- Usage logs policies
CREATE POLICY "Users can read own usage logs" ON usage_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all usage logs" ON usage_logs
  FOR SELECT USING (auth.user_role() = 'admin');

CREATE POLICY "System can create usage logs" ON usage_logs
  FOR INSERT WITH CHECK (true);

-- Rate limit policies
CREATE POLICY "Users can read own rate limits" ON rate_limit_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage rate limits" ON rate_limit_tracking
  FOR ALL USING (true);

-- GitHub repositories policies
CREATE POLICY "Users can manage own repositories" ON github_repositories
  FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- 5. SEED DATA (Default Configurations)
-- =====================================================

-- Default admin configurations
INSERT INTO admin_config (config_key, config_data) VALUES
('routing_agent_google', '{
  "systemPrompt": "You are an intelligent routing agent. Analyze user requests and route them to the appropriate specialized agent: chat_agent for conversations, document_agent for text documents, python_code_agent for Python code, mermaid_agent for diagrams, or git_mcp_agent for repository operations.",
  "rateLimitType": "hourly",
  "rateLimitValue": 100,
  "modelProvider": "google",
  "modelName": "gemini-2.0-flash"
}'::jsonb),
('chat_agent_google', '{
  "systemPrompt": "You are a helpful AI assistant powered by Google Gemini. Be concise, accurate, and friendly. Use your tools when appropriate.",
  "rateLimitType": "hourly",
  "rateLimitValue": 50,
  "capabilities": {
    "imageGeneration": false,
    "extendedThinking": true,
    "fileInput": true
  },
  "tools": {
    "googleSearch": true,
    "urlContext": true
  },
  "models": ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.5-pro"],
  "defaultModel": "gemini-2.0-flash"
}'::jsonb),
('document_agent_google', '{
  "systemPrompt": "You are a specialized agent for creating and updating text documents. Generate high-quality, well-structured documents based on user requests. Focus on clear writing, proper formatting, and comprehensive content.",
  "rateLimitType": "hourly",
  "rateLimitValue": 30,
  "enabledTools": {
    "createDocument": true,
    "updateDocument": true
  },
  "models": ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.5-pro"],
  "defaultModel": "gemini-2.0-flash"
}'::jsonb),
('python_code_agent_google', '{
  "systemPrompt": "You are a specialized Python code generation agent. Create clean, efficient, and well-documented Python code. Follow best practices and include helpful comments. Code must be browser-executable.",
  "rateLimitType": "hourly",
  "rateLimitValue": 30,
  "enabledTools": {
    "createPythonCode": true,
    "updatePythonCode": true
  },
  "codeExecutionSettings": {
    "enabled": true,
    "timeout": 30000,
    "allowedLibraries": ["numpy", "pandas", "matplotlib", "requests"]
  },
  "models": ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.5-pro"],
  "defaultModel": "gemini-2.0-flash"
}'::jsonb),
('mermaid_agent_google', '{
  "systemPrompt": "You are a specialized Mermaid diagram generation agent. Create clear, well-structured diagrams using Mermaid syntax. Support flowcharts, sequence diagrams, class diagrams, ER diagrams, and more.",
  "rateLimitType": "hourly",
  "rateLimitValue": 30,
  "enabledTools": {
    "createMermaidDiagram": true,
    "updateMermaidDiagram": true,
    "fixMermaidDiagram": true
  },
  "models": ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.5-pro"],
  "defaultModel": "gemini-2.0-flash"
}'::jsonb),
('git_mcp_agent_google', '{
  "systemPrompt": "You are a Git operations agent with access to GitHub repositories via MCP. Help users navigate, read, and understand code repositories. Be careful with write operations.",
  "rateLimitType": "hourly",
  "rateLimitValue": 20,
  "mcpServerUrl": "",
  "enabledTools": [],
  "permissions": {
    "allowRead": true,
    "allowWrite": false
  },
  "models": ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.5-pro"],
  "defaultModel": "gemini-2.0-flash"
}'::jsonb)
ON CONFLICT (config_key) DO NOTHING;

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES (Run these after migration)
-- =====================================================

-- Check all tables exist
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

-- Check RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Check policies exist
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;

-- Check indexes
-- SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename;

-- Check seed data
-- SELECT config_key FROM admin_config;
