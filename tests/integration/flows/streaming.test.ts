/**
 * Integration tests for streaming functionality
 * Tests document, Python, and Mermaid streaming with interruption and resumption
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GoogleDocumentAgentStreaming } from "@/lib/ai/providers/google/document-agent-streaming";
import { GooglePythonAgentStreaming } from "@/lib/ai/providers/google/python-agent-streaming";
import { GoogleMermaidAgentStreaming } from "@/lib/ai/providers/google/mermaid-agent-streaming";
import type { UIMessageStreamWriter } from "ai";
import type { ChatMessage } from "@/lib/types";

// Mock server-only module
vi.mock("server-only", () => ({}));

// Mock logging
vi.mock("@/lib/logging/activity-logger", () => ({
  logAgentActivity: vi.fn(),
  PerformanceTracker: class {
    constructor() {}
    getDuration() { return 100; }
  },
  createCorrelationId: vi.fn(() => "test-correlation-id"),
  AgentType: {
    DOCUMENT_AGENT: "document_agent",
    PYTHON_AGENT: "python_agent",
    MERMAID_AGENT: "mermaid_agent",
  },
  AgentOperationType: {
    DOCUMENT_GENERATION: "document_generation",
    CODE_GENERATION: "code_generation",
    DIAGRAM_GENERATION: "diagram_generation",
  },
  AgentOperationCategory: {
    GENERATION: "generation",
  },
}));

// Mock AI SDK
vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: vi.fn(() => {
    return () => ({
      modelId: "gemini-2.0-flash-exp",
      provider: "google",
    });
  }),
  google: vi.fn(() => ({
    modelId: "gemini-2.0-flash-exp",
    provider: "google",
  })),
}));

vi.mock("@/lib/db/queries/document", () => ({
  saveDocument: vi.fn().mockResolvedValue("test-doc-123"),
  getDocumentById: vi.fn().mockResolvedValue({
    id: "test-doc-123",
    title: "Test Document",
    content: "This is test content",
    kind: "text",
    version_number: 2, // Current version is 2, so we can revert to version 1
    user_id: "test-user",
    chat_id: "test-chat",
  }),
  getDocumentByIdAndVersion: vi.fn().mockResolvedValue({
    id: "test-doc-123",
    title: "Test Document (Version 1)",
    content: "This is old test content",
    kind: "text",
    version_number: 1, // This is the version we're reverting to
    user_id: "test-user",
    chat_id: "test-chat",
  }),
}));

vi.mock("@/lib/db/queries/admin", () => ({
  getAdminConfig: vi.fn((params) => {
    const { configKey } = params;

    if (configKey === "document_agent_google") {
      return Promise.resolve({
        configData: {
          tools: {
            create: {
              systemPrompt: "Create a document based on the instruction.",
              userPromptTemplate: "Title: {title}\nInstruction: {instruction}",
              enabled: true,
            },
            update: {
              systemPrompt: "Update the document.",
              userPromptTemplate: "Update: {instruction}",
              enabled: true,
            },
            suggestion: {
              systemPrompt: "Generate suggestions.",
              userPromptTemplate: "Suggestions for: {instruction}",
              enabled: true,
            },
            revert: { enabled: true },
          },
        },
      });
    }

    if (configKey === "python_agent_google") {
      return Promise.resolve({
        configData: {
          tools: {
            create: {
              systemPrompt: "Generate Python code.",
              enabled: true,
            },
            update: {
              systemPrompt: "Update Python code.",
              userPromptTemplate: "Update: {instruction}",
              enabled: true,
            },
            fix: {
              systemPrompt: "Fix Python code errors.",
              userPromptTemplate: "Fix: {error}",
              enabled: true,
            },
            explain: {
              systemPrompt: "Explain Python code.",
              userPromptTemplate: "Explain: {code}",
              enabled: true,
            },
            generate: {
              systemPrompt: "Generate Python code snippet.",
              enabled: true,
            },
            revert: { enabled: true },
          },
        },
      });
    }

    if (configKey === "mermaid_agent_google") {
      return Promise.resolve({
        configData: {
          tools: {
            create: {
              systemPrompt: "Generate Mermaid diagram.",
              enabled: true,
            },
            update: {
              systemPrompt: "Update Mermaid diagram.",
              userPromptTemplate: "Update: {instruction}",
              enabled: true,
            },
            fix: {
              systemPrompt: "Fix Mermaid diagram syntax.",
              userPromptTemplate: "Fix: {error}",
              enabled: true,
            },
            generate: {
              systemPrompt: "Generate Mermaid diagram code.",
              enabled: true,
            },
            revert: { enabled: true },
          },
        },
      });
    }

    return Promise.resolve(null);
  }),
}));

// Mock streaming tools
let streamingChunks: string[] = [];
let streamInterrupted = false;
let streamResumed = false;

vi.mock("@/lib/ai/tools/document/streamTextDocument", () => ({
  streamTextDocument: vi.fn(async (params) => {
    const { dataStream, title, instruction } = params;

    // Write metadata
    dataStream.write({ type: "data-kind", data: "text", transient: true });
    dataStream.write({ type: "data-id", data: "test-doc-123", transient: true });
    dataStream.write({ type: "data-title", data: title, transient: true });
    dataStream.write({ type: "data-clear", data: null, transient: true });

    // Simulate streaming with chunks
    const content = `Document: ${instruction}`;
    const chunks = ["Doc", "ument", ": ", instruction];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      streamingChunks.push(chunk);
      dataStream.write({ type: "data-textDelta", data: chunk, transient: true });
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 10));

      // Check interruption AFTER processing at least one chunk
      if (i > 0 && streamInterrupted && !streamResumed) {
        throw new Error("Stream interrupted");
      }
    }

    dataStream.write({ type: "data-finish", data: null, transient: true });
    return "test-doc-123";
  }),
}));

vi.mock("@/lib/ai/tools/document/streamTextDocumentUpdate", () => ({
  streamTextDocumentUpdate: vi.fn(async (params) => {
    const { dataStream, documentId, updateInstruction } = params;

    dataStream.write({ type: "data-kind", data: "text", transient: true });
    dataStream.write({ type: "data-id", data: documentId, transient: true });
    dataStream.write({ type: "data-clear", data: null, transient: true });

    const chunks = ["Updated", " ", "content"];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      streamingChunks.push(chunk);
      dataStream.write({ type: "data-textDelta", data: chunk, transient: true });
      await new Promise(resolve => setTimeout(resolve, 10));

      if (i > 0 && streamInterrupted && !streamResumed) {
        throw new Error("Stream interrupted");
      }
    }

    dataStream.write({ type: "data-finish", data: null, transient: true });
  }),
}));

vi.mock("@/lib/ai/tools/python/streamPythonCode", () => ({
  streamPythonCode: vi.fn(async (params) => {
    const { dataStream, title, instruction, streamToUI } = params;

    const code = `# ${instruction}\nprint("Hello World")`;

    if (streamToUI) {
      dataStream.write({ type: "data-kind", data: "python code" });
      dataStream.write({ type: "data-id", data: "test-doc-123" });
      dataStream.write({ type: "data-title", data: title });
      dataStream.write({ type: "data-clear", data: null });

      const chunks = ["# ", instruction, "\n", 'print("Hello World")'];
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        streamingChunks.push(chunk);
        dataStream.write({ type: "data-codeDelta", data: chunk });
        await new Promise(resolve => setTimeout(resolve, 10));

        if (i > 0 && streamInterrupted && !streamResumed) {
          throw new Error("Stream interrupted");
        }
      }

      dataStream.write({ type: "data-finish", data: null });
    }

    return { documentId: "test-doc-123", content: code };
  }),
}));

vi.mock("@/lib/ai/tools/python/streamPythonCodeUpdate", () => ({
  streamPythonCodeUpdate: vi.fn(async (params) => {
    const { dataStream, codeId } = params;

    dataStream.write({ type: "data-kind", data: "python code" });
    dataStream.write({ type: "data-id", data: codeId });
    dataStream.write({ type: "data-clear", data: null });

    const chunks = ['print("Updated")'];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      streamingChunks.push(chunk);
      dataStream.write({ type: "data-codeDelta", data: chunk });
      await new Promise(resolve => setTimeout(resolve, 10));

      if (i > 0 && streamInterrupted && !streamResumed) {
        throw new Error("Stream interrupted");
      }
    }

    dataStream.write({ type: "data-finish", data: null });
  }),
}));

vi.mock("@/lib/ai/tools/python/streamPythonCodeFix", () => ({
  streamPythonCodeFix: vi.fn(async (params) => {
    const { dataStream, codeId } = params;

    dataStream.write({ type: "data-kind", data: "python code" });
    dataStream.write({ type: "data-id", data: codeId });
    dataStream.write({ type: "data-clear", data: null });

    const chunks = ['print("Fixed")'];
    for (const chunk of chunks) {
      streamingChunks.push(chunk);
      dataStream.write({ type: "data-codeDelta", data: chunk });
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    dataStream.write({ type: "data-finish", data: null });
  }),
}));

vi.mock("@/lib/ai/tools/mermaid/streamMermaidDiagram", () => ({
  streamMermaidDiagram: vi.fn(async (params) => {
    const { dataStream, title, instruction, streamToUI } = params;

    const code = `graph TD\n  A[${instruction}]`;

    if (streamToUI) {
      dataStream.write({ type: "data-kind", data: "mermaid code" });
      dataStream.write({ type: "data-id", data: "test-doc-123" });
      dataStream.write({ type: "data-title", data: title });
      dataStream.write({ type: "data-clear", data: null });

      const chunks = ["graph", " TD", "\n  ", `A[${instruction}]`];
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        streamingChunks.push(chunk);
        dataStream.write({ type: "data-codeDelta", data: chunk });
        await new Promise(resolve => setTimeout(resolve, 10));

        if (i > 0 && streamInterrupted && !streamResumed) {
          throw new Error("Stream interrupted");
        }
      }

      dataStream.write({ type: "data-finish", data: null });
    }

    return { documentId: "test-doc-123", content: code };
  }),
}));

vi.mock("@/lib/ai/tools/mermaid/streamMermaidDiagramUpdate", () => ({
  streamMermaidDiagramUpdate: vi.fn(async (params) => {
    const { dataStream, diagramId } = params;

    dataStream.write({ type: "data-kind", data: "mermaid code" });
    dataStream.write({ type: "data-id", data: diagramId });
    dataStream.write({ type: "data-clear", data: null });

    const chunks = ["graph TD\n  B[Updated]"];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      streamingChunks.push(chunk);
      dataStream.write({ type: "data-codeDelta", data: chunk });
      await new Promise(resolve => setTimeout(resolve, 10));

      if (i > 0 && streamInterrupted && !streamResumed) {
        throw new Error("Stream interrupted");
      }
    }

    dataStream.write({ type: "data-finish", data: null });
  }),
}));

vi.mock("@/lib/ai/tools/mermaid/streamMermaidDiagramFix", () => ({
  streamMermaidDiagramFix: vi.fn(async (params) => {
    const { dataStream, diagramId } = params;

    dataStream.write({ type: "data-kind", data: "mermaid code" });
    dataStream.write({ type: "data-id", data: diagramId });
    dataStream.write({ type: "data-clear", data: null });

    const chunks = ["graph TD\n  C[Fixed]"];
    for (const chunk of chunks) {
      streamingChunks.push(chunk);
      dataStream.write({ type: "data-codeDelta", data: chunk });
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    dataStream.write({ type: "data-finish", data: null });
  }),
}));

describe("Streaming Integration Tests", () => {
  let mockDataStream: UIMessageStreamWriter<ChatMessage>;
  let writtenData: Array<{ type: string; data: any; transient?: boolean }>;

  beforeEach(() => {
    // Reset state
    streamingChunks = [];
    streamInterrupted = false;
    streamResumed = false;
    writtenData = [];

    // Create mock data stream
    mockDataStream = {
      write: vi.fn((data) => {
        writtenData.push(data);
      }),
    } as any;

    vi.clearAllMocks();
  });

  afterEach(() => {
    streamingChunks = [];
    writtenData = [];
  });

  describe("Document Streaming Tests", () => {
    it("should stream document creation successfully", async () => {
      const agent = new GoogleDocumentAgentStreaming({
        enabled: true,
        systemPrompt: "Test prompt",
      });

      agent.setApiKey("test-api-key");
      agent.setModel("gemini-2.0-flash-exp");

      const result = await agent.execute({
        operation: "create",
        instruction: "Create a test document",
        dataStream: mockDataStream,
        user: { id: "test-user" } as any,
        chatId: "test-chat",
      });

      expect(result.success).toBe(true);
      expect(result.output.id).toBe("test-doc-123");
      expect(result.output.kind).toBe("text");

      // Verify streaming metadata was written
      expect(writtenData).toContainEqual(
        expect.objectContaining({ type: "data-kind", data: "text" })
      );
      expect(writtenData).toContainEqual(
        expect.objectContaining({ type: "data-id", data: "test-doc-123" })
      );
      expect(writtenData).toContainEqual(
        expect.objectContaining({ type: "data-clear" })
      );

      // Verify content was streamed in chunks
      const textDeltas = writtenData.filter(d => d.type === "data-textDelta");
      expect(textDeltas.length).toBeGreaterThan(0);

      // Verify finish event
      expect(writtenData).toContainEqual(
        expect.objectContaining({ type: "data-finish" })
      );
    });

    it("should stream document update successfully", async () => {
      const agent = new GoogleDocumentAgentStreaming({
        enabled: true,
        systemPrompt: "Test prompt",
      });

      agent.setApiKey("test-api-key");
      agent.setModel("gemini-2.0-flash-exp");

      const result = await agent.execute({
        operation: "update",
        instruction: "Update the document",
        documentId: "test-doc-123",
        dataStream: mockDataStream,
        user: { id: "test-user" } as any,
        chatId: "test-chat",
      });

      expect(result.success).toBe(true);
      expect(result.output.id).toBe("test-doc-123");
      expect(result.output.isUpdate).toBe(true);

      // Verify streaming occurred
      const textDeltas = writtenData.filter(d => d.type === "data-textDelta");
      expect(textDeltas.length).toBeGreaterThan(0);
    });

    it("should handle document revert with streaming", async () => {
      const agent = new GoogleDocumentAgentStreaming({
        enabled: true,
        systemPrompt: "Test prompt",
      });

      agent.setApiKey("test-api-key");
      agent.setModel("gemini-2.0-flash-exp");

      const result = await agent.execute({
        operation: "revert",
        instruction: "",
        documentId: "test-doc-123",
        targetVersion: 1,
        dataStream: mockDataStream,
        user: { id: "test-user" } as any,
        chatId: "test-chat",
      });

      expect(result.success).toBe(true);
      expect(result.output.isRevert).toBe(true);
      expect(result.output.revertedTo).toBe(1);

      // Verify revert metadata was written
      expect(writtenData).toContainEqual(
        expect.objectContaining({ type: "data-clear" })
      );
      expect(writtenData).toContainEqual(
        expect.objectContaining({ type: "data-finish" })
      );
    });
  });

  describe("Python Code Streaming Tests", () => {
    it("should stream Python code creation successfully", async () => {
      const agent = new GooglePythonAgentStreaming({
        enabled: true,
        systemPrompt: "Test prompt",
      });

      agent.setApiKey("test-api-key");
      agent.setModel("gemini-2.0-flash-exp");

      const result = await agent.execute({
        operation: "create",
        instruction: "Create a Python script",
        dataStream: mockDataStream,
        user: { id: "test-user" } as any,
        chatId: "test-chat",
      });

      expect(result.success).toBe(true);
      expect(result.output.id).toBe("test-doc-123");
      expect(result.output.kind).toBe("python code");

      // Verify streaming metadata
      expect(writtenData).toContainEqual(
        expect.objectContaining({ type: "data-kind", data: "python code" })
      );

      // Verify code was streamed
      const codeDeltas = writtenData.filter(d => d.type === "data-codeDelta");
      expect(codeDeltas.length).toBeGreaterThan(0);

      // Verify chunks were captured
      expect(streamingChunks.length).toBeGreaterThan(0);
    });

    it("should stream Python code update successfully", async () => {
      const agent = new GooglePythonAgentStreaming({
        enabled: true,
        systemPrompt: "Test prompt",
      });

      agent.setApiKey("test-api-key");
      agent.setModel("gemini-2.0-flash-exp");

      const result = await agent.execute({
        operation: "update",
        instruction: "Update the code",
        codeId: "test-doc-123",
        dataStream: mockDataStream,
        user: { id: "test-user" } as any,
        chatId: "test-chat",
      });

      expect(result.success).toBe(true);
      expect(result.output.isUpdate).toBe(true);

      // Verify update streamed
      const codeDeltas = writtenData.filter(d => d.type === "data-codeDelta");
      expect(codeDeltas.length).toBeGreaterThan(0);
    });

    it("should stream Python code fix successfully", async () => {
      const agent = new GooglePythonAgentStreaming({
        enabled: true,
        systemPrompt: "Test prompt",
      });

      agent.setApiKey("test-api-key");
      agent.setModel("gemini-2.0-flash-exp");

      const result = await agent.execute({
        operation: "fix",
        instruction: "Fix syntax error",
        codeId: "test-doc-123",
        dataStream: mockDataStream,
        user: { id: "test-user" } as any,
        chatId: "test-chat",
      });

      expect(result.success).toBe(true);
      expect(result.output.isFix).toBe(true);

      // Verify fix streamed
      const codeDeltas = writtenData.filter(d => d.type === "data-codeDelta");
      expect(codeDeltas.length).toBeGreaterThan(0);
    });

    it("should handle Python code revert with streaming", async () => {
      const agent = new GooglePythonAgentStreaming({
        enabled: true,
        systemPrompt: "Test prompt",
      });

      agent.setApiKey("test-api-key");
      agent.setModel("gemini-2.0-flash-exp");

      const result = await agent.execute({
        operation: "revert",
        instruction: "",
        codeId: "test-doc-123",
        targetVersion: 1,
        dataStream: mockDataStream,
        user: { id: "test-user" } as any,
        chatId: "test-chat",
      });

      expect(result.success).toBe(true);
      expect(result.output.isRevert).toBe(true);

      // Verify revert metadata
      expect(writtenData).toContainEqual(
        expect.objectContaining({ type: "data-kind", data: "python code" })
      );
    });
  });

  describe("Mermaid Diagram Streaming Tests", () => {
    it("should stream Mermaid diagram creation successfully", async () => {
      const agent = new GoogleMermaidAgentStreaming({
        enabled: true,
        systemPrompt: "Test prompt",
      });

      agent.setApiKey("test-api-key");
      agent.setModel("gemini-2.0-flash-exp");

      const result = await agent.execute({
        operation: "create",
        instruction: "Create a flowchart",
        dataStream: mockDataStream,
        user: { id: "test-user" } as any,
        chatId: "test-chat",
      });

      expect(result.success).toBe(true);
      expect(result.output.id).toBe("test-doc-123");
      expect(result.output.kind).toBe("mermaid code");

      // Verify streaming metadata
      expect(writtenData).toContainEqual(
        expect.objectContaining({ type: "data-kind", data: "mermaid code" })
      );

      // Verify diagram was streamed
      const codeDeltas = writtenData.filter(d => d.type === "data-codeDelta");
      expect(codeDeltas.length).toBeGreaterThan(0);
    });

    it("should stream Mermaid diagram update successfully", async () => {
      const agent = new GoogleMermaidAgentStreaming({
        enabled: true,
        systemPrompt: "Test prompt",
      });

      agent.setApiKey("test-api-key");
      agent.setModel("gemini-2.0-flash-exp");

      const result = await agent.execute({
        operation: "update",
        instruction: "Update the diagram",
        diagramId: "test-doc-123",
        dataStream: mockDataStream,
        user: { id: "test-user" } as any,
        chatId: "test-chat",
      });

      expect(result.success).toBe(true);
      expect(result.output.isUpdate).toBe(true);

      // Verify update streamed
      const codeDeltas = writtenData.filter(d => d.type === "data-codeDelta");
      expect(codeDeltas.length).toBeGreaterThan(0);
    });

    it("should stream Mermaid diagram fix successfully", async () => {
      const agent = new GoogleMermaidAgentStreaming({
        enabled: true,
        systemPrompt: "Test prompt",
      });

      agent.setApiKey("test-api-key");
      agent.setModel("gemini-2.0-flash-exp");

      const result = await agent.execute({
        operation: "fix",
        instruction: "Fix syntax error",
        diagramId: "test-doc-123",
        dataStream: mockDataStream,
        user: { id: "test-user" } as any,
        chatId: "test-chat",
      });

      expect(result.success).toBe(true);
      expect(result.output.isFix).toBe(true);

      // Verify fix streamed
      const codeDeltas = writtenData.filter(d => d.type === "data-codeDelta");
      expect(codeDeltas.length).toBeGreaterThan(0);
    });

    it("should handle Mermaid diagram revert with streaming", async () => {
      const agent = new GoogleMermaidAgentStreaming({
        enabled: true,
        systemPrompt: "Test prompt",
      });

      agent.setApiKey("test-api-key");
      agent.setModel("gemini-2.0-flash-exp");

      const result = await agent.execute({
        operation: "revert",
        instruction: "",
        diagramId: "test-doc-123",
        targetVersion: 1,
        dataStream: mockDataStream,
        user: { id: "test-user" } as any,
        chatId: "test-chat",
      });

      expect(result.success).toBe(true);
      expect(result.output.isRevert).toBe(true);

      // Verify revert metadata
      expect(writtenData).toContainEqual(
        expect.objectContaining({ type: "data-kind", data: "mermaid code" })
      );
    });
  });

  describe("Stream Interruption Handling Tests", () => {
    it("should detect and handle stream interruption during document creation", async () => {
      // Enable interruption after first chunk
      streamInterrupted = true;

      const agent = new GoogleDocumentAgentStreaming({
        enabled: true,
        systemPrompt: "Test prompt",
      });

      agent.setApiKey("test-api-key");
      agent.setModel("gemini-2.0-flash-exp");

      const result = await agent.execute({
        operation: "create",
        instruction: "Create a test document",
        dataStream: mockDataStream,
        user: { id: "test-user" } as any,
        chatId: "test-chat",
      });

      // Should fail due to interruption
      expect(result.success).toBe(false);
      expect(result.output).toContain("Error");

      // Verify some chunks were captured before interruption
      expect(streamingChunks.length).toBeGreaterThan(0);
      expect(streamingChunks.length).toBeLessThan(4); // Not all chunks
    });

    it("should detect stream interruption during Python code creation", async () => {
      streamInterrupted = true;

      const agent = new GooglePythonAgentStreaming({
        enabled: true,
        systemPrompt: "Test prompt",
      });

      agent.setApiKey("test-api-key");
      agent.setModel("gemini-2.0-flash-exp");

      const result = await agent.execute({
        operation: "create",
        instruction: "Create Python code",
        dataStream: mockDataStream,
        user: { id: "test-user" } as any,
        chatId: "test-chat",
      });

      expect(result.success).toBe(false);
      expect(streamingChunks.length).toBeGreaterThan(0);
    });

    it("should detect stream interruption during Mermaid diagram creation", async () => {
      streamInterrupted = true;

      const agent = new GoogleMermaidAgentStreaming({
        enabled: true,
        systemPrompt: "Test prompt",
      });

      agent.setApiKey("test-api-key");
      agent.setModel("gemini-2.0-flash-exp");

      const result = await agent.execute({
        operation: "create",
        instruction: "Create diagram",
        dataStream: mockDataStream,
        user: { id: "test-user" } as any,
        chatId: "test-chat",
      });

      expect(result.success).toBe(false);
      expect(streamingChunks.length).toBeGreaterThan(0);
    });

    it("should gracefully handle network errors during streaming", async () => {
      // Mock to throw network error
      const mockError = new Error("Network connection lost");

      const agent = new GoogleDocumentAgentStreaming({
        enabled: true,
        systemPrompt: "Test prompt",
      });

      agent.setApiKey("test-api-key");
      agent.setModel("gemini-2.0-flash-exp");

      // Trigger interruption
      streamInterrupted = true;

      const result = await agent.execute({
        operation: "create",
        instruction: "Create document",
        dataStream: mockDataStream,
        user: { id: "test-user" } as any,
        chatId: "test-chat",
      });

      expect(result.success).toBe(false);
      expect(result.output).toContain("Error");
    });
  });

  describe("Stream Resumption Tests", () => {
    it("should resume document streaming after interruption", async () => {
      // First attempt - will be interrupted
      streamInterrupted = true;

      const agent = new GoogleDocumentAgentStreaming({
        enabled: true,
        systemPrompt: "Test prompt",
      });

      agent.setApiKey("test-api-key");
      agent.setModel("gemini-2.0-flash-exp");

      const firstAttempt = await agent.execute({
        operation: "create",
        instruction: "Create document",
        dataStream: mockDataStream,
        user: { id: "test-user" } as any,
        chatId: "test-chat",
      });

      expect(firstAttempt.success).toBe(false);
      const chunksBeforeResume = streamingChunks.length;

      // Resume - disable interruption
      streamInterrupted = false;
      streamResumed = true;
      streamingChunks = []; // Reset for clean resume
      writtenData = [];
      mockDataStream.write = vi.fn((data) => writtenData.push(data)) as any;

      const secondAttempt = await agent.execute({
        operation: "create",
        instruction: "Create document",
        dataStream: mockDataStream,
        user: { id: "test-user" } as any,
        chatId: "test-chat",
      });

      expect(secondAttempt.success).toBe(true);
      expect(streamingChunks.length).toBeGreaterThan(chunksBeforeResume);

      // Verify finish event was sent
      expect(writtenData).toContainEqual(
        expect.objectContaining({ type: "data-finish" })
      );
    });

    it("should resume Python code streaming after interruption", async () => {
      streamInterrupted = true;

      const agent = new GooglePythonAgentStreaming({
        enabled: true,
        systemPrompt: "Test prompt",
      });

      agent.setApiKey("test-api-key");
      agent.setModel("gemini-2.0-flash-exp");

      const firstAttempt = await agent.execute({
        operation: "create",
        instruction: "Create Python code",
        dataStream: mockDataStream,
        user: { id: "test-user" } as any,
        chatId: "test-chat",
      });

      expect(firstAttempt.success).toBe(false);

      // Resume
      streamInterrupted = false;
      streamResumed = true;
      streamingChunks = [];
      writtenData = [];
      mockDataStream.write = vi.fn((data) => writtenData.push(data)) as any;

      const secondAttempt = await agent.execute({
        operation: "create",
        instruction: "Create Python code",
        dataStream: mockDataStream,
        user: { id: "test-user" } as any,
        chatId: "test-chat",
      });

      expect(secondAttempt.success).toBe(true);
      expect(writtenData).toContainEqual(
        expect.objectContaining({ type: "data-finish" })
      );
    });

    it("should resume Mermaid diagram streaming after interruption", async () => {
      streamInterrupted = true;

      const agent = new GoogleMermaidAgentStreaming({
        enabled: true,
        systemPrompt: "Test prompt",
      });

      agent.setApiKey("test-api-key");
      agent.setModel("gemini-2.0-flash-exp");

      const firstAttempt = await agent.execute({
        operation: "create",
        instruction: "Create diagram",
        dataStream: mockDataStream,
        user: { id: "test-user" } as any,
        chatId: "test-chat",
      });

      expect(firstAttempt.success).toBe(false);

      // Resume
      streamInterrupted = false;
      streamResumed = true;
      streamingChunks = [];
      writtenData = [];
      mockDataStream.write = vi.fn((data) => writtenData.push(data)) as any;

      const secondAttempt = await agent.execute({
        operation: "create",
        instruction: "Create diagram",
        dataStream: mockDataStream,
        user: { id: "test-user" } as any,
        chatId: "test-chat",
      });

      expect(secondAttempt.success).toBe(true);
      expect(writtenData).toContainEqual(
        expect.objectContaining({ type: "data-finish" })
      );
    });

    it("should maintain data integrity after resume", async () => {
      streamInterrupted = true;

      const agent = new GoogleDocumentAgentStreaming({
        enabled: true,
        systemPrompt: "Test prompt",
      });

      agent.setApiKey("test-api-key");
      agent.setModel("gemini-2.0-flash-exp");

      // First attempt
      await agent.execute({
        operation: "create",
        instruction: "Test content",
        dataStream: mockDataStream,
        user: { id: "test-user" } as any,
        chatId: "test-chat",
      });

      // Resume
      streamInterrupted = false;
      streamResumed = true;
      streamingChunks = [];
      writtenData = [];
      mockDataStream.write = vi.fn((data) => writtenData.push(data)) as any;

      const result = await agent.execute({
        operation: "create",
        instruction: "Test content",
        dataStream: mockDataStream,
        user: { id: "test-user" } as any,
        chatId: "test-chat",
      });

      // Verify data integrity
      expect(result.success).toBe(true);
      expect(result.output.id).toBe("test-doc-123");

      // Verify all metadata was sent
      expect(writtenData.some(d => d.type === "data-kind")).toBe(true);
      expect(writtenData.some(d => d.type === "data-id")).toBe(true);
      expect(writtenData.some(d => d.type === "data-title")).toBe(true);
      expect(writtenData.some(d => d.type === "data-clear")).toBe(true);
      expect(writtenData.some(d => d.type === "data-finish")).toBe(true);
    });
  });
});
