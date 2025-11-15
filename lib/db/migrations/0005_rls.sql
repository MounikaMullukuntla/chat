-- =====================================================
-- Row Level Security (RLS) Policies
-- File: 0005_rls.sql
-- Description: Creates all RLS policies for data security
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE "Chat" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message_v2" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Vote_v2" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Suggestion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Stream" ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE github_repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Chat policies
DROP POLICY IF EXISTS "Users can read own chats" ON "Chat";
CREATE POLICY "Users can read own chats" ON "Chat"
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own chats" ON "Chat";
CREATE POLICY "Users can create own chats" ON "Chat"
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own chats" ON "Chat";
CREATE POLICY "Users can update own chats" ON "Chat"
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own chats" ON "Chat";
CREATE POLICY "Users can delete own chats" ON "Chat"
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all chats" ON "Chat";
CREATE POLICY "Admins can read all chats" ON "Chat"
  FOR SELECT USING (public.get_user_role() = 'admin');

-- Message policies
DROP POLICY IF EXISTS "Users can read own messages" ON "Message_v2";
CREATE POLICY "Users can read own messages" ON "Message_v2"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Chat" WHERE "Chat".id = "Message_v2"."chatId" AND "Chat".user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create messages in own chats" ON "Message_v2";
CREATE POLICY "Users can create messages in own chats" ON "Message_v2"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Chat" WHERE "Chat".id = "Message_v2"."chatId" AND "Chat".user_id = auth.uid()
    )
  );

-- Vote policies
DROP POLICY IF EXISTS "Users can vote on messages in own chats" ON "Vote_v2";
CREATE POLICY "Users can vote on messages in own chats" ON "Vote_v2"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "Chat" WHERE "Chat".id = "Vote_v2"."chatId" AND "Chat".user_id = auth.uid()
    )
  );

-- Document policies
DROP POLICY IF EXISTS "Users can read own documents" ON "Document";
CREATE POLICY "Users can read own documents" ON "Document"
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own documents" ON "Document";
CREATE POLICY "Users can create own documents" ON "Document"
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own documents" ON "Document";
CREATE POLICY "Users can update own documents" ON "Document"
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own documents" ON "Document";
CREATE POLICY "Users can delete own documents" ON "Document"
  FOR DELETE USING (auth.uid() = user_id);

-- Suggestion policies
DROP POLICY IF EXISTS "Users can read own suggestions" ON "Suggestion";
CREATE POLICY "Users can read own suggestions" ON "Suggestion"
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own suggestions" ON "Suggestion";
CREATE POLICY "Users can create own suggestions" ON "Suggestion"
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own suggestions" ON "Suggestion";
CREATE POLICY "Users can update own suggestions" ON "Suggestion"
  FOR UPDATE USING (auth.uid() = user_id);

-- Stream policies
DROP POLICY IF EXISTS "Users can access streams in own chats" ON "Stream";
CREATE POLICY "Users can access streams in own chats" ON "Stream"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "Chat" WHERE "Chat".id = "Stream"."chatId" AND "Chat".user_id = auth.uid()
    )
  );

-- Admin config policies (admin-only)
DROP POLICY IF EXISTS "Admins can read admin_config" ON admin_config;
CREATE POLICY "Admins can read admin_config" ON admin_config
  FOR SELECT USING (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins can update admin_config" ON admin_config;
CREATE POLICY "Admins can update admin_config" ON admin_config
  FOR ALL USING (public.get_user_role() = 'admin');

-- Model config policies (read for all authenticated, admin for write)
DROP POLICY IF EXISTS "Authenticated users can read model_config" ON model_config;
CREATE POLICY "Authenticated users can read model_config" ON model_config
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can manage model_config" ON model_config;
CREATE POLICY "Admins can manage model_config" ON model_config
  FOR ALL USING (public.get_user_role() = 'admin');

-- Usage logs policies
DROP POLICY IF EXISTS "Users can read own usage_logs" ON usage_logs;
CREATE POLICY "Users can read own usage_logs" ON usage_logs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all usage_logs" ON usage_logs;
CREATE POLICY "Admins can read all usage_logs" ON usage_logs
  FOR SELECT USING (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "System can create usage_logs" ON usage_logs;
CREATE POLICY "System can create usage_logs" ON usage_logs
  FOR INSERT WITH CHECK (true);

-- Rate limit policies
DROP POLICY IF EXISTS "Users can read own rate_limits" ON rate_limit_tracking;
CREATE POLICY "Users can read own rate_limits" ON rate_limit_tracking
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can manage rate_limits" ON rate_limit_tracking;
CREATE POLICY "System can manage rate_limits" ON rate_limit_tracking
  FOR ALL USING (true);

-- GitHub repositories policies
DROP POLICY IF EXISTS "Users can manage own repositories" ON github_repositories;
CREATE POLICY "Users can manage own repositories" ON github_repositories
  FOR ALL USING (auth.uid() = user_id);

-- Error logs policies
DROP POLICY IF EXISTS "Users can read own error_logs" ON error_logs;
CREATE POLICY "Users can read own error_logs" ON error_logs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all error_logs" ON error_logs;
CREATE POLICY "Admins can read all error_logs" ON error_logs
  FOR SELECT USING (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins can update error_logs" ON error_logs;
CREATE POLICY "Admins can update error_logs" ON error_logs
  FOR UPDATE USING (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "System can insert error_logs" ON error_logs;
CREATE POLICY "System can insert error_logs" ON error_logs
  FOR INSERT WITH CHECK (true);

-- Grant permissions to Supabase roles for error logging
GRANT ALL ON error_logs TO anon;
GRANT ALL ON error_logs TO authenticated;
GRANT ALL ON error_logs TO service_role;

-- Grant execute permissions to authenticated users for functions
GRANT EXECUTE ON FUNCTION get_current_user_usage_summary(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION is_current_user_admin() TO authenticated;

-- =====================================================
-- Activity Logging RLS Policies
-- =====================================================

-- Enable RLS on activity logging tables
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

-- Grant permissions to Supabase roles for activity logging
GRANT ALL ON user_activity_logs TO anon;
GRANT ALL ON user_activity_logs TO authenticated;
GRANT ALL ON user_activity_logs TO service_role;

GRANT ALL ON agent_activity_logs TO anon;
GRANT ALL ON agent_activity_logs TO authenticated;
GRANT ALL ON agent_activity_logs TO service_role;

-- Grant execute permissions for activity logging functions
GRANT EXECUTE ON FUNCTION get_logging_config() TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_activity_logging_enabled() TO authenticated;
GRANT EXECUTE ON FUNCTION is_agent_activity_logging_enabled() TO authenticated;
GRANT EXECUTE ON FUNCTION purge_old_activity_logs() TO service_role;