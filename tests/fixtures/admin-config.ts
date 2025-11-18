/**
 * Test fixtures for admin configurations
 */

export const testAdminConfigs = {
  googleChatAgent: {
    id: "990e8400-e29b-41d4-a716-446655440001",
    agentType: "chat_model",
    provider: "google",
    systemPrompt: {
      content: "You are a helpful AI assistant.",
    },
    rateLimit: {
      hourly: 100,
      daily: 1000,
    },
    isActive: true,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
  },
  googleProviderTools: {
    id: "990e8400-e29b-41d4-a716-446655440002",
    agentType: "provider_tools",
    provider: "google",
    systemPrompt: {
      content: "You are a tool-using AI assistant.",
    },
    rateLimit: {
      hourly: 50,
      daily: 500,
    },
    isActive: true,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
  },
};

export const testModelConfigs = {
  gemini2Flash: {
    id: "aa0e8400-e29b-41d4-a716-446655440001",
    modelId: "gemini-2.0-flash-exp",
    provider: "google",
    displayName: "Gemini 2.0 Flash",
    inputPrice: 0.075,
    outputPrice: 0.3,
    contextWindow: 1_000_000,
    isActive: true,
    isDefault: true,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
  },
  gpt4Turbo: {
    id: "aa0e8400-e29b-41d4-a716-446655440002",
    modelId: "gpt-4-turbo-preview",
    provider: "openai",
    displayName: "GPT-4 Turbo",
    inputPrice: 10.0,
    outputPrice: 30.0,
    contextWindow: 128_000,
    isActive: true,
    isDefault: false,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
  },
};
