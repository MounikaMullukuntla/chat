import "server-only";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { User } from "@supabase/supabase-js";
import type { UIMessageStreamWriter } from "ai";
import { getAdminConfig } from "@/lib/db/queries/admin";
import {
  getDocumentById,
  getDocumentByIdAndVersion,
  saveDocument,
} from "@/lib/db/queries/document";
import type { ChatMessage } from "@/lib/types";
import { streamMermaidDiagram } from "../../tools/mermaid/streamMermaidDiagram";
import { streamMermaidDiagramFix } from "../../tools/mermaid/streamMermaidDiagramFix";
import { streamMermaidDiagramUpdate } from "../../tools/mermaid/streamMermaidDiagramUpdate";
import {
  logAgentActivity,
  PerformanceTracker,
  createCorrelationId,
  AgentType,
  AgentOperationType,
  AgentOperationCategory,
} from "@/lib/logging/activity-logger";

// Agent config interface
type MermaidAgentConfig = {
  systemPrompt: string;
  enabled: boolean;
  tools?: Record<string, { description: string; enabled: boolean }>;
};

/**
 * GoogleMermaidAgentStreaming - Handles all Mermaid diagram operations with streaming
 *
 * This agent supports 6 modes of operation:
 * 1. Chat-only render - Handled by chat agent directly (not this agent)
 * 2. Generate - Generate diagram code and return (non-streaming to UI)
 * 3. Create - Create new diagram artifact with streaming
 * 4. Update - Update existing diagram with streaming
 * 5. Fix - Fix syntax errors with streaming
 * 6. Revert - Restore previous version (non-destructive)
 */
export class GoogleMermaidAgentStreaming {
  private apiKey?: string;
  private googleProvider?: ReturnType<typeof createGoogleGenerativeAI>;
  private modelId?: string;
  private readonly config: MermaidAgentConfig;
  private toolConfigs?: {
    create?: { systemPrompt: string; enabled: boolean };
    update?: {
      systemPrompt: string;
      userPromptTemplate: string;
      enabled: boolean;
    };
    fix?: {
      systemPrompt: string;
      userPromptTemplate: string;
      enabled: boolean;
    };
    generate?: { systemPrompt: string; enabled: boolean };
    revert?: { enabled: boolean };
  };

  constructor(config: MermaidAgentConfig) {
    this.config = config;
    this.validateConfig();
  }

  /**
   * Set the Google API key for this agent instance
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.googleProvider = createGoogleGenerativeAI({
      apiKey,
    });
  }

  /**
   * Set the model ID to use for operations
   */
  setModel(modelId: string): void {
    this.modelId = modelId;
  }

  /**
   * Validate agent configuration
   */
  private validateConfig(): void {
    if (!this.config) {
      throw new Error("GoogleMermaidAgentStreaming: Configuration is required");
    }

    if (!this.config.enabled) {
      throw new Error("GoogleMermaidAgentStreaming: Agent is disabled");
    }
  }

