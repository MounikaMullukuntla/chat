-- =====================================================
-- Database Triggers
-- File: 0004_triggers.sql
-- Description: Creates all database triggers for referential integrity
-- =====================================================

-- Note: Foreign keys to auth.users cannot be created in Supabase (cross-schema restriction)
-- We use triggers to enforce CASCADE DELETE and validate user_id

-- CASCADE DELETE trigger on auth.users
-- This will automatically clean up user data when user is deleted
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_deletion();

-- Validation triggers - ensure user_id exists before INSERT/UPDATE
DROP TRIGGER IF EXISTS validate_chat_user_id ON "Chat";
CREATE TRIGGER validate_chat_user_id
  BEFORE INSERT OR UPDATE ON "Chat"
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_user_id();

DROP TRIGGER IF EXISTS validate_document_user_id ON "Document";
CREATE TRIGGER validate_document_user_id
  BEFORE INSERT OR UPDATE ON "Document"
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_user_id();

DROP TRIGGER IF EXISTS validate_suggestion_user_id ON "Suggestion";
CREATE TRIGGER validate_suggestion_user_id
  BEFORE INSERT OR UPDATE ON "Suggestion"
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_user_id();

DROP TRIGGER IF EXISTS validate_usage_logs_user_id ON usage_logs;
CREATE TRIGGER validate_usage_logs_user_id
  BEFORE INSERT OR UPDATE ON usage_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_user_id();

DROP TRIGGER IF EXISTS validate_rate_limit_user_id ON rate_limit_tracking;
CREATE TRIGGER validate_rate_limit_user_id
  BEFORE INSERT OR UPDATE ON rate_limit_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_user_id();

DROP TRIGGER IF EXISTS validate_github_repos_user_id ON github_repositories;
CREATE TRIGGER validate_github_repos_user_id
  BEFORE INSERT OR UPDATE ON github_repositories
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_user_id();

-- Add a trigger to automatically update the updated_at timestamp for admin_config
DROP TRIGGER IF EXISTS trigger_admin_config_updated_at ON admin_config;
CREATE TRIGGER trigger_admin_config_updated_at
    BEFORE UPDATE ON admin_config
    FOR EACH ROW
    EXECUTE FUNCTION update_admin_config_timestamp();

-- Add a trigger to validate admin config JSON structure
DROP TRIGGER IF EXISTS trigger_validate_admin_config ON admin_config;
CREATE TRIGGER trigger_validate_admin_config
    BEFORE INSERT OR UPDATE ON admin_config
    FOR EACH ROW
    EXECUTE FUNCTION validate_admin_config_data();

-- Add a trigger to automatically update the updated_at timestamp for model_config
DROP TRIGGER IF EXISTS trigger_model_config_updated_at ON model_config;
CREATE TRIGGER trigger_model_config_updated_at
    BEFORE UPDATE ON model_config
    FOR EACH ROW
    EXECUTE FUNCTION update_model_config_timestamp();

-- Add a trigger to ensure only one default model per provider
DROP TRIGGER IF EXISTS trigger_ensure_single_default_model ON model_config;
CREATE TRIGGER trigger_ensure_single_default_model
    BEFORE INSERT OR UPDATE ON model_config
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_default_model_per_provider();