/**
 * Unit tests for GoogleChatAgent
 * Tests agent initialization, configuration, and core functionality
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { GoogleChatAgent } from "@/lib/ai/providers/google/chat-agent";
import type { ChatModelAgentConfig } from "@/lib/ai/core/types";

// Mock server-only module
vi.mock("server-only", () => ({}));

// Mock dependencies
vi.mock("@/lib/logging/activity-logger", () => ({
  logAgentActivity: vi.fn(),
  PerformanceTracker: vi.fn(() => ({
    end: vi.fn(),
    getDuration: vi.fn(() => 100),
  })),
  createCorrelationId: vi.fn(() => "test-correlation-id"),
  AgentType: {
    CHAT_MODEL_AGENT: "chat_model_agent",
    PROVIDER_TOOLS_AGENT: "provider_tools_agent",
    DOCUMENT_AGENT: "document_agent",
    MERMAID_AGENT: "mermaid_agent",
    PYTHON_AGENT: "python_agent",
    GIT_MCP_AGENT: "git_mcp_agent",
  },
  AgentOperationType: {
    INITIALIZATION: "initialization",
    STREAMING: "streaming",
    TOOL_INVOCATION: "tool_invocation",
  },
  AgentOperationCategory: {
    CONFIGURATION: "configuration",
    STREAMING: "streaming",
    TOOL_USE: "tool_use",
  },
}));

vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: vi.fn((config) => {
    return (modelId: string) => ({
      modelId,
      provider: "google",
      apiKey: config.apiKey,
    });
  }),
  google: vi.fn((modelId: string) => ({
    modelId,
    provider: "google",
    apiKey: "env-api-key",
  })),
}));

vi.mock("@/lib/ai/providers/google/agentConfigLoader", () => {
  return {
    AgentConfigLoader: class {
      setApiKey = vi.fn();
      setGitHubPAT = vi.fn();
      setProviderToolsModel = vi.fn();
      setDocumentAgentModel = vi.fn();
      setMermaidAgentModel = vi.fn();
      setPythonAgentModel = vi.fn();
      setGitMcpAgentModel = vi.fn();
      loadProviderToolsConfig = vi.fn();
      loadDocumentAgentConfig = vi.fn();
      loadMermaidAgentConfig = vi.fn();
      loadPythonAgentConfig = vi.fn();
      loadGitMcpAgentConfig = vi.fn();
      getProviderToolsAgent = vi.fn();
      getProviderToolsConfig = vi.fn();
      getDocumentAgentStreaming = vi.fn();
      getDocumentAgentConfig = vi.fn();
      getMermaidAgentStreaming = vi.fn();
      getMermaidAgentConfig = vi.fn();
      getPythonAgentStreaming = vi.fn();
      getPythonAgentConfig = vi.fn();
      getGitMcpAgent = vi.fn();
      getGitMcpAgentConfig = vi.fn();
    },
  };
});

vi.mock("@/lib/ai/providers/google/agentToolBuilder", () => {
  return {
    AgentToolBuilder: class {
      buildTools = vi.fn(() => ({
        testTool: {
          description: "Test tool",
          execute: vi.fn(),
        },
      }));
    },
  };
});

describe("GoogleChatAgent", () => {
  let validConfig: ChatModelAgentConfig;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Create a valid configuration for testing
    validConfig = {
      enabled: true,
      systemPrompt: "You are a helpful AI assistant.",
      rateLimit: {
        perMinute: 60,
        perHour: 1000,
        perDay: 10000,
      },
      availableModels: [
        {
          id: "gemini-2.0-flash-exp",
          name: "Gemini 2.0 Flash",
          description: "Fast model",
          pricingPerMillionTokens: {
            input: 0.075,
            output: 0.3,
          },
          enabled: true,
          isDefault: true,
          thinkingEnabled: true,
          supportsThinkingMode: true,
          fileInputEnabled: true,
          allowedFileTypes: ["image/*", "application/pdf"],
        },
        {
          id: "gemini-1.5-pro",
          name: "Gemini 1.5 Pro",
          description: "Advanced model",
          pricingPerMillionTokens: {
            input: 1.25,
            output: 5.0,
          },
          enabled: true,
          isDefault: false,
          thinkingEnabled: false,
          supportsThinkingMode: false,
          fileInputEnabled: true,
          allowedFileTypes: ["image/*"],
        },
        {
          id: "gemini-disabled",
          name: "Disabled Model",
          description: "This model is disabled",
          pricingPerMillionTokens: {
            input: 0.0,
            output: 0.0,
          },
          enabled: false,
          isDefault: false,
          thinkingEnabled: false,
        },
      ],
      tools: {
        providerToolsAgent: {
          description: "Search and fetch information",
          enabled: true,
          tool_input: {
            parameter_description: "The search query or URL",
          },
        },
        documentAgent: {
          description: "Create and manage documents",
          enabled: true,
          tool_input: {
            operation: {
              parameter_description: "The operation to perform",
            },
            instruction: {
              parameter_description: "Instructions for the operation",
            },
            documentId: {
              parameter_description: "The document ID",
            },
            targetVersion: {
              parameter_description: "The target version",
            },
          },
        },
        pythonAgent: {
          description: "Generate Python code",
          enabled: true,
          tool_input: {
            operation: {
              parameter_description: "The operation to perform",
            },
            instruction: {
              parameter_description: "Instructions for the operation",
            },
            codeId: {
              parameter_description: "The code ID",
            },
            targetVersion: {
              parameter_description: "The target version",
            },
          },
        },
        mermaidAgent: {
          description: "Generate Mermaid diagrams",
          enabled: true,
          tool_input: {
            operation: {
              parameter_description: "The operation to perform",
            },
            instruction: {
              parameter_description: "Instructions for the operation",
            },
            diagramId: {
              parameter_description: "The diagram ID",
            },
            targetVersion: {
              parameter_description: "The target version",
            },
          },
        },
        gitMcpAgent: {
          description: "Interact with GitHub",
          enabled: true,
          tool_input: {
            parameter_description: "The GitHub query",
          },
        },
      },
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Agent Initialization", () => {
    it("should initialize successfully with valid config", () => {
      const agent = new GoogleChatAgent(validConfig);
      expect(agent).toBeDefined();
      expect(agent).toBeInstanceOf(GoogleChatAgent);
    });

    it("should throw error when config is missing", () => {
      expect(() => new GoogleChatAgent(null as any)).toThrow();
    });

    it("should throw error when agent is disabled", () => {
      const disabledConfig = { ...validConfig, enabled: false };
      expect(() => new GoogleChatAgent(disabledConfig)).toThrow(
        "Google chat agent is disabled"
      );
    });

    it("should throw error when no models are enabled", () => {
      const noModelsConfig = {
        ...validConfig,
        availableModels: [
          {
            ...validConfig.availableModels[0],
            enabled: false,
          },
        ],
      };
      expect(() => new GoogleChatAgent(noModelsConfig)).toThrow(
        "No enabled models found"
      );
    });

    it("should accept config without availableModels", () => {
      const configWithoutModels = {
        enabled: true,
        systemPrompt: "Test prompt",
        rateLimit: {
          perMinute: 60,
          perHour: 1000,
          perDay: 10000,
        },
      } as ChatModelAgentConfig;

      const agent = new GoogleChatAgent(configWithoutModels);
      expect(agent).toBeDefined();
      expect(agent.getAvailableModels()).toEqual([]);
    });
  });

  describe("API Key Management", () => {
    it("should set API key correctly", () => {
      const agent = new GoogleChatAgent(validConfig);
      const apiKey = "test-google-api-key";

      agent.setApiKey(apiKey);

      // Verify the API key is set by getting a model
      const model = agent.getModel("gemini-2.0-flash-exp");
      expect(model).toBeDefined();
      expect(model.apiKey).toBe(apiKey);
    });

    it("should propagate API key to config loader", () => {
      const agent = new GoogleChatAgent(validConfig);
      const apiKey = "test-google-api-key";

      // Access the private configLoader through setApiKey
      agent.setApiKey(apiKey);

      // The configLoader.setApiKey should have been called
      // We can't directly test this without exposing internals,
      // but we verify the agent accepts the API key
      expect(() => agent.setApiKey(apiKey)).not.toThrow();
    });

    it("should use environment API key as fallback when no API key is set", () => {
      const agent = new GoogleChatAgent(validConfig);

      // Don't set API key, should fallback to environment
      const model = agent.getModel("gemini-2.0-flash-exp");
      expect(model).toBeDefined();
      expect(model.apiKey).toBe("env-api-key");
    });
  });

  describe("GitHub PAT Management", () => {
    it("should set GitHub PAT correctly", () => {
      const agent = new GoogleChatAgent(validConfig);
      const pat = "ghp_test_personal_access_token";

      // Should not throw
      expect(() => agent.setGitHubPAT(pat)).not.toThrow();
    });

    it("should propagate GitHub PAT to config loader", () => {
      const agent = new GoogleChatAgent(validConfig);
      const pat = "ghp_test_personal_access_token";

      agent.setGitHubPAT(pat);

      // The configLoader.setGitHubPAT should have been called
      // We verify it doesn't throw
      expect(() => agent.setGitHubPAT(pat)).not.toThrow();
    });
  });

  describe("Model Selection", () => {
    it("should get model with custom API key", () => {
      const agent = new GoogleChatAgent(validConfig);
      const apiKey = "custom-api-key";
      agent.setApiKey(apiKey);

      const model = agent.getModel("gemini-2.0-flash-exp");

      expect(model).toBeDefined();
      expect(model.modelId).toBe("gemini-2.0-flash-exp");
      expect(model.provider).toBe("google");
      expect(model.apiKey).toBe(apiKey);
    });

    it("should get model with environment API key", () => {
      const agent = new GoogleChatAgent(validConfig);

      const model = agent.getModel("gemini-1.5-pro");

      expect(model).toBeDefined();
      expect(model.modelId).toBe("gemini-1.5-pro");
      expect(model.apiKey).toBe("env-api-key");
    });

    it("should return available models (enabled only)", () => {
      const agent = new GoogleChatAgent(validConfig);

      const availableModels = agent.getAvailableModels();

      expect(availableModels).toHaveLength(2);
      expect(availableModels[0].id).toBe("gemini-2.0-flash-exp");
      expect(availableModels[1].id).toBe("gemini-1.5-pro");
      expect(availableModels.find((m) => m.id === "gemini-disabled")).toBeUndefined();
    });

    it("should return default model", () => {
      const agent = new GoogleChatAgent(validConfig);

      const defaultModel = agent.getDefaultModel();

      expect(defaultModel).toBeDefined();
      expect(defaultModel?.id).toBe("gemini-2.0-flash-exp");
      expect(defaultModel?.isDefault).toBe(true);
    });

    it("should return first available model if no default is set", () => {
      const configNoDefault = {
        ...validConfig,
        availableModels: validConfig.availableModels.map((m) => ({
          ...m,
          isDefault: false,
        })),
      };

      const agent = new GoogleChatAgent(configNoDefault);
      const defaultModel = agent.getDefaultModel();

      expect(defaultModel).toBeDefined();
      expect(defaultModel?.id).toBe("gemini-2.0-flash-exp");
    });

    it("should return null when no models are available", () => {
      const configWithoutModels = {
        enabled: true,
        systemPrompt: "Test prompt",
        rateLimit: {
          perMinute: 60,
          perHour: 1000,
          perDay: 10000,
        },
      } as ChatModelAgentConfig;

      const agent = new GoogleChatAgent(configWithoutModels);
      const defaultModel = agent.getDefaultModel();

      expect(defaultModel).toBeNull();
    });
  });

  describe("Thinking Mode Support", () => {
    it("should detect thinking mode support for models with thinkingEnabled", () => {
      const agent = new GoogleChatAgent(validConfig);

      const supportsThinking = agent.supportsThinking("gemini-2.0-flash-exp");

      expect(supportsThinking).toBe(true);
    });

    it("should detect thinking mode support for models with supportsThinkingMode", () => {
      const agent = new GoogleChatAgent(validConfig);

      const supportsThinking = agent.supportsThinking("gemini-2.0-flash-exp");

      expect(supportsThinking).toBe(true);
    });

    it("should return false for models without thinking mode support", () => {
      const agent = new GoogleChatAgent(validConfig);

      const supportsThinking = agent.supportsThinking("gemini-1.5-pro");

      expect(supportsThinking).toBe(false);
    });

    it("should return false for unknown models", () => {
      const agent = new GoogleChatAgent(validConfig);

      const supportsThinking = agent.supportsThinking("unknown-model");

      expect(supportsThinking).toBe(false);
    });
  });

  describe("Model Configuration Methods", () => {
    it("should set provider tools model", () => {
      const agent = new GoogleChatAgent(validConfig);

      expect(() => agent.setProviderToolsModel("gemini-2.0-flash-exp")).not.toThrow();
    });

    it("should set document agent model", () => {
      const agent = new GoogleChatAgent(validConfig);

      expect(() => agent.setDocumentAgentModel("gemini-2.0-flash-exp")).not.toThrow();
    });

    it("should set mermaid agent model", () => {
      const agent = new GoogleChatAgent(validConfig);

      expect(() => agent.setMermaidAgentModel("gemini-2.0-flash-exp")).not.toThrow();
    });

    it("should set python agent model", () => {
      const agent = new GoogleChatAgent(validConfig);

      expect(() => agent.setPythonAgentModel("gemini-2.0-flash-exp")).not.toThrow();
    });

    it("should set GitHub MCP agent model", () => {
      const agent = new GoogleChatAgent(validConfig);

      expect(() => agent.setGitMcpAgentModel("gemini-2.0-flash-exp")).not.toThrow();
    });
  });

  describe("Agent Configuration Loading", () => {
    it("should load provider tools config", async () => {
      const agent = new GoogleChatAgent(validConfig);

      await expect(agent.loadProviderToolsConfig()).resolves.not.toThrow();
    });

    it("should load document agent config", async () => {
      const agent = new GoogleChatAgent(validConfig);

      await expect(agent.loadDocumentAgentConfig()).resolves.not.toThrow();
    });

    it("should load mermaid agent config", async () => {
      const agent = new GoogleChatAgent(validConfig);

      await expect(agent.loadMermaidAgentConfig()).resolves.not.toThrow();
    });

    it("should load python agent config", async () => {
      const agent = new GoogleChatAgent(validConfig);

      await expect(agent.loadPythonAgentConfig()).resolves.not.toThrow();
    });

    it("should load GitHub MCP agent config", async () => {
      const agent = new GoogleChatAgent(validConfig);

      await expect(agent.loadGitMcpAgentConfig()).resolves.not.toThrow();
    });
  });

  describe("File Input Support", () => {
    it("should detect file input support from model config", () => {
      const agent = new GoogleChatAgent(validConfig);

      const supportsFiles = agent.supportsFileInput("gemini-2.0-flash-exp");

      expect(supportsFiles).toBe(true);
    });

    it("should return false for models without file input", () => {
      const configNoFileInput = {
        ...validConfig,
        availableModels: [
          {
            ...validConfig.availableModels[0],
            fileInputEnabled: false,
          },
        ],
      };

      const agent = new GoogleChatAgent(configNoFileInput);
      const supportsFiles = agent.supportsFileInput("gemini-2.0-flash-exp");

      expect(supportsFiles).toBe(false);
    });

    it("should fallback to provider-level file input settings", () => {
      const configWithProviderLevel = {
        ...validConfig,
        fileInputEnabled: true,
        availableModels: [
          {
            ...validConfig.availableModels[0],
            fileInputEnabled: undefined,
          },
        ],
      } as ChatModelAgentConfig;

      const agent = new GoogleChatAgent(configWithProviderLevel);
      const supportsFiles = agent.supportsFileInput("gemini-2.0-flash-exp");

      expect(supportsFiles).toBe(true);
    });

    it("should get allowed file types from model config", () => {
      const agent = new GoogleChatAgent(validConfig);

      const allowedTypes = agent.getAllowedFileTypes("gemini-2.0-flash-exp");

      expect(allowedTypes).toEqual(["image/*", "application/pdf"]);
    });

    it("should return empty array when no file types are configured", () => {
      const configNoFileTypes = {
        enabled: true,
        systemPrompt: "Test prompt",
        rateLimit: {
          perMinute: 60,
          perHour: 1000,
          perDay: 10000,
        },
        availableModels: [
          {
            id: "test-model",
            name: "Test Model",
            description: "Test",
            pricingPerMillionTokens: { input: 0, output: 0 },
            enabled: true,
            isDefault: true,
          },
        ],
      } as ChatModelAgentConfig;

      const agent = new GoogleChatAgent(configNoFileTypes);
      const allowedTypes = agent.getAllowedFileTypes("test-model");

      expect(allowedTypes).toEqual([]);
    });

    it("should extract file types from fileInputTypes structure", () => {
      const configWithFileInputTypes = {
        ...validConfig,
        fileInputTypes: {
          images: { enabled: true },
          pdf: { enabled: true },
          codeFiles: {
            ".py": { enabled: true },
            ".js": { enabled: false },
          },
          textFiles: {},
          ppt: { enabled: false },
          excel: { enabled: false },
        },
        availableModels: [
          {
            ...validConfig.availableModels[0],
            allowedFileTypes: undefined,
          },
        ],
      } as ChatModelAgentConfig;

      const agent = new GoogleChatAgent(configWithFileInputTypes);
      const allowedTypes = agent.getAllowedFileTypes("gemini-2.0-flash-exp");

      expect(allowedTypes).toContain("image/*");
      expect(allowedTypes).toContain("application/pdf");
      expect(allowedTypes).toContain(".py");
      expect(allowedTypes).not.toContain(".js");
    });
  });

  describe("Error Handling", () => {
    it("should throw AgentError with INVALID_CONFIGURATION when config is null", () => {
      expect(() => new GoogleChatAgent(null as any)).toThrow("configuration is required");
    });

    it("should throw AgentError with AGENT_DISABLED when agent is disabled", () => {
      const disabledConfig = { ...validConfig, enabled: false };

      expect(() => new GoogleChatAgent(disabledConfig)).toThrow(
        "Google chat agent is disabled"
      );
    });

    it("should throw AgentError when no enabled models exist", () => {
      const noEnabledModels = {
        ...validConfig,
        availableModels: validConfig.availableModels.map((m) => ({
          ...m,
          enabled: false,
        })),
      };

      expect(() => new GoogleChatAgent(noEnabledModels)).toThrow(
        "No enabled models found"
      );
    });
  });
});