  /**
   * Load tool configs from database configuration
   */
  private async loadToolConfigs(): Promise<void> {
    if (this.toolConfigs) {
      return; // Already loaded
    }

    try {
      const config = await getAdminConfig({
        configKey: "mermaid_agent_google",
      });

      if (config?.configData && (config.configData as any).tools) {
        const tools = (config.configData as any).tools;
        this.toolConfigs = {
          create: tools.create,
          update: tools.update,
          fix: tools.fix,
          generate: tools.generate,
          revert: tools.revert,
        };
        console.log(
          "✅ [MERMAID-AGENT-STREAMING] Loaded tool configs from database"
        );

        // Validate required tools have required fields
        if (!this.toolConfigs.create?.systemPrompt) {
          throw new Error(
            "GoogleMermaidAgentStreaming: Missing systemPrompt for create tool"
          );
        }
        if (
          !this.toolConfigs.update?.systemPrompt ||
          !this.toolConfigs.update?.userPromptTemplate
        ) {
          throw new Error(
            "GoogleMermaidAgentStreaming: Missing systemPrompt or userPromptTemplate for update tool"
          );
        }
        if (
          !this.toolConfigs.fix?.systemPrompt ||
          !this.toolConfigs.fix?.userPromptTemplate
        ) {
          throw new Error(
            "GoogleMermaidAgentStreaming: Missing systemPrompt or userPromptTemplate for fix tool"
          );
        }
        if (!this.toolConfigs.generate?.systemPrompt) {
          throw new Error(
            "GoogleMermaidAgentStreaming: Missing systemPrompt for generate tool"
          );
        }
      } else {
        throw new Error(
          "GoogleMermaidAgentStreaming: Tools configuration not found in database. Please ensure mermaid_agent_google config has tools defined."
        );
      }
    } catch (error) {
      console.error(
        "❌ [MERMAID-AGENT-STREAMING] Failed to load tool configs:",
        error
      );
      // Re-throw the error - no fallback configs allowed
      throw error;
    }
  }

