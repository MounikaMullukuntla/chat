/**
 * Test fixtures for Google AI models
 * Based on actual seed data from 0007_seed_data_model_config.sql
 */

export const googleModels = {
  gemini2Flash: {
    model_id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    description: "Fast, efficient model for most tasks",
    provider: "google",
    is_active: true,
    is_default: true,
    thinking_enabled: true,
    input_pricing_per_million_tokens: 0.075,
    output_pricing_per_million_tokens: 0.3,
    metadata: {
      contextWindow: 1048576,
      maxOutputTokens: 8192,
    },
  },
  gemini25Flash: {
    model_id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    description: "Enhanced flash model with better performance",
    provider: "google",
    is_active: true,
    is_default: false,
    thinking_enabled: true,
    input_pricing_per_million_tokens: 0.075,
    output_pricing_per_million_tokens: 0.3,
    metadata: {
      contextWindow: 1048576,
      maxOutputTokens: 8192,
    },
  },
  gemini25Pro: {
    model_id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    description: "Most capable model for complex tasks",
    provider: "google",
    is_active: true,
    is_default: false,
    thinking_enabled: true,
    input_pricing_per_million_tokens: 1.25,
    output_pricing_per_million_tokens: 5.0,
    metadata: {
      contextWindow: 2097152,
      maxOutputTokens: 8192,
    },
  },
};

/**
 * Helper to get all active Google models
 */
export const getActiveGoogleModels = () => [
  googleModels.gemini2Flash,
  googleModels.gemini25Flash,
  googleModels.gemini25Pro,
];

/**
 * Helper to get default Google model
 */
export const getDefaultGoogleModel = () => googleModels.gemini2Flash;

/**
 * Helper to get models for testing (gemini-2.5-flash and gemini-2.5-pro)
 */
export const getTestGoogleModels = () => [
  googleModels.gemini25Flash,
  googleModels.gemini25Pro,
];
