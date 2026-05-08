import type { AdminConfigSummary } from "@/lib/types";

// Hardcoded model list mirroring lib/db/migrations/0007-0008 seed data.
// Used when the Supabase admin_config / model_config tables are unreachable so the
// model dropdown and chat route can still operate without DB connectivity.
export const FALLBACK_ADMIN_CONFIG_SUMMARY: AdminConfigSummary = {
  providers: {
    google: {
      enabled: true,
      fileInputEnabled: false,
      allowedFileTypes: [],
      models: {
        "gemini-2.5-flash": {
          id: "gemini-2.5-flash",
          name: "Gemini 2.5 Flash",
          description: "Enhanced flash model with better performance",
          enabled: true,
          isDefault: true,
          supportsThinkingMode: true,
          fileInputEnabled: false,
          allowedFileTypes: [],
          pricingPerMillionTokens: { input: 0.075, output: 0.3 },
        },
        "gemini-2.5-pro": {
          id: "gemini-2.5-pro",
          name: "Gemini 2.5 Pro",
          description: "Most capable model for complex tasks",
          enabled: true,
          isDefault: false,
          supportsThinkingMode: true,
          fileInputEnabled: false,
          allowedFileTypes: [],
          pricingPerMillionTokens: { input: 1.25, output: 5.0 },
        },
        "gemini-2.0-flash": {
          id: "gemini-2.0-flash",
          name: "Gemini 2.0 Flash",
          description: "Fast, efficient model for most tasks",
          enabled: true,
          isDefault: false,
          supportsThinkingMode: true,
          fileInputEnabled: false,
          allowedFileTypes: [],
          pricingPerMillionTokens: { input: 0.075, output: 0.3 },
        },
      },
    },
    xai: {
      enabled: false,
      fileInputEnabled: false,
      allowedFileTypes: [],
      models: {
        "grok-3": {
          id: "grok-3",
          name: "Grok 3",
          description: "Most capable Grok model",
          enabled: true,
          isDefault: true,
          supportsThinkingMode: false,
          fileInputEnabled: false,
          allowedFileTypes: [],
          pricingPerMillionTokens: { input: 3.0, output: 15.0 },
        },
        "grok-3-mini": {
          id: "grok-3-mini",
          name: "Grok 3 Mini",
          description: "Fast and efficient Grok",
          enabled: true,
          isDefault: false,
          supportsThinkingMode: false,
          fileInputEnabled: false,
          allowedFileTypes: [],
          pricingPerMillionTokens: { input: 0.3, output: 0.5 },
        },
      },
    },
    groq: {
      enabled: false,
      fileInputEnabled: false,
      allowedFileTypes: [],
      models: {
        "llama-3.3-70b-versatile": {
          id: "llama-3.3-70b-versatile",
          name: "Llama 3.3 70B",
          description: "Fast open-source model via Groq",
          enabled: true,
          isDefault: true,
          supportsThinkingMode: false,
          fileInputEnabled: false,
          allowedFileTypes: [],
          pricingPerMillionTokens: { input: 0.059, output: 0.079 },
        },
        "llama-3.1-8b-instant": {
          id: "llama-3.1-8b-instant",
          name: "Llama 3.1 8B",
          description: "Fastest Groq model",
          enabled: true,
          isDefault: false,
          supportsThinkingMode: false,
          fileInputEnabled: false,
          allowedFileTypes: [],
          pricingPerMillionTokens: { input: 0.005, output: 0.008 },
        },
      },
    },
  },
};

export const FALLBACK_DB_OFFLINE_STATUS = {
  ok: false as const,
  message: "The model configuration database is unreachable.",
  steps: [
    "Create and add a Supabase key, or have your site admin log in to supabase.com and restore the paused project.",
    "Verify that POSTGRES_URL, NEXT_PUBLIC_SUPABASE_URL, and NEXT_PUBLIC_SUPABASE_ANON_KEY in docker/.env point to the correct project.",
    "Restart the server: kill $(lsof -ti:8888) && node chat/server.mjs",
  ],
};

export const FALLBACK_DB_OFFLINE_STATUS_LOCALHOST = {
  ok: false as const,
  message: "The model configuration database is unreachable.",
  steps: [
    "Create and add a Supabase or Neon database key, or have a teammate provide a test key.",
    "Verify that POSTGRES_URL, NEXT_PUBLIC_SUPABASE_URL, and NEXT_PUBLIC_SUPABASE_ANON_KEY in docker/.env point to the correct project.",
    "Restart the server: kill $(lsof -ti:8888) && node chat/server.mjs",
  ],
};

export const FALLBACK_GOOGLE_CHAT_AGENT_CONFIG = {
  systemPrompt: [
    "You are a helpful AI assistant.",
    "",
    "Response Guidelines:",
    "- Respond concisely.",
    "- Limit responses to 3–5 short paragraphs or bullet points.",
    "- Prioritize key facts over long explanations.",
    "- If the answer is long, summarize the key points first.",
    "- Prefer bullet points for clarity when listing information.",
  ].join("\n"),
  enabled: true,
  availableModels: Object.values(
    FALLBACK_ADMIN_CONFIG_SUMMARY.providers.google.models
  ).map((model) => ({
    id: model.id,
    name: model.name,
    description: model.description,
    enabled: model.enabled,
    isDefault: model.isDefault,
    thinkingEnabled: model.supportsThinkingMode,
    supportsThinkingMode: model.supportsThinkingMode,
    fileInputEnabled: false,
    allowedFileTypes: [] as string[],
  })),
  tools: {},
  rateLimit: { perMinute: 60, perHour: 1000, perDay: 10_000 },
};
