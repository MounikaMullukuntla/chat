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