-- =====================================================
-- Database Indexes
-- File: 0003_indexes.sql
-- Description: Creates all database indexes for performance optimization
-- =====================================================

-- Chat indexes
CREATE INDEX IF NOT EXISTS idx_chat_user_id ON "Chat"(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_user_created ON "Chat"(user_id, "createdAt" DESC);

-- Message indexes
CREATE INDEX IF NOT EXISTS idx_message_chat ON "Message_v2"("chatId", "createdAt" ASC);

-- Document indexes
CREATE INDEX IF NOT EXISTS idx_document_user_id ON "Document"(user_id);
CREATE INDEX IF NOT EXISTS idx_document_user ON "Document"(user_id, "createdAt" DESC);

-- Version control indexes for enhanced Document table
CREATE INDEX IF NOT EXISTS idx_document_versions ON "Document"(id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_document_chat ON "Document"(chat_id, "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_document_parent ON "Document"(parent_version_id);
CREATE INDEX IF NOT EXISTS idx_document_kind ON "Document"(kind, "createdAt" DESC);

-- Suggestion indexes
CREATE INDEX IF NOT EXISTS idx_suggestion_user_id ON "Suggestion"(user_id);

-- Usage logs indexes
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_timestamp ON usage_logs(user_id, request_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_agent_timestamp ON usage_logs(agent_type, request_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_date_range ON usage_logs(request_timestamp);

-- Rate limit indexes
CREATE INDEX IF NOT EXISTS idx_rate_limit_user_id ON rate_limit_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_user_agent ON rate_limit_tracking(user_id, agent_type, period_start);

-- GitHub repositories indexes
CREATE INDEX IF NOT EXISTS idx_github_repos_user_id ON github_repositories(user_id);
CREATE INDEX IF NOT EXISTS idx_github_repos_user ON github_repositories(user_id, is_active);

-- Error logs indexes
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_category ON error_logs(error_category);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_created ON error_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_type_severity ON error_logs(error_type, severity);

-- Admin config indexes
CREATE INDEX IF NOT EXISTS idx_admin_config_key ON admin_config(config_key);

-- Model config indexes
CREATE INDEX IF NOT EXISTS idx_model_config_model_id ON model_config(model_id);
CREATE INDEX IF NOT EXISTS idx_model_config_provider ON model_config(provider);
CREATE INDEX IF NOT EXISTS idx_model_config_provider_active ON model_config(provider, is_active);
CREATE INDEX IF NOT EXISTS idx_model_config_provider_default ON model_config(provider, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_model_config_active ON model_config(is_active) WHERE is_active = true;

-- Additional indexes for better usage analytics performance
-- Index for usage analytics by model and provider
CREATE INDEX IF NOT EXISTS idx_usage_logs_model_provider 
ON usage_logs(model_used, provider, request_timestamp DESC);

-- Index for usage analytics by date and agent type (for charts)
CREATE INDEX IF NOT EXISTS idx_usage_logs_date_agent 
ON usage_logs(DATE(request_timestamp), agent_type);

-- Index for cost calculations
CREATE INDEX IF NOT EXISTS idx_usage_logs_cost_date 
ON usage_logs(request_timestamp DESC, total_cost) 
WHERE total_cost IS NOT NULL;

-- Index for admin config lookups (should be fast already due to unique constraint)
CREATE INDEX IF NOT EXISTS idx_admin_config_updated 
ON admin_config(updated_at DESC);

-- Index for GitHub repositories by user and activity
CREATE INDEX IF NOT EXISTS idx_github_repos_user_active 
ON github_repositories(user_id, is_active, last_accessed DESC);

-- Add a composite index for rate limiting queries
CREATE INDEX IF NOT EXISTS idx_rate_limit_user_agent_period 
ON rate_limit_tracking(user_id, agent_type, period_start DESC, period_end DESC);

-- Add index for error logs by type and severity for admin monitoring
CREATE INDEX IF NOT EXISTS idx_error_logs_type_severity_admin 
ON error_logs(error_type, severity, created_at DESC);

-- Add index for error logs by user for user-specific error tracking
CREATE INDEX IF NOT EXISTS idx_error_logs_user_date 
ON error_logs(user_id, created_at DESC) 
WHERE user_id IS NOT NULL;