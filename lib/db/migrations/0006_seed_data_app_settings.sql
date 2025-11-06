-- =====================================================
-- App Settings Seed Data
-- File: 0006_seed_data_app_settings.sql
-- Description: Inserts app configuration and model pricing data
-- =====================================================

-- App settings configuration
INSERT INTO admin_config (config_key, config_data) VALUES
('app_settings', '{
  "activeProvider": "google",
  "availableProviders": ["google", "openai", "anthropic"]
}'::jsonb),

-- Model configurations with pricing
('model_config_google', '{
  "models": [
    {
      "id": "gemini-2.0-flash",
      "name": "Gemini 2.0 Flash",
      "description": "Fast, efficient model for most tasks",
      "pricingPerMillionTokens": {
        "input": 0.075,
        "output": 0.30
      },
      "enabled": true
    },
    {
      "id": "gemini-2.5-flash",
      "name": "Gemini 2.5 Flash", 
      "description": "Enhanced flash model with better performance",
      "pricingPerMillionTokens": {
        "input": 0.075,
        "output": 0.30
      },
      "enabled": true
    },
    {
      "id": "gemini-2.5-pro",
      "name": "Gemini 2.5 Pro",
      "description": "Most capable model for complex tasks",
      "pricingPerMillionTokens": {
        "input": 1.25,
        "output": 5.00
      },
      "enabled": true
    },
    {
      "id": "gemma-3",
      "name": "Gemma 3",
      "description": "Open source model for basic tasks",
      "pricingPerMillionTokens": {
        "input": 0.05,
        "output": 0.20
      },
      "enabled": false
    }
  ]
}'::jsonb),

('model_config_openai', '{
  "models": [
    {
      "id": "gpt-4o",
      "name": "GPT-4o",
      "description": "Most capable GPT-4 model",
      "pricingPerMillionTokens": {
        "input": 2.50,
        "output": 10.00
      },
      "enabled": true
    },
    {
      "id": "gpt-4o-mini",
      "name": "GPT-4o Mini",
      "description": "Faster, more affordable GPT-4",
      "pricingPerMillionTokens": {
        "input": 0.15,
        "output": 0.60
      },
      "enabled": true
    },
    {
      "id": "gpt-4-turbo",
      "name": "GPT-4 Turbo",
      "description": "Previous generation GPT-4",
      "pricingPerMillionTokens": {
        "input": 10.00,
        "output": 30.00
      },
      "enabled": false
    }
  ]
}'::jsonb),

('model_config_anthropic', '{
  "models": [
    {
      "id": "claude-3-5-sonnet-20241022",
      "name": "Claude 3.5 Sonnet",
      "description": "Most capable Claude model",
      "pricingPerMillionTokens": {
        "input": 3.00,
        "output": 15.00
      },
      "enabled": true
    },
    {
      "id": "claude-3-5-haiku-20241022",
      "name": "Claude 3.5 Haiku",
      "description": "Fast and efficient Claude model",
      "pricingPerMillionTokens": {
        "input": 0.25,
        "output": 1.25
      },
      "enabled": true
    },
    {
      "id": "claude-3-opus-20240229",
      "name": "Claude 3 Opus",
      "description": "Previous generation flagship model",
      "pricingPerMillionTokens": {
        "input": 15.00,
        "output": 75.00
      },
      "enabled": false
    }
  ]
}'::jsonb)

ON CONFLICT (config_key) DO NOTHING;