  /**
   * Execute mermaid agent with streaming
   * Operation is determined by chat agent and passed directly
   */
  async execute(params: {
    operation: "generate" | "create" | "update" | "fix" | "revert";
    instruction: string;
    diagramId?: string;
    targetVersion?: number;
    dataStream: UIMessageStreamWriter<ChatMessage>;
    user?: User;
    chatId?: string;
  }): Promise<{ output: any; success: boolean }> {
    const {
      operation,
      instruction,
      diagramId,
      targetVersion,
      dataStream,
      user,
      chatId,
    } = params;

    try {
      console.log("🎨 [MERMAID-AGENT-STREAMING] Starting execution");
      console.log("🎨 [MERMAID-AGENT-STREAMING] Operation:", operation);
      console.log(
        "🎨 [MERMAID-AGENT-STREAMING] Instruction:",
        instruction.substring(0, 200)
      );

      // Load prompts from database if not already loaded
      await this.loadToolConfigs();

      if (operation === "generate") {
        return await this.handleGenerate({ instruction });
      }

      if (operation === "create") {
        return await this.handleCreate({
          instruction,
          dataStream,
          user,
          chatId,
        });
      }

      if (operation === "update") {
        return await this.handleUpdate({
          diagramId: diagramId!,
          instruction,
          dataStream,
          user,
          chatId,
        });
      }

      if (operation === "fix") {
        return await this.handleFix({
          diagramId: diagramId!,
          instruction,
          dataStream,
          user,
          chatId,
        });
      }

      if (operation === "revert") {
        return await this.handleRevert({
          diagramId: diagramId!,
          targetVersion,
          dataStream,
          user,
          chatId,
        });
      }

      throw new Error(`Unknown operation: ${operation}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      console.error(
        "❌ [MERMAID-AGENT-STREAMING] Execution failed:",
        errorMessage
      );

      return {
        output: `Error: ${errorMessage}`,
        success: false,
      };
    }
  }

  /**
   * Mode 2: Generate - Generate diagram code and return (non-streaming to UI)
   */
  private async handleGenerate(params: {
    instruction: string;
  }): Promise<{ output: any; success: boolean }> {
    const { instruction } = params;

    console.log("🎨 [MERMAID-AGENT-STREAMING] Operation: GENERATE");

    const correlationId = createCorrelationId();
    const perfTracker = new PerformanceTracker();

    try {
      if (!this.toolConfigs?.generate?.enabled) {
        throw new Error(
          "GoogleMermaidAgentStreaming: generate tool is not enabled"
        );
      }

      const toolConfig = this.toolConfigs.generate;
      if (!toolConfig.systemPrompt) {
        throw new Error(
          "GoogleMermaidAgentStreaming: generate tool configuration incomplete"
        );
      }

      const systemPrompt = toolConfig.systemPrompt;
      const title =
        instruction.split("\n")[0].substring(0, 100).trim() || "Mermaid Diagram";

      // Use streamMermaidDiagram tool with streamToUI=false
      const result = await streamMermaidDiagram({
        title,
        instruction,
        systemPrompt,
        dataStream: {} as any, // Not used in generate mode
        modelId: this.modelId!,
        apiKey: this.apiKey,
        streamToUI: false, // Key difference: don't stream to UI
      });

      console.log(
        "✅ [MERMAID-AGENT-STREAMING] Diagram generated (non-streaming)"
      );

      // Log successful activity
      await logAgentActivity({
        agent_type: AgentType.MERMAID_AGENT,
        operation_type: AgentOperationType.DIAGRAM_GENERATION,
        operation_category: AgentOperationCategory.GENERATION,
        correlation_id: correlationId,
        metadata: {
          operation_type: "generate",
          instruction_length: instruction.length,
          content_length: result.content.length,
          streaming: false,
          model_id: this.modelId,
        },
        duration_ms: perfTracker.end(),
      });

      // Return code to chat agent
      return {
        output: {
          code: result.content,
          generated: true,
        },
        success: true,
      };
    } catch (error) {
      // Log failed activity
      await logAgentActivity({
        agent_type: AgentType.MERMAID_AGENT,
        operation_type: AgentOperationType.DIAGRAM_GENERATION,
        operation_category: AgentOperationCategory.GENERATION,
        correlation_id: correlationId,
        metadata: {
          operation_type: "generate",
          instruction_length: instruction.length,
          streaming: false,
          model_id: this.modelId,
          error_message:
            error instanceof Error ? error.message : "Unknown error",
        },
        duration_ms: perfTracker.end(),
        status: "error",
      });
      throw error;
    }
  }

  /**
   * Mode 3: Create - Create new diagram artifact with streaming
   */
  private async handleCreate(params: {
    instruction: string;
    dataStream: UIMessageStreamWriter<ChatMessage>;
    user?: User;
    chatId?: string;
  }): Promise<{ output: any; success: boolean }> {
    const { instruction, dataStream, user, chatId } = params;

    console.log("🎨 [MERMAID-AGENT-STREAMING] Operation: CREATE");

    const correlationId = createCorrelationId();
    const perfTracker = new PerformanceTracker();

    try {
      if (!this.toolConfigs?.create?.enabled) {
        throw new Error(
          "GoogleMermaidAgentStreaming: create tool is not enabled"
        );
      }

      const toolConfig = this.toolConfigs.create;
      if (!toolConfig.systemPrompt) {
        throw new Error(
          "GoogleMermaidAgentStreaming: create tool configuration incomplete"
        );
      }

      // Extract title from instruction
      const title =
        instruction.split("\n")[0].substring(0, 100).trim() || "Mermaid Diagram";
      const systemPrompt = toolConfig.systemPrompt;

      // Use streamMermaidDiagram tool
      const result = await streamMermaidDiagram({
        title,
        instruction,
        systemPrompt,
        dataStream,
        user,
        chatId,
        modelId: this.modelId!,
        apiKey: this.apiKey,
        streamToUI: true,
      });

      console.log(
        "✅ [MERMAID-AGENT-STREAMING] Diagram created:",
        result.documentId
      );

      // Log successful activity
      await logAgentActivity({
        agent_type: AgentType.MERMAID_AGENT,
        operation_type: AgentOperationType.DIAGRAM_GENERATION,
        operation_category: AgentOperationCategory.GENERATION,
        user_id: user?.id,
        correlation_id: correlationId,
        metadata: {
          operation_type: "create",
          diagram_id: result.documentId,
          instruction_length: instruction.length,
          content_length: result.content.length,
          streaming: true,
          model_id: this.modelId,
        },
        duration_ms: perfTracker.end(),
      });

      return {
        output: {
          id: result.documentId,
          title,
          kind: "mermaid code",
        },
        success: true,
      };
    } catch (error) {
      // Log failed activity
      await logAgentActivity({
        agent_type: AgentType.MERMAID_AGENT,
        operation_type: AgentOperationType.DIAGRAM_GENERATION,
        operation_category: AgentOperationCategory.GENERATION,
        user_id: user?.id,
        correlation_id: correlationId,
        metadata: {
          operation_type: "create",
          instruction_length: instruction.length,
          streaming: true,
          model_id: this.modelId,
          error_message:
            error instanceof Error ? error.message : "Unknown error",
        },
        duration_ms: perfTracker.end(),
        status: "error",
      });
      throw error;
    }
  }

  /**
   * Mode 4: Update - Update existing diagram with streaming
   */
  private async handleUpdate(params: {
    diagramId: string;
    instruction: string;
    dataStream: UIMessageStreamWriter<ChatMessage>;
    user?: User;
    chatId?: string;
  }): Promise<{ output: any; success: boolean }> {
    const { diagramId, instruction, dataStream, user, chatId } = params;

    console.log("🎨 [MERMAID-AGENT-STREAMING] Operation: UPDATE");
    console.log("🎨 [MERMAID-AGENT-STREAMING] Diagram ID:", diagramId);

    const correlationId = createCorrelationId();
    const perfTracker = new PerformanceTracker();

    try {
      if (!this.toolConfigs?.update?.enabled) {
        throw new Error(
          "GoogleMermaidAgentStreaming: update tool is not enabled"
        );
      }

      const toolConfig = this.toolConfigs.update;
      if (!toolConfig.systemPrompt || !toolConfig.userPromptTemplate) {
        throw new Error(
          "GoogleMermaidAgentStreaming: update tool configuration incomplete"
        );
      }

      // Use streamMermaidDiagramUpdate tool
      await streamMermaidDiagramUpdate({
        diagramId,
        updateInstruction: instruction,
        systemPrompt: toolConfig.systemPrompt,
        userPromptTemplate: toolConfig.userPromptTemplate,
        dataStream,
        user,
        chatId,
        modelId: this.modelId!,
        apiKey: this.apiKey,
      });

      console.log("✅ [MERMAID-AGENT-STREAMING] Diagram updated:", diagramId);

      // Get updated diagram to track content length
      const updatedDoc = await getDocumentById({ id: diagramId });
      const contentLength = updatedDoc?.content?.length || 0;

      // Log successful activity
      await logAgentActivity({
        agent_type: AgentType.MERMAID_AGENT,
        operation_type: AgentOperationType.DIAGRAM_GENERATION,
        operation_category: AgentOperationCategory.GENERATION,
        user_id: user?.id,
        correlation_id: correlationId,
        metadata: {
          operation_type: "update",
          diagram_id: diagramId,
          instruction_length: instruction.length,
          content_length: contentLength,
          streaming: true,
          model_id: this.modelId,
        },
        duration_ms: perfTracker.end(),
      });

      return {
        output: {
          id: diagramId,
          kind: "mermaid code",
          isUpdate: true,
        },
        success: true,
      };
    } catch (error) {
      // Log failed activity
      await logAgentActivity({
        agent_type: AgentType.MERMAID_AGENT,
        operation_type: AgentOperationType.DIAGRAM_GENERATION,
        operation_category: AgentOperationCategory.GENERATION,
        user_id: user?.id,
        correlation_id: correlationId,
        metadata: {
          operation_type: "update",
          diagram_id: diagramId,
          instruction_length: instruction.length,
          streaming: true,
          model_id: this.modelId,
          error_message:
            error instanceof Error ? error.message : "Unknown error",
        },
        duration_ms: perfTracker.end(),
        status: "error",
      });
      throw error;
    }
  }

  /**
   * Mode 5: Fix - Fix syntax errors with streaming
   */
  private async handleFix(params: {
    diagramId: string;
    instruction: string;
    dataStream: UIMessageStreamWriter<ChatMessage>;
    user?: User;
    chatId?: string;
  }): Promise<{ output: any; success: boolean }> {
    const { diagramId, instruction, dataStream, user, chatId } = params;

    console.log("🎨 [MERMAID-AGENT-STREAMING] Operation: FIX");
    console.log("🎨 [MERMAID-AGENT-STREAMING] Diagram ID:", diagramId);

    const correlationId = createCorrelationId();
    const perfTracker = new PerformanceTracker();

    try {
      if (!this.toolConfigs?.fix?.enabled) {
        throw new Error("GoogleMermaidAgentStreaming: fix tool is not enabled");
      }

      const toolConfig = this.toolConfigs.fix;
      if (!toolConfig.systemPrompt || !toolConfig.userPromptTemplate) {
        throw new Error(
          "GoogleMermaidAgentStreaming: fix tool configuration incomplete"
        );
      }

      // Use streamMermaidDiagramFix tool
      await streamMermaidDiagramFix({
        diagramId,
        errorInfo: instruction,
        systemPrompt: toolConfig.systemPrompt,
        userPromptTemplate: toolConfig.userPromptTemplate,
        dataStream,
        user,
        chatId,
        modelId: this.modelId!,
        apiKey: this.apiKey,
      });

      console.log("✅ [MERMAID-AGENT-STREAMING] Diagram fixed:", diagramId);

      // Get fixed diagram to track content length
      const fixedDoc = await getDocumentById({ id: diagramId });
      const contentLength = fixedDoc?.content?.length || 0;

      // Log successful activity
      await logAgentActivity({
        agent_type: AgentType.MERMAID_AGENT,
        operation_type: AgentOperationType.DIAGRAM_GENERATION,
        operation_category: AgentOperationCategory.GENERATION,
        user_id: user?.id,
        correlation_id: correlationId,
        metadata: {
          operation_type: "fix",
          diagram_id: diagramId,
          instruction_length: instruction.length,
          content_length: contentLength,
          streaming: true,
          model_id: this.modelId,
        },
        duration_ms: perfTracker.end(),
      });

      return {
        output: {
          id: diagramId,
          kind: "mermaid code",
          isFix: true,
        },
        success: true,
      };
    } catch (error) {
      // Log failed activity
      await logAgentActivity({
        agent_type: AgentType.MERMAID_AGENT,
        operation_type: AgentOperationType.DIAGRAM_GENERATION,
        operation_category: AgentOperationCategory.GENERATION,
        user_id: user?.id,
        correlation_id: correlationId,
        metadata: {
          operation_type: "fix",
          diagram_id: diagramId,
          instruction_length: instruction.length,
          streaming: true,
          model_id: this.modelId,
          error_message:
            error instanceof Error ? error.message : "Unknown error",
        },
        duration_ms: perfTracker.end(),
        status: "error",
      });
      throw error;
    }
  }

  /**
   * Mode 6: Revert - Restore previous version (non-destructive)
   */
  private async handleRevert(params: {
    diagramId: string;
    targetVersion?: number;
    dataStream: UIMessageStreamWriter<ChatMessage>;
    user?: User;
    chatId?: string;
  }): Promise<{ output: any; success: boolean }> {
    const { diagramId, targetVersion, dataStream, user, chatId } = params;

    console.log("🎨 [MERMAID-AGENT-STREAMING] Operation: REVERT");
    console.log("🎨 [MERMAID-AGENT-STREAMING] Diagram ID:", diagramId);

    const correlationId = createCorrelationId();
    const perfTracker = new PerformanceTracker();

    try {
      // Get current diagram to determine target version
      const currentDocument = await getDocumentById({ id: diagramId });
      if (!currentDocument) {
        throw new Error(`Diagram with ID ${diagramId} not found`);
      }

      console.log(
        "🎨 [MERMAID-AGENT-STREAMING] Current version:",
        currentDocument.version_number
      );

      // Determine target version
      let versionToRevert = targetVersion;
      if (!versionToRevert) {
        // Default to previous version if not specified
        versionToRevert = currentDocument.version_number - 1;
        console.log(
          "🎨 [MERMAID-AGENT-STREAMING] No target version specified, reverting to previous:",
          versionToRevert
        );
      }

      if (versionToRevert < 1) {
        throw new Error("Cannot revert: No previous version exists");
      }

      if (versionToRevert >= currentDocument.version_number) {
        throw new Error(
          `Cannot revert to version ${versionToRevert}: Current version is ${currentDocument.version_number}`
        );
      }

      // Fetch the target version
      const targetDocument = await getDocumentByIdAndVersion({
        id: diagramId,
        version: versionToRevert,
      });

      if (!targetDocument) {
        throw new Error(
          `Version ${versionToRevert} of diagram ${diagramId} not found`
        );
      }

      console.log(
        "🎨 [MERMAID-AGENT-STREAMING] Reverting to version:",
        versionToRevert
      );

      // Write artifact metadata to inform UI
      dataStream.write({
        type: "data-kind",
        data: "mermaid code",
      });

      dataStream.write({
        type: "data-id",
        data: diagramId,
      });

      dataStream.write({
        type: "data-title",
        data: targetDocument.title,
      });

      // Clear the artifact panel
      dataStream.write({
        type: "data-clear",
        data: null,
      });

      // Stream the reverted content to the UI
      const revertedContent = targetDocument.content || "";

      // Send entire content at once for code
      dataStream.write({
        type: "data-codeDelta",
        data: revertedContent,
      });

      // Save as new version (non-destructive revert)
      if (user?.id) {
        await saveDocument({
          id: diagramId,
          title: targetDocument.title,
          content: revertedContent,
          kind: "mermaid code",
          userId: user.id,
          chatId: chatId || currentDocument.chat_id || undefined,
          parentVersionId: `${diagramId}`,
          metadata: {
            updateType: "revert",
            agent: "GoogleMermaidAgentStreaming",
            revertedFrom: currentDocument.version_number,
            revertedTo: versionToRevert,
            revertedAt: new Date().toISOString(),
            modelUsed: this.modelId,
          },
        });
        console.log(
          "✅ [MERMAID-AGENT-STREAMING] Diagram reverted and saved as new version"
        );
      }

      // Signal streaming complete
      dataStream.write({
        type: "data-finish",
        data: null,
      });

      console.log("✅ [MERMAID-AGENT-STREAMING] Diagram reverted:", diagramId);

      const contentLength = revertedContent.length;

      // Log successful activity
      await logAgentActivity({
        agent_type: AgentType.MERMAID_AGENT,
        operation_type: AgentOperationType.DIAGRAM_GENERATION,
        operation_category: AgentOperationCategory.GENERATION,
        user_id: user?.id,
        correlation_id: correlationId,
        metadata: {
          operation_type: "revert",
          diagram_id: diagramId,
          target_version: versionToRevert,
          content_length: contentLength,
          streaming: true,
          model_id: this.modelId,
        },
        duration_ms: perfTracker.end(),
      });

      return {
        output: {
          id: diagramId,
          kind: "mermaid code",
          isRevert: true,
          revertedFrom: currentDocument.version_number,
          revertedTo: versionToRevert,
        },
        success: true,
      };
    } catch (error) {
      // Log failed activity
      await logAgentActivity({
        agent_type: AgentType.MERMAID_AGENT,
        operation_type: AgentOperationType.DIAGRAM_GENERATION,
        operation_category: AgentOperationCategory.GENERATION,
        user_id: user?.id,
        correlation_id: correlationId,
        metadata: {
          operation_type: "revert",
          diagram_id: diagramId,
          target_version: targetVersion,
          streaming: true,
          model_id: this.modelId,
          error_message:
            error instanceof Error ? error.message : "Unknown error",
        },
        duration_ms: perfTracker.end(),
        status: "error",
      });
      throw error;
    }
  }
}
