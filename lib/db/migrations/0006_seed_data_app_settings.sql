-- =====================================================
-- App Settings Seed Data
-- File: 0006_seed_data_app_settings.sql
-- Description: Inserts app configuration and model pricing data
-- =====================================================

-- App settings configuration
-- Models are now stored in the model_config table (see 0007_seed_data_model_config.sql)
INSERT INTO admin_config (config_key, config_data) VALUES
('app_settings', '{
  "activeProvider": "google",
  "availableProviders": ["google", "openai", "anthropic"]
}'::jsonb)
ON CONFLICT (config_key) DO NOTHING;

-- Logging configuration - Controls error logging, user activity logging, and agent activity logging
INSERT INTO admin_config (config_key, config_data) VALUES
('logging_settings', '{
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
    "anonymize_ip": false,
    "hash_email": false,
    "log_user_agent": true,
    "exclude_sensitive_paths": ["/api/auth/callback"]
  }
}'::jsonb)
ON CONFLICT (config_key) DO UPDATE SET config_data = EXCLUDED.config_data;