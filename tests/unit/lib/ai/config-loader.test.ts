/**
 * Unit tests for AgentConfigLoader
 * Tests agent configuration loading, caching, API key propagation, and validation
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock server-only module FIRST to avoid import errors
vi.mock("server-only", () => ({}));

import { AgentConfigLoader } from "@/lib/ai/providers/google/agentConfigLoader";
import * as adminQueries from "@/lib/db/queries/admin";

// Mock the admin queries module
vi.mock("@/lib/db/queries/admin", () => ({
  getAdminConfig: vi.fn(),
}));

// Mock the specialized agent modules to avoid dependency issues
vi.mock("@/lib/ai/providers/google/provider-tools-agent", () => ({
  GoogleProviderToolsAgent: class GoogleProviderToolsAgent {
    config: any;
    setApiKey = vi.fn();
    setModel = vi.fn();
    constructor(config: any) {
      this.config = config;
    }
  },
}));

vi.mock("@/lib/ai/providers/google/document-agent-streaming", () => ({
  GoogleDocumentAgentStreaming: class GoogleDocumentAgentStreaming {
    config: any;
    setApiKey = vi.fn();
    setModel = vi.fn();
    constructor(config: any) {
      this.config = config;
    }
  },
}));

vi.mock("@/lib/ai/providers/google/mermaid-agent-streaming", () => ({
  GoogleMermaidAgentStreaming: class GoogleMermaidAgentStreaming {
    config: any;
    setApiKey = vi.fn();
    setModel = vi.fn();
    constructor(config: any) {
      this.config = config;
    }
  },
}));

vi.mock("@/lib/ai/providers/google/python-agent-streaming", () => ({
  GooglePythonAgentStreaming: class GooglePythonAgentStreaming {
    config: any;
    setApiKey = vi.fn();
    setModel = vi.fn();
    constructor(config: any) {
      this.config = config;
    }
  },
}));

vi.mock("@/lib/ai/providers/google/git-mcp-agent", () => ({
  GoogleGitMcpAgent: class GoogleGitMcpAgent {
    config: any;
    setApiKey = vi.fn();
    setGoogleApiKey = vi.fn();
    setModel = vi.fn();
    constructor(config: any) {
      this.config = config;
    }
  },
}));

// Mock the activity logger to avoid logging during tests
vi.mock("@/lib/logging/activity-logger", () => ({
  logAgentActivity: vi.fn(),
  PerformanceTracker: class PerformanceTracker {
    end = vi.fn();
    getDuration = vi.fn(() => 100);
  },
  createCorrelationId: vi.fn(() => "test-correlation-id"),
  AgentType: {
    PROVIDER_TOOLS_AGENT: "provider_tools",
    DOCUMENT_AGENT: "document",
    MERMAID_AGENT: "mermaid",
    PYTHON_AGENT: "python",
    GIT_MCP_AGENT: "git_mcp",
  },
  AgentOperationType: {
    INITIALIZATION: "initialization",
  },
  AgentOperationCategory: {
    CONFIGURATION: "configuration",
  },
}));

describe("AgentConfigLoader", () => {
  let configLoader: AgentConfigLoader;
  const mockGetAdminConfig = vi.mocked(adminQueries.getAdminConfig);

  // Sample configuration data for testing
  const mockProviderToolsConfig = {
    configKey: "provider_tools_agent_google",
    configData: {
      enabled: true,
      systemPrompt: "You are a provider tools agent",
      modelId: "gemini-2.0-flash-exp",
      rateLimit: {
        perMinute: 60,
        perHour: 1000,
        perDay: 10_000,
      },
      tools: {
        googleSearch: { enabled: true, description: "Search the web" },
      },
    },
  };

  const mockDocumentAgentConfig = {
    configKey: "document_agent_google",
    configData: {
      enabled: true,
      modelId: "gemini-2.0-flash-exp",
      rateLimit: {
        perMinute: 60,
        perHour: 1000,
        perDay: 10_000,
      },
    },
  };

  const mockMermaidAgentConfig = {
    configKey: "mermaid_agent_google",
    configData: {
      enabled: true,
      modelId: "gemini-2.0-flash-exp",
      rateLimit: {
        perMinute: 60,
        perHour: 1000,
        perDay: 10_000,
      },
    },
  };

  const mockPythonAgentConfig = {
    configKey: "python_agent_google",
    configData: {
      enabled: true,
      modelId: "gemini-2.0-flash-exp",
      rateLimit: {
        perMinute: 60,
        perHour: 1000,
        perDay: 10_000,
      },
    },
  };

  const mockGitMcpAgentConfig = {
    configKey: "git_mcp_agent_google",
    configData: {
      enabled: true,
      systemPrompt: "You are a GitHub MCP agent",
      modelId: "gemini-2.0-flash-exp",
      rateLimit: {
        perMinute: 60,
        perHour: 1000,
        perDay: 10_000,
      },
    },
  };

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Create a new config loader instance for each test
    configLoader = new AgentConfigLoader();
  });

  describe("Agent Config Loading from Database", () => {
    it("should load provider tools agent configuration from database", async () => {
      mockGetAdminConfig.mockResolvedValueOnce(mockProviderToolsConfig as any);

      await configLoader.loadProviderToolsConfig();

      expect(mockGetAdminConfig).toHaveBeenCalledWith({
        configKey: "provider_tools_agent_google",
      });

      const agent = configLoader.getProviderToolsAgent();
      const config = configLoader.getProviderToolsConfig();

      expect(agent).toBeDefined();
      expect(config).toEqual(mockProviderToolsConfig.configData);
    });

    it("should load document agent configuration from database", async () => {
      mockGetAdminConfig.mockResolvedValueOnce(mockDocumentAgentConfig as any);

      await configLoader.loadDocumentAgentConfig();

      expect(mockGetAdminConfig).toHaveBeenCalledWith({
        configKey: "document_agent_google",
      });

      const agent = configLoader.getDocumentAgentStreaming();
      const config = configLoader.getDocumentAgentConfig();

      expect(agent).toBeDefined();
      expect(config).toEqual(mockDocumentAgentConfig.configData);
    });

    it("should load mermaid agent configuration from database", async () => {
      mockGetAdminConfig.mockResolvedValueOnce(mockMermaidAgentConfig as any);

      await configLoader.loadMermaidAgentConfig();

      expect(mockGetAdminConfig).toHaveBeenCalledWith({
        configKey: "mermaid_agent_google",
      });

      const agent = configLoader.getMermaidAgentStreaming();
      const config = configLoader.getMermaidAgentConfig();

      expect(agent).toBeDefined();
      expect(config).toEqual(mockMermaidAgentConfig.configData);
    });

    it("should load python agent configuration from database", async () => {
      mockGetAdminConfig.mockResolvedValueOnce(mockPythonAgentConfig as any);

      await configLoader.loadPythonAgentConfig();

      expect(mockGetAdminConfig).toHaveBeenCalledWith({
        configKey: "python_agent_google",
      });

      const agent = configLoader.getPythonAgentStreaming();
      const config = configLoader.getPythonAgentConfig();

      expect(agent).toBeDefined();
      expect(config).toEqual(mockPythonAgentConfig.configData);
    });

    it("should load GitHub MCP agent configuration from database", async () => {
      mockGetAdminConfig.mockResolvedValueOnce(mockGitMcpAgentConfig as any);

      await configLoader.loadGitMcpAgentConfig();

      expect(mockGetAdminConfig).toHaveBeenCalledWith({
        configKey: "git_mcp_agent_google",
      });

      const agent = configLoader.getGitMcpAgent();
      const config = configLoader.getGitMcpAgentConfig();

      expect(agent).toBeDefined();
      expect(config).toEqual(mockGitMcpAgentConfig.configData);
    });
  });

  describe("Config Caching", () => {
    it("should cache loaded configurations and not reload from database", async () => {
      mockGetAdminConfig.mockResolvedValueOnce(mockProviderToolsConfig as any);

      // Load config once
      await configLoader.loadProviderToolsConfig();

      // Get config multiple times
      const config1 = configLoader.getProviderToolsConfig();
      const config2 = configLoader.getProviderToolsConfig();

      // Should only call database once
      expect(mockGetAdminConfig).toHaveBeenCalledTimes(1);

      // Should return the same cached config
      expect(config1).toBe(config2);
      expect(config1).toEqual(mockProviderToolsConfig.configData);
    });

    it("should cache agent instances and reuse them", async () => {
      mockGetAdminConfig.mockResolvedValueOnce(mockDocumentAgentConfig as any);

      // Load config once
      await configLoader.loadDocumentAgentConfig();

      // Get agent multiple times
      const agent1 = configLoader.getDocumentAgentStreaming();
      const agent2 = configLoader.getDocumentAgentStreaming();

      // Should return the same cached agent instance
      expect(agent1).toBe(agent2);
    });

    it("should store all agent configs separately", async () => {
      mockGetAdminConfig
        .mockResolvedValueOnce(mockProviderToolsConfig as any)
        .mockResolvedValueOnce(mockDocumentAgentConfig as any)
        .mockResolvedValueOnce(mockPythonAgentConfig as any);

      await configLoader.loadProviderToolsConfig();
      await configLoader.loadDocumentAgentConfig();
      await configLoader.loadPythonAgentConfig();

      expect(configLoader.getProviderToolsConfig()).toEqual(
        mockProviderToolsConfig.configData
      );
      expect(configLoader.getDocumentAgentConfig()).toEqual(
        mockDocumentAgentConfig.configData
      );
      expect(configLoader.getPythonAgentConfig()).toEqual(
        mockPythonAgentConfig.configData
      );
    });
  });

  describe("API Key Propagation", () => {
    it("should propagate API key to provider tools agent when loaded", async () => {
      const testApiKey = "test-google-api-key-123";
      mockGetAdminConfig.mockResolvedValueOnce(mockProviderToolsConfig as any);

      configLoader.setApiKey(testApiKey);
      await configLoader.loadProviderToolsConfig();

      const agent = configLoader.getProviderToolsAgent();
      expect(agent?.setApiKey).toHaveBeenCalledWith(testApiKey);
    });

    it("should propagate API key to all agents after loading", async () => {
      const testApiKey = "test-google-api-key-456";

      mockGetAdminConfig
        .mockResolvedValueOnce(mockProviderToolsConfig as any)
        .mockResolvedValueOnce(mockDocumentAgentConfig as any)
        .mockResolvedValueOnce(mockMermaidAgentConfig as any)
        .mockResolvedValueOnce(mockPythonAgentConfig as any);

      // Set API key first
      configLoader.setApiKey(testApiKey);

      // Load all agents
      await configLoader.loadProviderToolsConfig();
      await configLoader.loadDocumentAgentConfig();
      await configLoader.loadMermaidAgentConfig();
      await configLoader.loadPythonAgentConfig();

      // Verify API key was set on all agents
      expect(
        configLoader.getProviderToolsAgent()?.setApiKey
      ).toHaveBeenCalledWith(testApiKey);
      expect(
        configLoader.getDocumentAgentStreaming()?.setApiKey
      ).toHaveBeenCalledWith(testApiKey);
      expect(
        configLoader.getMermaidAgentStreaming()?.setApiKey
      ).toHaveBeenCalledWith(testApiKey);
      expect(
        configLoader.getPythonAgentStreaming()?.setApiKey
      ).toHaveBeenCalledWith(testApiKey);
    });

    it("should propagate GitHub PAT to Git MCP agent", async () => {
      const testPAT = "ghp_test_token_123";
      const testApiKey = "test-google-api-key-789";

      mockGetAdminConfig.mockResolvedValueOnce(mockGitMcpAgentConfig as any);

      configLoader.setApiKey(testApiKey);
      configLoader.setGitHubPAT(testPAT);
      await configLoader.loadGitMcpAgentConfig();

      const agent = configLoader.getGitMcpAgent();
      expect(agent?.setApiKey).toHaveBeenCalledWith(testPAT);
      expect(agent?.setGoogleApiKey).toHaveBeenCalledWith(testApiKey);
    });

    it("should propagate GitHub PAT to existing Git MCP agent when set after loading", async () => {
      const testPAT = "ghp_test_token_456";
      const testApiKey = "test-google-api-key-000";

      mockGetAdminConfig.mockResolvedValueOnce(mockGitMcpAgentConfig as any);

      configLoader.setApiKey(testApiKey);
      await configLoader.loadGitMcpAgentConfig();

      // Clear previous calls to verify only new call is made
      vi.clearAllMocks();

      // Set PAT after agent is loaded
      configLoader.setGitHubPAT(testPAT);

      const agent = configLoader.getGitMcpAgent();
      expect(agent?.setApiKey).toHaveBeenCalledWith(testPAT);
      expect(agent?.setGoogleApiKey).toHaveBeenCalledWith(testApiKey);
    });

    it("should handle API key set before agent is loaded", async () => {
      const testApiKey = "test-early-api-key";
      mockGetAdminConfig.mockResolvedValueOnce(mockDocumentAgentConfig as any);

      // Set API key before loading config
      configLoader.setApiKey(testApiKey);

      // Load config after setting API key
      await configLoader.loadDocumentAgentConfig();

      const agent = configLoader.getDocumentAgentStreaming();
      expect(agent?.setApiKey).toHaveBeenCalledWith(testApiKey);
    });
  });

  describe("Agent Initialization on Demand", () => {
    it("should not initialize agents until config is loaded", () => {
      expect(configLoader.getProviderToolsAgent()).toBeUndefined();
      expect(configLoader.getDocumentAgentStreaming()).toBeUndefined();
      expect(configLoader.getMermaidAgentStreaming()).toBeUndefined();
      expect(configLoader.getPythonAgentStreaming()).toBeUndefined();
      expect(configLoader.getGitMcpAgent()).toBeUndefined();
    });

    it("should initialize agent only when config is loaded and enabled", async () => {
      mockGetAdminConfig.mockResolvedValueOnce(mockProviderToolsConfig as any);

      // Agent should not exist before loading
      expect(configLoader.getProviderToolsAgent()).toBeUndefined();

      // Load config
      await configLoader.loadProviderToolsConfig();

      // Agent should now exist
      expect(configLoader.getProviderToolsAgent()).toBeDefined();
    });

    it("should allow loading configs independently", async () => {
      mockGetAdminConfig
        .mockResolvedValueOnce(mockDocumentAgentConfig as any)
        .mockResolvedValueOnce(mockPythonAgentConfig as any);

      // Load only document agent
      await configLoader.loadDocumentAgentConfig();

      expect(configLoader.getDocumentAgentStreaming()).toBeDefined();
      expect(configLoader.getPythonAgentStreaming()).toBeUndefined();

      // Load python agent later
      await configLoader.loadPythonAgentConfig();

      expect(configLoader.getDocumentAgentStreaming()).toBeDefined();
      expect(configLoader.getPythonAgentStreaming()).toBeDefined();
    });
  });

  describe("Config Validation", () => {
    it("should not initialize agent when config is disabled", async () => {
      const disabledConfig = {
        ...mockProviderToolsConfig,
        configData: {
          ...mockProviderToolsConfig.configData,
          enabled: false,
        },
      };
      mockGetAdminConfig.mockResolvedValueOnce(disabledConfig as any);

      await configLoader.loadProviderToolsConfig();

      // Agent should not be initialized when disabled
      expect(configLoader.getProviderToolsAgent()).toBeUndefined();
      expect(configLoader.getProviderToolsConfig()).toBeUndefined();
    });

    it("should not initialize agent when config is not found", async () => {
      mockGetAdminConfig.mockResolvedValueOnce(null);

      await configLoader.loadDocumentAgentConfig();

      // Agent should not be initialized when config is null
      expect(configLoader.getDocumentAgentStreaming()).toBeUndefined();
      expect(configLoader.getDocumentAgentConfig()).toBeUndefined();
    });

    it("should not initialize agent when configData is missing", async () => {
      const invalidConfig = {
        configKey: "provider_tools_agent_google",
        configData: null,
      };
      mockGetAdminConfig.mockResolvedValueOnce(invalidConfig as any);

      await configLoader.loadProviderToolsConfig();

      expect(configLoader.getProviderToolsAgent()).toBeUndefined();
      expect(configLoader.getProviderToolsConfig()).toBeUndefined();
    });

    it("should throw error when config loading fails", async () => {
      const dbError = new Error("Database connection failed");
      mockGetAdminConfig.mockRejectedValueOnce(dbError);

      await expect(configLoader.loadProviderToolsConfig()).rejects.toThrow(
        "Database connection failed"
      );
    });

    it("should handle missing enabled property gracefully", async () => {
      const configWithoutEnabled = {
        configKey: "document_agent_google",
        configData: {
          modelId: "gemini-2.0-flash-exp",
          rateLimit: { perMinute: 60, perHour: 1000, perDay: 10_000 },
        },
      };
      mockGetAdminConfig.mockResolvedValueOnce(configWithoutEnabled as any);

      await configLoader.loadDocumentAgentConfig();

      // Should not initialize when enabled property is missing (falsy)
      expect(configLoader.getDocumentAgentStreaming()).toBeUndefined();
    });
  });

  describe("Model Configuration", () => {
    it("should set model for provider tools agent", async () => {
      mockGetAdminConfig.mockResolvedValueOnce(mockProviderToolsConfig as any);

      await configLoader.loadProviderToolsConfig();
      configLoader.setProviderToolsModel("gemini-2.0-flash-thinking-exp");

      const agent = configLoader.getProviderToolsAgent();
      expect(agent?.setModel).toHaveBeenCalledWith(
        "gemini-2.0-flash-thinking-exp"
      );
    });

    it("should set model for document agent", async () => {
      mockGetAdminConfig.mockResolvedValueOnce(mockDocumentAgentConfig as any);

      await configLoader.loadDocumentAgentConfig();
      configLoader.setDocumentAgentModel("gemini-1.5-pro");

      const agent = configLoader.getDocumentAgentStreaming();
      expect(agent?.setModel).toHaveBeenCalledWith("gemini-1.5-pro");
    });

    it("should set model for mermaid agent", async () => {
      mockGetAdminConfig.mockResolvedValueOnce(mockMermaidAgentConfig as any);

      await configLoader.loadMermaidAgentConfig();
      configLoader.setMermaidAgentModel("gemini-1.5-flash");

      const agent = configLoader.getMermaidAgentStreaming();
      expect(agent?.setModel).toHaveBeenCalledWith("gemini-1.5-flash");
    });

    it("should set model for python agent", async () => {
      mockGetAdminConfig.mockResolvedValueOnce(mockPythonAgentConfig as any);

      await configLoader.loadPythonAgentConfig();
      configLoader.setPythonAgentModel("gemini-2.0-flash-exp");

      const agent = configLoader.getPythonAgentStreaming();
      expect(agent?.setModel).toHaveBeenCalledWith("gemini-2.0-flash-exp");
    });

    it("should set model for Git MCP agent", async () => {
      mockGetAdminConfig.mockResolvedValueOnce(mockGitMcpAgentConfig as any);

      await configLoader.loadGitMcpAgentConfig();
      configLoader.setGitMcpAgentModel("gemini-2.0-flash-exp");

      const agent = configLoader.getGitMcpAgent();
      expect(agent?.setModel).toHaveBeenCalledWith("gemini-2.0-flash-exp");
    });

    it("should not throw error when setting model for uninitialized agent", () => {
      // Should not throw even if agent is not loaded yet
      expect(() => {
        configLoader.setProviderToolsModel("gemini-2.0-flash-exp");
        configLoader.setDocumentAgentModel("gemini-2.0-flash-exp");
        configLoader.setMermaidAgentModel("gemini-2.0-flash-exp");
        configLoader.setPythonAgentModel("gemini-2.0-flash-exp");
        configLoader.setGitMcpAgentModel("gemini-2.0-flash-exp");
      }).not.toThrow();
    });
  });

  describe("Complex Integration Scenarios", () => {
    it("should handle full initialization flow with all agents", async () => {
      const apiKey = "test-full-api-key";
      const githubPAT = "ghp_test_full_pat";
      const modelId = "gemini-2.0-flash-exp";

      mockGetAdminConfig
        .mockResolvedValueOnce(mockProviderToolsConfig as any)
        .mockResolvedValueOnce(mockDocumentAgentConfig as any)
        .mockResolvedValueOnce(mockMermaidAgentConfig as any)
        .mockResolvedValueOnce(mockPythonAgentConfig as any)
        .mockResolvedValueOnce(mockGitMcpAgentConfig as any);

      // Set credentials
      configLoader.setApiKey(apiKey);
      configLoader.setGitHubPAT(githubPAT);

      // Load all configs
      await configLoader.loadProviderToolsConfig();
      await configLoader.loadDocumentAgentConfig();
      await configLoader.loadMermaidAgentConfig();
      await configLoader.loadPythonAgentConfig();
      await configLoader.loadGitMcpAgentConfig();

      // Set models
      configLoader.setProviderToolsModel(modelId);
      configLoader.setDocumentAgentModel(modelId);
      configLoader.setMermaidAgentModel(modelId);
      configLoader.setPythonAgentModel(modelId);
      configLoader.setGitMcpAgentModel(modelId);

      // Verify all agents are initialized
      expect(configLoader.getProviderToolsAgent()).toBeDefined();
      expect(configLoader.getDocumentAgentStreaming()).toBeDefined();
      expect(configLoader.getMermaidAgentStreaming()).toBeDefined();
      expect(configLoader.getPythonAgentStreaming()).toBeDefined();
      expect(configLoader.getGitMcpAgent()).toBeDefined();

      // Verify all configs are cached
      expect(configLoader.getProviderToolsConfig()).toBeDefined();
      expect(configLoader.getDocumentAgentConfig()).toBeDefined();
      expect(configLoader.getMermaidAgentConfig()).toBeDefined();
      expect(configLoader.getPythonAgentConfig()).toBeDefined();
      expect(configLoader.getGitMcpAgentConfig()).toBeDefined();
    });

    it("should handle partial agent initialization when some configs are disabled", async () => {
      const enabledDocConfig = mockDocumentAgentConfig;
      const disabledPythonConfig = {
        ...mockPythonAgentConfig,
        configData: { ...mockPythonAgentConfig.configData, enabled: false },
      };

      mockGetAdminConfig
        .mockResolvedValueOnce(enabledDocConfig as any)
        .mockResolvedValueOnce(disabledPythonConfig as any);

      await configLoader.loadDocumentAgentConfig();
      await configLoader.loadPythonAgentConfig();

      // Document agent should be initialized
      expect(configLoader.getDocumentAgentStreaming()).toBeDefined();
      expect(configLoader.getDocumentAgentConfig()).toBeDefined();

      // Python agent should not be initialized (disabled)
      expect(configLoader.getPythonAgentStreaming()).toBeUndefined();
      expect(configLoader.getPythonAgentConfig()).toBeUndefined();
    });

    it("should handle database errors gracefully for individual agents", async () => {
      mockGetAdminConfig
        .mockResolvedValueOnce(mockDocumentAgentConfig as any)
        .mockRejectedValueOnce(new Error("Database error for python agent"));

      // Document agent should load successfully
      await configLoader.loadDocumentAgentConfig();
      expect(configLoader.getDocumentAgentStreaming()).toBeDefined();

      // Python agent should throw error
      await expect(configLoader.loadPythonAgentConfig()).rejects.toThrow(
        "Database error for python agent"
      );
      expect(configLoader.getPythonAgentStreaming()).toBeUndefined();

      // Document agent should still be available
      expect(configLoader.getDocumentAgentStreaming()).toBeDefined();
    });
  });
});
