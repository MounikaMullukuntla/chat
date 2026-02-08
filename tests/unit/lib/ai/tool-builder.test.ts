/**
 * Unit tests for AgentToolBuilder
 * Tests tool creation, enablement, parameter validation, and execution delegation
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatModelAgentConfig } from "@/lib/ai/core/types";

// Mock server-only module before any imports
vi.mock("server-only", () => ({}));

// Mock AI SDK tool function
vi.mock("ai", () => ({
  tool: vi.fn((config) => config),
}));

// Mock RAG context builder
vi.mock("@/lib/ai/rag-context-builder", () => ({
  buildRagContext: vi.fn(),
}));

// Mock dependencies
vi.mock("@/lib/logging/activity-logger", () => {
  class MockPerformanceTracker {
    getDuration() {
      return 100;
    }
  }

  return {
    logAgentActivity: vi.fn().mockResolvedValue(undefined),
    PerformanceTracker: MockPerformanceTracker,
    createCorrelationId: vi.fn().mockReturnValue("test-correlation-id"),
    AgentType: {
      CHAT_MODEL_AGENT: "CHAT_MODEL_AGENT",
      PROVIDER_TOOLS_AGENT: "PROVIDER_TOOLS_AGENT",
      DOCUMENT_AGENT: "DOCUMENT_AGENT",
      PYTHON_AGENT: "PYTHON_AGENT",
      MERMAID_AGENT: "MERMAID_AGENT",
      GIT_MCP_AGENT: "GIT_MCP_AGENT",
    },
    AgentOperationType: {
      TOOL_INVOCATION: "TOOL_INVOCATION",
      INITIALIZATION: "INITIALIZATION",
    },
    AgentOperationCategory: {
      TOOL_USE: "TOOL_USE",
      CONFIGURATION: "CONFIGURATION",
    },
  };
});

import { AgentError, ErrorCodes } from "@/lib/ai/core/errors";
import { buildRagContext } from "@/lib/ai/rag-context-builder";
import type { AgentConfigLoader } from "@/lib/ai/providers/google/agentConfigLoader";
// Import after mocking
import { AgentToolBuilder } from "@/lib/ai/providers/google/agentToolBuilder";

const ORIGINAL_RAG_ENV = {
  PINECONE_API_KEY: process.env.PINECONE_API_KEY,
  VOYAGE_API_KEY: process.env.VOYAGE_API_KEY,
  RAG_TOOL_ENABLED: process.env.RAG_TOOL_ENABLED,
};

function restoreEnvVar(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}

describe("AgentToolBuilder", () => {
  let mockConfigLoader: AgentConfigLoader;
  let mockDataStream: any;
  let mockUser: any;
  let chatId: string;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Ensure the optional RAG tool does not leak into tests unless explicitly enabled.
    delete process.env.PINECONE_API_KEY;
    delete process.env.VOYAGE_API_KEY;
    delete process.env.RAG_TOOL_ENABLED;

    // Mock data stream
    mockDataStream = {
      writeData: vi.fn(),
    };

    // Mock user
    mockUser = {
      id: "test-user-123",
      email: "test@example.com",
    };

    chatId = "test-chat-456";

    // Create mock config loader
    mockConfigLoader = {
      getProviderToolsAgent: vi.fn(),
      getProviderToolsConfig: vi.fn(),
      getDocumentAgentStreaming: vi.fn(),
      getDocumentAgentConfig: vi.fn(),
      getMermaidAgentStreaming: vi.fn(),
      getMermaidAgentConfig: vi.fn(),
      getPythonAgentStreaming: vi.fn(),
      getPythonAgentConfig: vi.fn(),
      getGitMcpAgent: vi.fn(),
      getGitMcpAgentConfig: vi.fn(),
    } as any;
  });

  afterEach(() => {
    restoreEnvVar("PINECONE_API_KEY", ORIGINAL_RAG_ENV.PINECONE_API_KEY);
    restoreEnvVar("VOYAGE_API_KEY", ORIGINAL_RAG_ENV.VOYAGE_API_KEY);
    restoreEnvVar("RAG_TOOL_ENABLED", ORIGINAL_RAG_ENV.RAG_TOOL_ENABLED);
    vi.restoreAllMocks();
  });

  describe("Tool Creation for Each Agent Type", () => {
    it("should create providerToolsAgent tool when enabled", () => {
      // Arrange
      const mockProviderToolsAgent = {
        execute: vi.fn().mockResolvedValue({ output: "search results" }),
      };

      vi.mocked(mockConfigLoader.getProviderToolsAgent).mockReturnValue(
        mockProviderToolsAgent as any
      );
      vi.mocked(mockConfigLoader.getProviderToolsConfig).mockReturnValue({
        enabled: true,
      });

      const config: ChatModelAgentConfig = {
        enabled: true,
        systemPrompt: "Test prompt",
        rateLimit: { perMinute: 10, perHour: 100, perDay: 1000 },
        availableModels: [],
        tools: {
          providerToolsAgent: {
            description: "Search and fetch information from the web",
            enabled: true,
            tool_input: {
              parameter_description: "The search query or URL to fetch",
            },
          },
          documentAgent: {
            description: "Document tool",
            enabled: false,
            tool_input: {},
          },
          pythonAgent: {
            description: "Python tool",
            enabled: false,
            tool_input: {},
          },
          mermaidAgent: {
            description: "Mermaid tool",
            enabled: false,
            tool_input: {},
          },
          gitMcpAgent: {
            description: "GitHub tool",
            enabled: false,
            tool_input: {},
          },
        },
      };

      const builder = new AgentToolBuilder(config, mockConfigLoader);

      // Act
      const tools = builder.buildTools(mockDataStream, mockUser, chatId);

      // Assert
      expect(tools).toBeDefined();
      expect(tools?.providerToolsAgent).toBeDefined();
      expect(tools?.providerToolsAgent.description).toBe(
        "Search and fetch information from the web"
      );
    });

    it("should create documentAgent tool when enabled", () => {
      // Arrange
      const mockDocumentAgent = {
        execute: vi.fn().mockResolvedValue({
          output: { id: "doc-123", title: "Test Doc", kind: "text" },
        }),
      };

      vi.mocked(mockConfigLoader.getDocumentAgentStreaming).mockReturnValue(
        mockDocumentAgent as any
      );
      vi.mocked(mockConfigLoader.getDocumentAgentConfig).mockReturnValue({
        enabled: true,
      });

      const config: ChatModelAgentConfig = {
        enabled: true,
        systemPrompt: "Test prompt",
        rateLimit: { perMinute: 10, perHour: 100, perDay: 1000 },
        availableModels: [],
        tools: {
          providerToolsAgent: {
            description: "Provider tools",
            enabled: false,
            tool_input: {},
          },
          documentAgent: {
            description: "Create and manage text documents",
            enabled: true,
            tool_input: {
              operation: {
                parameter_description: "The operation to perform",
              },
              instruction: {
                parameter_description: "Instructions for the document",
              },
              documentId: {
                parameter_description: "The document ID (optional)",
              },
              targetVersion: {
                parameter_description: "The target version (optional)",
              },
            },
          },
          pythonAgent: {
            description: "Python tool",
            enabled: false,
            tool_input: {},
          },
          mermaidAgent: {
            description: "Mermaid tool",
            enabled: false,
            tool_input: {},
          },
          gitMcpAgent: {
            description: "GitHub tool",
            enabled: false,
            tool_input: {},
          },
        },
      };

      const builder = new AgentToolBuilder(config, mockConfigLoader);

      // Act
      const tools = builder.buildTools(mockDataStream, mockUser, chatId);

      // Assert
      expect(tools).toBeDefined();
      expect(tools?.documentAgent).toBeDefined();
      expect(tools?.documentAgent.description).toBe(
        "Create and manage text documents"
      );
    });

    it("should create mermaidAgent tool when enabled", () => {
      // Arrange
      const mockMermaidAgent = {
        execute: vi.fn().mockResolvedValue({
          output: {
            id: "diagram-123",
            title: "Test Diagram",
            kind: "mermaid code",
          },
        }),
      };

      vi.mocked(mockConfigLoader.getMermaidAgentStreaming).mockReturnValue(
        mockMermaidAgent as any
      );
      vi.mocked(mockConfigLoader.getMermaidAgentConfig).mockReturnValue({
        enabled: true,
      });

      const config: ChatModelAgentConfig = {
        enabled: true,
        systemPrompt: "Test prompt",
        rateLimit: { perMinute: 10, perHour: 100, perDay: 1000 },
        availableModels: [],
        tools: {
          providerToolsAgent: {
            description: "Provider tools",
            enabled: false,
            tool_input: {},
          },
          documentAgent: {
            description: "Document tool",
            enabled: false,
            tool_input: {},
          },
          pythonAgent: {
            description: "Python tool",
            enabled: false,
            tool_input: {},
          },
          mermaidAgent: {
            description: "Create and update Mermaid diagrams",
            enabled: true,
            tool_input: {
              operation: {
                parameter_description: "The operation to perform",
              },
              instruction: {
                parameter_description: "Instructions for the diagram",
              },
              diagramId: {
                parameter_description: "The diagram ID (optional)",
              },
              targetVersion: {
                parameter_description: "The target version (optional)",
              },
            },
          },
          gitMcpAgent: {
            description: "GitHub tool",
            enabled: false,
            tool_input: {},
          },
        },
      };

      const builder = new AgentToolBuilder(config, mockConfigLoader);

      // Act
      const tools = builder.buildTools(mockDataStream, mockUser, chatId);

      // Assert
      expect(tools).toBeDefined();
      expect(tools?.mermaidAgent).toBeDefined();
      expect(tools?.mermaidAgent.description).toBe(
        "Create and update Mermaid diagrams"
      );
    });

    it("should create pythonAgent tool when enabled", () => {
      // Arrange
      const mockPythonAgent = {
        execute: vi.fn().mockResolvedValue({
          output: { id: "code-123", title: "Test Code", kind: "python code" },
        }),
      };

      vi.mocked(mockConfigLoader.getPythonAgentStreaming).mockReturnValue(
        mockPythonAgent as any
      );
      vi.mocked(mockConfigLoader.getPythonAgentConfig).mockReturnValue({
        enabled: true,
      });

      const config: ChatModelAgentConfig = {
        enabled: true,
        systemPrompt: "Test prompt",
        rateLimit: { perMinute: 10, perHour: 100, perDay: 1000 },
        availableModels: [],
        tools: {
          providerToolsAgent: {
            description: "Provider tools",
            enabled: false,
            tool_input: {},
          },
          documentAgent: {
            description: "Document tool",
            enabled: false,
            tool_input: {},
          },
          pythonAgent: {
            description: "Generate and execute Python code",
            enabled: true,
            tool_input: {
              operation: {
                parameter_description: "The operation to perform",
              },
              instruction: {
                parameter_description: "Instructions for the code",
              },
              codeId: {
                parameter_description: "The code ID (optional)",
              },
              targetVersion: {
                parameter_description: "The target version (optional)",
              },
            },
          },
          mermaidAgent: {
            description: "Mermaid tool",
            enabled: false,
            tool_input: {},
          },
          gitMcpAgent: {
            description: "GitHub tool",
            enabled: false,
            tool_input: {},
          },
        },
      };

      const builder = new AgentToolBuilder(config, mockConfigLoader);

      // Act
      const tools = builder.buildTools(mockDataStream, mockUser, chatId);

      // Assert
      expect(tools).toBeDefined();
      expect(tools?.pythonAgent).toBeDefined();
      expect(tools?.pythonAgent.description).toBe(
        "Generate and execute Python code"
      );
    });

    it("should create gitMcpAgent tool when enabled", () => {
      // Arrange
      const mockGitMcpAgent = {
        execute: vi.fn().mockResolvedValue({
          output: "GitHub data",
          success: true,
        }),
        isReady: vi.fn().mockReturnValue(true),
      };

      vi.mocked(mockConfigLoader.getGitMcpAgent).mockReturnValue(
        mockGitMcpAgent as any
      );
      vi.mocked(mockConfigLoader.getGitMcpAgentConfig).mockReturnValue({
        enabled: true,
      });

      const config: ChatModelAgentConfig = {
        enabled: true,
        systemPrompt: "Test prompt",
        rateLimit: { perMinute: 10, perHour: 100, perDay: 1000 },
        availableModels: [],
        tools: {
          providerToolsAgent: {
            description: "Provider tools",
            enabled: false,
            tool_input: {},
          },
          documentAgent: {
            description: "Document tool",
            enabled: false,
            tool_input: {},
          },
          pythonAgent: {
            description: "Python tool",
            enabled: false,
            tool_input: {},
          },
          mermaidAgent: {
            description: "Mermaid tool",
            enabled: false,
            tool_input: {},
          },
          gitMcpAgent: {
            description: "Access GitHub repositories and data",
            enabled: true,
            tool_input: {
              parameter_description: "GitHub query or command",
            },
          },
        },
      };

      const builder = new AgentToolBuilder(config, mockConfigLoader);

      // Act
      const tools = builder.buildTools(mockDataStream, mockUser, chatId);

      // Assert
      expect(tools).toBeDefined();
      expect(tools?.gitMcpAgent).toBeDefined();
      expect(tools?.gitMcpAgent.description).toBe(
        "Access GitHub repositories and data"
      );
    });

    it("should create multiple tools when all are enabled", () => {
      // Arrange
      const mockProviderToolsAgent = {
        execute: vi.fn().mockResolvedValue({ output: "search results" }),
      };
      const mockDocumentAgent = {
        execute: vi.fn().mockResolvedValue({
          output: { id: "doc-123", title: "Test", kind: "text" },
        }),
      };
      const mockPythonAgent = {
        execute: vi.fn().mockResolvedValue({
          output: { id: "code-123", title: "Test", kind: "python code" },
        }),
      };
      const mockMermaidAgent = {
        execute: vi.fn().mockResolvedValue({
          output: { id: "diagram-123", title: "Test", kind: "mermaid code" },
        }),
      };
      const mockGitMcpAgent = {
        execute: vi
          .fn()
          .mockResolvedValue({ output: "GitHub data", success: true }),
        isReady: vi.fn().mockReturnValue(true),
      };

      vi.mocked(mockConfigLoader.getProviderToolsAgent).mockReturnValue(
        mockProviderToolsAgent as any
      );
      vi.mocked(mockConfigLoader.getProviderToolsConfig).mockReturnValue({
        enabled: true,
      });
      vi.mocked(mockConfigLoader.getDocumentAgentStreaming).mockReturnValue(
        mockDocumentAgent as any
      );
      vi.mocked(mockConfigLoader.getDocumentAgentConfig).mockReturnValue({
        enabled: true,
      });
      vi.mocked(mockConfigLoader.getPythonAgentStreaming).mockReturnValue(
        mockPythonAgent as any
      );
      vi.mocked(mockConfigLoader.getPythonAgentConfig).mockReturnValue({
        enabled: true,
      });
      vi.mocked(mockConfigLoader.getMermaidAgentStreaming).mockReturnValue(
        mockMermaidAgent as any
      );
      vi.mocked(mockConfigLoader.getMermaidAgentConfig).mockReturnValue({
        enabled: true,
      });
      vi.mocked(mockConfigLoader.getGitMcpAgent).mockReturnValue(
        mockGitMcpAgent as any
      );
      vi.mocked(mockConfigLoader.getGitMcpAgentConfig).mockReturnValue({
        enabled: true,
      });

      const config: ChatModelAgentConfig = {
        enabled: true,
        systemPrompt: "Test prompt",
        rateLimit: { perMinute: 10, perHour: 100, perDay: 1000 },
        availableModels: [],
        tools: {
          providerToolsAgent: {
            description: "Provider tools",
            enabled: true,
            tool_input: {
              parameter_description: "Search query",
            },
          },
          documentAgent: {
            description: "Document tool",
            enabled: true,
            tool_input: {
              operation: { parameter_description: "Operation" },
              instruction: { parameter_description: "Instruction" },
              documentId: { parameter_description: "Document ID" },
              targetVersion: { parameter_description: "Version" },
            },
          },
          pythonAgent: {
            description: "Python tool",
            enabled: true,
            tool_input: {
              operation: { parameter_description: "Operation" },
              instruction: { parameter_description: "Instruction" },
              codeId: { parameter_description: "Code ID" },
              targetVersion: { parameter_description: "Version" },
            },
          },
          mermaidAgent: {
            description: "Mermaid tool",
            enabled: true,
            tool_input: {
              operation: { parameter_description: "Operation" },
              instruction: { parameter_description: "Instruction" },
              diagramId: { parameter_description: "Diagram ID" },
              targetVersion: { parameter_description: "Version" },
            },
          },
          gitMcpAgent: {
            description: "GitHub tool",
            enabled: true,
            tool_input: {
              parameter_description: "GitHub query",
            },
          },
        },
      };

      const builder = new AgentToolBuilder(config, mockConfigLoader);

      // Act
      const tools = builder.buildTools(mockDataStream, mockUser, chatId);

      // Assert
      expect(tools).toBeDefined();
      expect(Object.keys(tools!)).toHaveLength(5);
      expect(tools?.providerToolsAgent).toBeDefined();
      expect(tools?.documentAgent).toBeDefined();
      expect(tools?.pythonAgent).toBeDefined();
      expect(tools?.mermaidAgent).toBeDefined();
      expect(tools?.gitMcpAgent).toBeDefined();
    });
  });

  describe("Tool Enablement Based on Config", () => {
    it("should not create tool when config disabled", () => {
      // Arrange
      const mockProviderToolsAgent = {
        execute: vi.fn().mockResolvedValue({ output: "search results" }),
      };

      vi.mocked(mockConfigLoader.getProviderToolsAgent).mockReturnValue(
        mockProviderToolsAgent as any
      );
      // Config disabled
      vi.mocked(mockConfigLoader.getProviderToolsConfig).mockReturnValue({
        enabled: false,
      });

      const config: ChatModelAgentConfig = {
        enabled: true,
        systemPrompt: "Test prompt",
        rateLimit: { perMinute: 10, perHour: 100, perDay: 1000 },
        availableModels: [],
        tools: {
          providerToolsAgent: {
            description: "Provider tools",
            enabled: true, // Tool enabled in chat config
            tool_input: {
              parameter_description: "Search query",
            },
          },
          documentAgent: {
            description: "Document tool",
            enabled: false,
            tool_input: {},
          },
          pythonAgent: {
            description: "Python tool",
            enabled: false,
            tool_input: {},
          },
          mermaidAgent: {
            description: "Mermaid tool",
            enabled: false,
            tool_input: {},
          },
          gitMcpAgent: {
            description: "GitHub tool",
            enabled: false,
            tool_input: {},
          },
        },
      };

      const builder = new AgentToolBuilder(config, mockConfigLoader);

      // Act
      const tools = builder.buildTools(mockDataStream, mockUser, chatId);

      // Assert - should return undefined since no tools are enabled
      expect(tools).toBeUndefined();
    });

    it("should not create tool when chat model config disabled", () => {
      // Arrange
      const mockProviderToolsAgent = {
        execute: vi.fn().mockResolvedValue({ output: "search results" }),
      };

      vi.mocked(mockConfigLoader.getProviderToolsAgent).mockReturnValue(
        mockProviderToolsAgent as any
      );
      vi.mocked(mockConfigLoader.getProviderToolsConfig).mockReturnValue({
        enabled: true,
      });

      const config: ChatModelAgentConfig = {
        enabled: true,
        systemPrompt: "Test prompt",
        rateLimit: { perMinute: 10, perHour: 100, perDay: 1000 },
        availableModels: [],
        tools: {
          providerToolsAgent: {
            description: "Provider tools",
            enabled: false, // Tool disabled in chat config
            tool_input: {
              parameter_description: "Search query",
            },
          },
          documentAgent: {
            description: "Document tool",
            enabled: false,
            tool_input: {},
          },
          pythonAgent: {
            description: "Python tool",
            enabled: false,
            tool_input: {},
          },
          mermaidAgent: {
            description: "Mermaid tool",
            enabled: false,
            tool_input: {},
          },
          gitMcpAgent: {
            description: "GitHub tool",
            enabled: false,
            tool_input: {},
          },
        },
      };

      const builder = new AgentToolBuilder(config, mockConfigLoader);

      // Act
      const tools = builder.buildTools(mockDataStream, mockUser, chatId);

      // Assert
      expect(tools).toBeUndefined();
    });

    it("should not create tool when agent not available", () => {
      // Arrange
      vi.mocked(mockConfigLoader.getProviderToolsAgent).mockReturnValue(
        undefined as any
      );
      vi.mocked(mockConfigLoader.getProviderToolsConfig).mockReturnValue({
        enabled: true,
      });

      const config: ChatModelAgentConfig = {
        enabled: true,
        systemPrompt: "Test prompt",
        rateLimit: { perMinute: 10, perHour: 100, perDay: 1000 },
        availableModels: [],
        tools: {
          providerToolsAgent: {
            description: "Provider tools",
            enabled: true,
            tool_input: {
              parameter_description: "Search query",
            },
          },
          documentAgent: {
            description: "Document tool",
            enabled: false,
            tool_input: {},
          },
          pythonAgent: {
            description: "Python tool",
            enabled: false,
            tool_input: {},
          },
          mermaidAgent: {
            description: "Mermaid tool",
            enabled: false,
            tool_input: {},
          },
          gitMcpAgent: {
            description: "GitHub tool",
            enabled: false,
            tool_input: {},
          },
        },
      };

      const builder = new AgentToolBuilder(config, mockConfigLoader);

      // Act
      const tools = builder.buildTools(mockDataStream, mockUser, chatId);

      // Assert
      expect(tools).toBeUndefined();
    });

    it("should return undefined when no tools are enabled", () => {
      // Arrange
      const config: ChatModelAgentConfig = {
        enabled: true,
        systemPrompt: "Test prompt",
        rateLimit: { perMinute: 10, perHour: 100, perDay: 1000 },
        availableModels: [],
        tools: {
          providerToolsAgent: {
            description: "Provider tools",
            enabled: false,
            tool_input: {},
          },
          documentAgent: {
            description: "Document tool",
            enabled: false,
            tool_input: {},
          },
          pythonAgent: {
            description: "Python tool",
            enabled: false,
            tool_input: {},
          },
          mermaidAgent: {
            description: "Mermaid tool",
            enabled: false,
            tool_input: {},
          },
          gitMcpAgent: {
            description: "GitHub tool",
            enabled: false,
            tool_input: {},
          },
        },
      };

      const builder = new AgentToolBuilder(config, mockConfigLoader);

      // Act
      const tools = builder.buildTools(mockDataStream, mockUser, chatId);

      // Assert
      expect(tools).toBeUndefined();
    });
  });

  describe("Retrieval Context Tool", () => {
    const baseConfig: ChatModelAgentConfig = {
      enabled: true,
      systemPrompt: "Test prompt",
      rateLimit: { perMinute: 10, perHour: 100, perDay: 1000 },
      availableModels: [],
      tools: {
        providerToolsAgent: {
          description: "Provider tools",
          enabled: false,
          tool_input: {},
        },
        documentAgent: {
          description: "Document tool",
          enabled: false,
          tool_input: {},
        },
        pythonAgent: {
          description: "Python tool",
          enabled: false,
          tool_input: {},
        },
        mermaidAgent: {
          description: "Mermaid tool",
          enabled: false,
          tool_input: {},
        },
        gitMcpAgent: {
          description: "GitHub tool",
          enabled: false,
          tool_input: {},
        },
      },
    };

    it("should create retrieveContext tool when credentials are present", async () => {
      // Arrange
      process.env.PINECONE_API_KEY = "test-pinecone";
      process.env.VOYAGE_API_KEY = "test-voyage";

      vi.mocked(buildRagContext).mockResolvedValueOnce({
        context: "CTX",
        sourceCount: 2,
        sources: [
          {
            id: "chunk-1",
            score: 0.91234,
            filePath: "a/b.ts",
            lineRange: "10-20",
            content: "const x = 1;",
          },
          {
            id: "chunk-2",
            score: 0.5,
            filePath: "c/d.ts",
            content: "const y = 2;",
          },
        ],
      });

      const builder = new AgentToolBuilder(baseConfig, mockConfigLoader);

      // Act
      const tools: any = builder.buildTools(mockDataStream, mockUser, chatId);

      // Assert
      expect(tools).toBeDefined();
      expect(tools.retrieveContext).toBeDefined();
      expect(Object.keys(tools)).toHaveLength(1);

      const result = await tools.retrieveContext.execute({
        query: "Find relevant code context",
      });

      expect(buildRagContext).toHaveBeenCalledWith({
        queryText: "Find relevant code context",
      });

      expect(result).toEqual({
        found: true,
        sourceCount: 2,
        context: "CTX",
        sources: [
          {
            filePath: "a/b.ts",
            lineRange: "10-20",
            score: 0.912,
          },
          {
            filePath: "c/d.ts",
            lineRange: null,
            score: 0.5,
          },
        ],
      });
    });

    it("should return found=false when no matches exist", async () => {
      // Arrange
      process.env.PINECONE_API_KEY = "test-pinecone";
      process.env.VOYAGE_API_KEY = "test-voyage";

      vi.mocked(buildRagContext).mockResolvedValueOnce({
        context: "",
        sourceCount: 0,
        sources: [],
        skippedReason: "no_matches",
      });

      const builder = new AgentToolBuilder(baseConfig, mockConfigLoader);

      // Act
      const tools: any = builder.buildTools(mockDataStream, mockUser, chatId);

      // Assert
      expect(tools).toBeDefined();
      expect(tools.retrieveContext).toBeDefined();

      const result = await tools.retrieveContext.execute({
        query: "Find relevant code context",
      });

      expect(result).toEqual({
        found: false,
        sourceCount: 0,
        skippedReason: "no_matches",
      });
    });

    it("should not create retrieveContext tool when RAG_TOOL_ENABLED is false", () => {
      // Arrange
      process.env.PINECONE_API_KEY = "test-pinecone";
      process.env.VOYAGE_API_KEY = "test-voyage";
      process.env.RAG_TOOL_ENABLED = "false";

      const builder = new AgentToolBuilder(baseConfig, mockConfigLoader);

      // Act
      const tools = builder.buildTools(mockDataStream, mockUser, chatId);

      // Assert
      expect(tools).toBeUndefined();
    });
  });

  describe("Tool Parameter Validation", () => {
    it("should throw error when providerToolsAgent description is missing", () => {
      // Arrange
      const mockProviderToolsAgent = {
        execute: vi.fn().mockResolvedValue({ output: "search results" }),
      };

      vi.mocked(mockConfigLoader.getProviderToolsAgent).mockReturnValue(
        mockProviderToolsAgent as any
      );
      vi.mocked(mockConfigLoader.getProviderToolsConfig).mockReturnValue({
        enabled: true,
      });

      const config: ChatModelAgentConfig = {
        enabled: true,
        systemPrompt: "Test prompt",
        rateLimit: { perMinute: 10, perHour: 100, perDay: 1000 },
        availableModels: [],
        tools: {
          providerToolsAgent: {
            description: "", // Missing description
            enabled: true,
            tool_input: {
              parameter_description: "Search query",
            },
          },
          documentAgent: {
            description: "Document tool",
            enabled: false,
            tool_input: {},
          },
          pythonAgent: {
            description: "Python tool",
            enabled: false,
            tool_input: {},
          },
          mermaidAgent: {
            description: "Mermaid tool",
            enabled: false,
            tool_input: {},
          },
          gitMcpAgent: {
            description: "GitHub tool",
            enabled: false,
            tool_input: {},
          },
        },
      };

      const builder = new AgentToolBuilder(config, mockConfigLoader);

      // Act & Assert
      expect(() =>
        builder.buildTools(mockDataStream, mockUser, chatId)
      ).toThrow(AgentError);
      expect(() =>
        builder.buildTools(mockDataStream, mockUser, chatId)
      ).toThrow(/providerToolsAgent tool description is required/);
    });

    it("should throw error when providerToolsAgent parameter description is missing", () => {
      // Arrange
      const mockProviderToolsAgent = {
        execute: vi.fn().mockResolvedValue({ output: "search results" }),
      };

      vi.mocked(mockConfigLoader.getProviderToolsAgent).mockReturnValue(
        mockProviderToolsAgent as any
      );
      vi.mocked(mockConfigLoader.getProviderToolsConfig).mockReturnValue({
        enabled: true,
      });

      const config: ChatModelAgentConfig = {
        enabled: true,
        systemPrompt: "Test prompt",
        rateLimit: { perMinute: 10, perHour: 100, perDay: 1000 },
        availableModels: [],
        tools: {
          providerToolsAgent: {
            description: "Provider tools",
            enabled: true,
            tool_input: {
              parameter_description: "", // Missing parameter description
            },
          },
          documentAgent: {
            description: "Document tool",
            enabled: false,
            tool_input: {},
          },
          pythonAgent: {
            description: "Python tool",
            enabled: false,
            tool_input: {},
          },
          mermaidAgent: {
            description: "Mermaid tool",
            enabled: false,
            tool_input: {},
          },
          gitMcpAgent: {
            description: "GitHub tool",
            enabled: false,
            tool_input: {},
          },
        },
      };

      const builder = new AgentToolBuilder(config, mockConfigLoader);

      // Act & Assert
      expect(() =>
        builder.buildTools(mockDataStream, mockUser, chatId)
      ).toThrow(AgentError);
      expect(() =>
        builder.buildTools(mockDataStream, mockUser, chatId)
      ).toThrow(/providerToolsAgent tool parameter description is required/);
    });

    it("should throw error when documentAgent description is missing", () => {
      // Arrange
      const mockDocumentAgent = {
        execute: vi.fn().mockResolvedValue({
          output: { id: "doc-123", title: "Test", kind: "text" },
        }),
      };

      vi.mocked(mockConfigLoader.getDocumentAgentStreaming).mockReturnValue(
        mockDocumentAgent as any
      );
      vi.mocked(mockConfigLoader.getDocumentAgentConfig).mockReturnValue({
        enabled: true,
      });

      const config: ChatModelAgentConfig = {
        enabled: true,
        systemPrompt: "Test prompt",
        rateLimit: { perMinute: 10, perHour: 100, perDay: 1000 },
        availableModels: [],
        tools: {
          providerToolsAgent: {
            description: "Provider tools",
            enabled: false,
            tool_input: {},
          },
          documentAgent: {
            description: "", // Missing description
            enabled: true,
            tool_input: {
              operation: { parameter_description: "Operation" },
              instruction: { parameter_description: "Instruction" },
              documentId: { parameter_description: "Document ID" },
              targetVersion: { parameter_description: "Version" },
            },
          },
          pythonAgent: {
            description: "Python tool",
            enabled: false,
            tool_input: {},
          },
          mermaidAgent: {
            description: "Mermaid tool",
            enabled: false,
            tool_input: {},
          },
          gitMcpAgent: {
            description: "GitHub tool",
            enabled: false,
            tool_input: {},
          },
        },
      };

      const builder = new AgentToolBuilder(config, mockConfigLoader);

      // Act & Assert
      expect(() =>
        builder.buildTools(mockDataStream, mockUser, chatId)
      ).toThrow(AgentError);
      expect(() =>
        builder.buildTools(mockDataStream, mockUser, chatId)
      ).toThrow(/documentAgent tool description is required/);
    });

    it("should throw error when documentAgent parameter descriptions are missing", () => {
      // Arrange
      const mockDocumentAgent = {
        execute: vi.fn().mockResolvedValue({
          output: { id: "doc-123", title: "Test", kind: "text" },
        }),
      };

      vi.mocked(mockConfigLoader.getDocumentAgentStreaming).mockReturnValue(
        mockDocumentAgent as any
      );
      vi.mocked(mockConfigLoader.getDocumentAgentConfig).mockReturnValue({
        enabled: true,
      });

      const config: ChatModelAgentConfig = {
        enabled: true,
        systemPrompt: "Test prompt",
        rateLimit: { perMinute: 10, perHour: 100, perDay: 1000 },
        availableModels: [],
        tools: {
          providerToolsAgent: {
            description: "Provider tools",
            enabled: false,
            tool_input: {},
          },
          documentAgent: {
            description: "Document tool",
            enabled: true,
            tool_input: {
              operation: { parameter_description: "" }, // Missing
              instruction: { parameter_description: "" }, // Missing
              documentId: { parameter_description: "Document ID" },
              targetVersion: { parameter_description: "Version" },
            },
          },
          pythonAgent: {
            description: "Python tool",
            enabled: false,
            tool_input: {},
          },
          mermaidAgent: {
            description: "Mermaid tool",
            enabled: false,
            tool_input: {},
          },
          gitMcpAgent: {
            description: "GitHub tool",
            enabled: false,
            tool_input: {},
          },
        },
      };

      const builder = new AgentToolBuilder(config, mockConfigLoader);

      // Act & Assert
      expect(() =>
        builder.buildTools(mockDataStream, mockUser, chatId)
      ).toThrow(AgentError);
      expect(() =>
        builder.buildTools(mockDataStream, mockUser, chatId)
      ).toThrow(/documentAgent tool parameter descriptions .* are required/);
    });
  });

  describe("Tool Execution Delegation", () => {
    it("should delegate providerToolsAgent execution correctly", async () => {
      // Arrange
      const mockProviderToolsAgent = {
        execute: vi.fn().mockResolvedValue({ output: "search results" }),
      };

      vi.mocked(mockConfigLoader.getProviderToolsAgent).mockReturnValue(
        mockProviderToolsAgent as any
      );
      vi.mocked(mockConfigLoader.getProviderToolsConfig).mockReturnValue({
        enabled: true,
      });

      const config: ChatModelAgentConfig = {
        enabled: true,
        systemPrompt: "Test prompt",
        rateLimit: { perMinute: 10, perHour: 100, perDay: 1000 },
        availableModels: [],
        tools: {
          providerToolsAgent: {
            description: "Provider tools",
            enabled: true,
            tool_input: {
              parameter_description: "Search query",
            },
          },
          documentAgent: {
            description: "Document tool",
            enabled: false,
            tool_input: {},
          },
          pythonAgent: {
            description: "Python tool",
            enabled: false,
            tool_input: {},
          },
          mermaidAgent: {
            description: "Mermaid tool",
            enabled: false,
            tool_input: {},
          },
          gitMcpAgent: {
            description: "GitHub tool",
            enabled: false,
            tool_input: {},
          },
        },
      };

      const builder = new AgentToolBuilder(config, mockConfigLoader);
      const tools = builder.buildTools(mockDataStream, mockUser, chatId);

      // Act
      const result = await tools?.providerToolsAgent.execute({
        input: "test search query",
      });

      // Assert
      expect(mockProviderToolsAgent.execute).toHaveBeenCalledWith({
        input: "test search query",
        userId: mockUser.id,
      });
      expect(result).toBe("search results");
    });

    it("should delegate documentAgent execution correctly", async () => {
      // Arrange
      const mockDocumentAgent = {
        execute: vi.fn().mockResolvedValue({
          output: { id: "doc-123", title: "Test Doc", kind: "text" },
        }),
      };

      vi.mocked(mockConfigLoader.getDocumentAgentStreaming).mockReturnValue(
        mockDocumentAgent as any
      );
      vi.mocked(mockConfigLoader.getDocumentAgentConfig).mockReturnValue({
        enabled: true,
      });

      const config: ChatModelAgentConfig = {
        enabled: true,
        systemPrompt: "Test prompt",
        rateLimit: { perMinute: 10, perHour: 100, perDay: 1000 },
        availableModels: [],
        tools: {
          providerToolsAgent: {
            description: "Provider tools",
            enabled: false,
            tool_input: {},
          },
          documentAgent: {
            description: "Document tool",
            enabled: true,
            tool_input: {
              operation: { parameter_description: "Operation" },
              instruction: { parameter_description: "Instruction" },
              documentId: { parameter_description: "Document ID" },
              targetVersion: { parameter_description: "Version" },
            },
          },
          pythonAgent: {
            description: "Python tool",
            enabled: false,
            tool_input: {},
          },
          mermaidAgent: {
            description: "Mermaid tool",
            enabled: false,
            tool_input: {},
          },
          gitMcpAgent: {
            description: "GitHub tool",
            enabled: false,
            tool_input: {},
          },
        },
      };

      const builder = new AgentToolBuilder(config, mockConfigLoader);
      const tools = builder.buildTools(mockDataStream, mockUser, chatId);

      // Act
      const result = await tools?.documentAgent.execute({
        operation: "create",
        instruction: "Create a test document",
        documentId: undefined,
        targetVersion: undefined,
      });

      // Assert
      expect(mockDocumentAgent.execute).toHaveBeenCalledWith({
        operation: "create",
        instruction: "Create a test document",
        documentId: undefined,
        targetVersion: undefined,
        dataStream: mockDataStream,
        user: mockUser,
        chatId,
      });
      expect(result).toEqual({
        id: "doc-123",
        title: "Test Doc",
        kind: "text",
      });
    });

    it("should delegate gitMcpAgent execution correctly when agent is ready", async () => {
      // Arrange
      const mockGitMcpAgent = {
        execute: vi.fn().mockResolvedValue({
          output: "GitHub data",
          success: true,
        }),
        isReady: vi.fn().mockReturnValue(true),
      };

      vi.mocked(mockConfigLoader.getGitMcpAgent).mockReturnValue(
        mockGitMcpAgent as any
      );
      vi.mocked(mockConfigLoader.getGitMcpAgentConfig).mockReturnValue({
        enabled: true,
      });

      const config: ChatModelAgentConfig = {
        enabled: true,
        systemPrompt: "Test prompt",
        rateLimit: { perMinute: 10, perHour: 100, perDay: 1000 },
        availableModels: [],
        tools: {
          providerToolsAgent: {
            description: "Provider tools",
            enabled: false,
            tool_input: {},
          },
          documentAgent: {
            description: "Document tool",
            enabled: false,
            tool_input: {},
          },
          pythonAgent: {
            description: "Python tool",
            enabled: false,
            tool_input: {},
          },
          mermaidAgent: {
            description: "Mermaid tool",
            enabled: false,
            tool_input: {},
          },
          gitMcpAgent: {
            description: "GitHub tool",
            enabled: true,
            tool_input: {
              parameter_description: "GitHub query",
            },
          },
        },
      };

      const builder = new AgentToolBuilder(config, mockConfigLoader);
      const tools = builder.buildTools(mockDataStream, mockUser, chatId);

      // Act
      const result = await tools?.gitMcpAgent.execute({
        input: "get repository info",
      });

      // Assert
      expect(mockGitMcpAgent.isReady).toHaveBeenCalled();
      expect(mockGitMcpAgent.execute).toHaveBeenCalledWith({
        input: "get repository info",
        userId: mockUser.id,
      });
      expect(result).toBe("GitHub data");
    });

    it("should return error when gitMcpAgent is not ready", async () => {
      // Arrange
      const mockGitMcpAgent = {
        execute: vi.fn(),
        isReady: vi.fn().mockReturnValue(false), // Not ready
      };

      vi.mocked(mockConfigLoader.getGitMcpAgent).mockReturnValue(
        mockGitMcpAgent as any
      );
      vi.mocked(mockConfigLoader.getGitMcpAgentConfig).mockReturnValue({
        enabled: true,
      });

      const config: ChatModelAgentConfig = {
        enabled: true,
        systemPrompt: "Test prompt",
        rateLimit: { perMinute: 10, perHour: 100, perDay: 1000 },
        availableModels: [],
        tools: {
          providerToolsAgent: {
            description: "Provider tools",
            enabled: false,
            tool_input: {},
          },
          documentAgent: {
            description: "Document tool",
            enabled: false,
            tool_input: {},
          },
          pythonAgent: {
            description: "Python tool",
            enabled: false,
            tool_input: {},
          },
          mermaidAgent: {
            description: "Mermaid tool",
            enabled: false,
            tool_input: {},
          },
          gitMcpAgent: {
            description: "GitHub tool",
            enabled: true,
            tool_input: {
              parameter_description: "GitHub query",
            },
          },
        },
      };

      const builder = new AgentToolBuilder(config, mockConfigLoader);
      const tools = builder.buildTools(mockDataStream, mockUser, chatId);

      // Act
      const result = await tools?.gitMcpAgent.execute({
        input: "get repository info",
      });

      // Assert
      expect(mockGitMcpAgent.isReady).toHaveBeenCalled();
      expect(mockGitMcpAgent.execute).not.toHaveBeenCalled();
      expect(result).toContain(
        "Error: GitHub MCP Agent is not properly configured"
      );
    });
  });

  describe("Error Handling in Tool Execution", () => {
    it("should handle errors in providerToolsAgent execution", async () => {
      // Arrange
      const mockProviderToolsAgent = {
        execute: vi
          .fn()
          .mockRejectedValue(new Error("Provider tools execution failed")),
      };

      vi.mocked(mockConfigLoader.getProviderToolsAgent).mockReturnValue(
        mockProviderToolsAgent as any
      );
      vi.mocked(mockConfigLoader.getProviderToolsConfig).mockReturnValue({
        enabled: true,
      });

      const config: ChatModelAgentConfig = {
        enabled: true,
        systemPrompt: "Test prompt",
        rateLimit: { perMinute: 10, perHour: 100, perDay: 1000 },
        availableModels: [],
        tools: {
          providerToolsAgent: {
            description: "Provider tools",
            enabled: true,
            tool_input: {
              parameter_description: "Search query",
            },
          },
          documentAgent: {
            description: "Document tool",
            enabled: false,
            tool_input: {},
          },
          pythonAgent: {
            description: "Python tool",
            enabled: false,
            tool_input: {},
          },
          mermaidAgent: {
            description: "Mermaid tool",
            enabled: false,
            tool_input: {},
          },
          gitMcpAgent: {
            description: "GitHub tool",
            enabled: false,
            tool_input: {},
          },
        },
      };

      const builder = new AgentToolBuilder(config, mockConfigLoader);
      const tools = builder.buildTools(mockDataStream, mockUser, chatId);

      // Act & Assert
      await expect(
        tools?.providerToolsAgent.execute({ input: "test query" })
      ).rejects.toThrow("Provider tools execution failed");
    });

    it("should handle errors in documentAgent execution", async () => {
      // Arrange
      const mockDocumentAgent = {
        execute: vi
          .fn()
          .mockRejectedValue(new Error("Document agent execution failed")),
      };

      vi.mocked(mockConfigLoader.getDocumentAgentStreaming).mockReturnValue(
        mockDocumentAgent as any
      );
      vi.mocked(mockConfigLoader.getDocumentAgentConfig).mockReturnValue({
        enabled: true,
      });

      const config: ChatModelAgentConfig = {
        enabled: true,
        systemPrompt: "Test prompt",
        rateLimit: { perMinute: 10, perHour: 100, perDay: 1000 },
        availableModels: [],
        tools: {
          providerToolsAgent: {
            description: "Provider tools",
            enabled: false,
            tool_input: {},
          },
          documentAgent: {
            description: "Document tool",
            enabled: true,
            tool_input: {
              operation: { parameter_description: "Operation" },
              instruction: { parameter_description: "Instruction" },
              documentId: { parameter_description: "Document ID" },
              targetVersion: { parameter_description: "Version" },
            },
          },
          pythonAgent: {
            description: "Python tool",
            enabled: false,
            tool_input: {},
          },
          mermaidAgent: {
            description: "Mermaid tool",
            enabled: false,
            tool_input: {},
          },
          gitMcpAgent: {
            description: "GitHub tool",
            enabled: false,
            tool_input: {},
          },
        },
      };

      const builder = new AgentToolBuilder(config, mockConfigLoader);
      const tools = builder.buildTools(mockDataStream, mockUser, chatId);

      // Act & Assert
      await expect(
        tools?.documentAgent.execute({
          operation: "create",
          instruction: "test",
        })
      ).rejects.toThrow("Document agent execution failed");
    });

    it("should handle errors in gitMcpAgent execution", async () => {
      // Arrange
      const mockGitMcpAgent = {
        execute: vi.fn().mockResolvedValue({
          success: false,
          error: "GitHub API error",
        }),
        isReady: vi.fn().mockReturnValue(true),
      };

      vi.mocked(mockConfigLoader.getGitMcpAgent).mockReturnValue(
        mockGitMcpAgent as any
      );
      vi.mocked(mockConfigLoader.getGitMcpAgentConfig).mockReturnValue({
        enabled: true,
      });

      const config: ChatModelAgentConfig = {
        enabled: true,
        systemPrompt: "Test prompt",
        rateLimit: { perMinute: 10, perHour: 100, perDay: 1000 },
        availableModels: [],
        tools: {
          providerToolsAgent: {
            description: "Provider tools",
            enabled: false,
            tool_input: {},
          },
          documentAgent: {
            description: "Document tool",
            enabled: false,
            tool_input: {},
          },
          pythonAgent: {
            description: "Python tool",
            enabled: false,
            tool_input: {},
          },
          mermaidAgent: {
            description: "Mermaid tool",
            enabled: false,
            tool_input: {},
          },
          gitMcpAgent: {
            description: "GitHub tool",
            enabled: true,
            tool_input: {
              parameter_description: "GitHub query",
            },
          },
        },
      };

      const builder = new AgentToolBuilder(config, mockConfigLoader);
      const tools = builder.buildTools(mockDataStream, mockUser, chatId);

      // Act
      const result = await tools?.gitMcpAgent.execute({
        input: "get repository info",
      });

      // Assert
      expect(result).toContain("Error: GitHub API error");
    });

    it("should validate error code type in thrown errors", () => {
      // Arrange
      const mockProviderToolsAgent = {
        execute: vi.fn().mockResolvedValue({ output: "search results" }),
      };

      vi.mocked(mockConfigLoader.getProviderToolsAgent).mockReturnValue(
        mockProviderToolsAgent as any
      );
      vi.mocked(mockConfigLoader.getProviderToolsConfig).mockReturnValue({
        enabled: true,
      });

      const config: ChatModelAgentConfig = {
        enabled: true,
        systemPrompt: "Test prompt",
        rateLimit: { perMinute: 10, perHour: 100, perDay: 1000 },
        availableModels: [],
        tools: {
          providerToolsAgent: {
            description: "", // Invalid
            enabled: true,
            tool_input: {
              parameter_description: "Search query",
            },
          },
          documentAgent: {
            description: "Document tool",
            enabled: false,
            tool_input: {},
          },
          pythonAgent: {
            description: "Python tool",
            enabled: false,
            tool_input: {},
          },
          mermaidAgent: {
            description: "Mermaid tool",
            enabled: false,
            tool_input: {},
          },
          gitMcpAgent: {
            description: "GitHub tool",
            enabled: false,
            tool_input: {},
          },
        },
      };

      const builder = new AgentToolBuilder(config, mockConfigLoader);

      // Act & Assert
      try {
        builder.buildTools(mockDataStream, mockUser, chatId);
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(AgentError);
        const agentError = error as AgentError;
        expect(agentError.code).toBe(ErrorCodes.INVALID_CONFIGURATION);
      }
    });
  });
});
