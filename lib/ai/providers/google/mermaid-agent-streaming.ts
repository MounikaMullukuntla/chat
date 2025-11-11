import "server-only";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { UIMessageStreamWriter } from "ai";
import type { User } from "@supabase/supabase-js";
import type { ChatMessage } from "@/lib/types";
import { getAdminConfig } from "@/lib/db/queries/admin";
import { getDocumentById, getDocumentByIdAndVersion, saveDocument } from "@/lib/db/queries/document";
import { streamMermaidDiagram } from "../../tools/mermaid/streamMermaidDiagram";
import { streamMermaidDiagramUpdate } from "../../tools/mermaid/streamMermaidDiagramUpdate";
import { streamMermaidDiagramFix } from "../../tools/mermaid/streamMermaidDiagramFix";

// Agent config interface
interface MermaidAgentConfig {
  systemPrompt: string;
  enabled: boolean;
  tools?: Record<string, { description: string; enabled: boolean; }>;
}

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
  private config: MermaidAgentConfig;
  private prompts?: {
    createPrompt?: string;
    updatePrompt?: string;
    fixPrompt?: string;
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
      apiKey: apiKey,
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
   * Load prompts from database configuration
   */
  private async loadPrompts(): Promise<void> {
    if (this.prompts) return; // Already loaded

    try {
      const config = await getAdminConfig({
        configKey: 'mermaid_agent_google'
      });

      if (config?.configData && (config.configData as any).prompts) {
        this.prompts = (config.configData as any).prompts;
        console.log('✅ [MERMAID-AGENT-STREAMING] Loaded prompts from database');
      } else {
        console.log('⚠️ [MERMAID-AGENT-STREAMING] No prompts found in config, using defaults');
        // Fallback to hardcoded prompts
        this.prompts = {
          createPrompt: "You are an expert at creating Mermaid diagrams. Create clear, well-structured diagrams using valid Mermaid syntax based on the user's request.",
          updatePrompt: "You are an expert at updating Mermaid diagrams. Modify the existing diagram based on user instructions while maintaining valid Mermaid syntax and structure.",
          fixPrompt: "You are an expert at fixing Mermaid diagram syntax errors. Analyze the diagram and fix any syntax errors while preserving the intended structure and meaning."
        };
      }
    } catch (error) {
      console.error('❌ [MERMAID-AGENT-STREAMING] Failed to load prompts:', error);
      // Use fallback prompts
      this.prompts = {
        createPrompt: "Create a Mermaid diagram based on the user's request.",
        updatePrompt: "Update the existing Mermaid diagram based on user instructions.",
        fixPrompt: "Fix syntax errors in the Mermaid diagram."
      };
    }
  }

  /**
   * Execute mermaid agent with streaming
   * Operation is determined by chat agent and passed directly
   */
  async execute(params: {
    operation: 'generate' | 'create' | 'update' | 'fix' | 'revert';
    instruction: string;
    diagramId?: string;
    targetVersion?: number;
    dataStream: UIMessageStreamWriter<ChatMessage>;
    user?: User;
    chatId?: string;
  }): Promise<{ output: any; success: boolean }> {
    const { operation, instruction, diagramId, targetVersion, dataStream, user, chatId } = params;

    try {
      console.log('🎨 [MERMAID-AGENT-STREAMING] Starting execution');
      console.log('🎨 [MERMAID-AGENT-STREAMING] Operation:', operation);
      console.log('🎨 [MERMAID-AGENT-STREAMING] Instruction:', instruction.substring(0, 200));

      // Load prompts from database if not already loaded
      await this.loadPrompts();

      if (operation === 'generate') {
        return await this.handleGenerate({ instruction });
      }

      if (operation === 'create') {
        return await this.handleCreate({ instruction, dataStream, user, chatId });
      }

      if (operation === 'update') {
        return await this.handleUpdate({ diagramId: diagramId!, instruction, dataStream, user, chatId });
      }

      if (operation === 'fix') {
        return await this.handleFix({ diagramId: diagramId!, instruction, dataStream, user, chatId });
      }

      if (operation === 'revert') {
        return await this.handleRevert({ diagramId: diagramId!, targetVersion, dataStream, user, chatId });
      }

      throw new Error(`Unknown operation: ${operation}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('❌ [MERMAID-AGENT-STREAMING] Execution failed:', errorMessage);

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

    console.log('🎨 [MERMAID-AGENT-STREAMING] Operation: GENERATE');

    const systemPrompt = this.prompts?.createPrompt || "Create a Mermaid diagram.";
    const title = instruction.split('\n')[0].substring(0, 100).trim() || 'Mermaid Diagram';

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

    console.log('✅ [MERMAID-AGENT-STREAMING] Diagram generated (non-streaming)');

    // Return code to chat agent
    return {
      output: {
        code: result.content,
        generated: true,
      },
      success: true,
    };
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

    console.log('🎨 [MERMAID-AGENT-STREAMING] Operation: CREATE');

    // Extract title from instruction
    const title = instruction.split('\n')[0].substring(0, 100).trim() || 'Mermaid Diagram';
    const systemPrompt = this.prompts?.createPrompt || "Create a Mermaid diagram.";

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

    console.log('✅ [MERMAID-AGENT-STREAMING] Diagram created:', result.documentId);

    return {
      output: {
        id: result.documentId,
        title: title,
        kind: 'mermaid code',
      },
      success: true,
    };
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

    console.log('🎨 [MERMAID-AGENT-STREAMING] Operation: UPDATE');
    console.log('🎨 [MERMAID-AGENT-STREAMING] Diagram ID:', diagramId);

    const systemPrompt = this.prompts?.updatePrompt || "Update the existing Mermaid diagram.";

    // Use streamMermaidDiagramUpdate tool
    await streamMermaidDiagramUpdate({
      diagramId,
      updateInstruction: instruction,
      systemPrompt,
      dataStream,
      user,
      chatId,
      modelId: this.modelId!,
      apiKey: this.apiKey,
    });

    console.log('✅ [MERMAID-AGENT-STREAMING] Diagram updated:', diagramId);

    return {
      output: {
        id: diagramId,
        kind: 'mermaid code',
        isUpdate: true,
      },
      success: true,
    };
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

    console.log('🎨 [MERMAID-AGENT-STREAMING] Operation: FIX');
    console.log('🎨 [MERMAID-AGENT-STREAMING] Diagram ID:', diagramId);

    const systemPrompt = this.prompts?.fixPrompt || "Fix syntax errors in the Mermaid diagram.";

    // Use streamMermaidDiagramFix tool
    await streamMermaidDiagramFix({
      diagramId,
      errorInfo: instruction,
      systemPrompt,
      dataStream,
      user,
      chatId,
      modelId: this.modelId!,
      apiKey: this.apiKey,
    });

    console.log('✅ [MERMAID-AGENT-STREAMING] Diagram fixed:', diagramId);

    return {
      output: {
        id: diagramId,
        kind: 'mermaid code',
        isFix: true,
      },
      success: true,
    };
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

    console.log('🎨 [MERMAID-AGENT-STREAMING] Operation: REVERT');
    console.log('🎨 [MERMAID-AGENT-STREAMING] Diagram ID:', diagramId);

    // Get current diagram to determine target version
    const currentDocument = await getDocumentById({ id: diagramId });
    if (!currentDocument) {
      throw new Error(`Diagram with ID ${diagramId} not found`);
    }

    console.log('🎨 [MERMAID-AGENT-STREAMING] Current version:', currentDocument.version_number);

    // Determine target version
    let versionToRevert = targetVersion;
    if (!versionToRevert) {
      // Default to previous version if not specified
      versionToRevert = currentDocument.version_number - 1;
      console.log('🎨 [MERMAID-AGENT-STREAMING] No target version specified, reverting to previous:', versionToRevert);
    }

    if (versionToRevert < 1) {
      throw new Error('Cannot revert: No previous version exists');
    }

    if (versionToRevert >= currentDocument.version_number) {
      throw new Error(`Cannot revert to version ${versionToRevert}: Current version is ${currentDocument.version_number}`);
    }

    // Fetch the target version
    const targetDocument = await getDocumentByIdAndVersion({
      id: diagramId,
      version: versionToRevert
    });

    if (!targetDocument) {
      throw new Error(`Version ${versionToRevert} of diagram ${diagramId} not found`);
    }

    console.log('🎨 [MERMAID-AGENT-STREAMING] Reverting to version:', versionToRevert);

    // Write artifact metadata to inform UI
    dataStream.write({
      type: "data-kind",
      data: 'mermaid code',
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
    const revertedContent = targetDocument.content || '';

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
        kind: 'mermaid code',
        userId: user.id,
        chatId: chatId || currentDocument.chat_id || undefined,
        parentVersionId: `${diagramId}`,
        metadata: {
          updateType: 'revert',
          agent: 'GoogleMermaidAgentStreaming',
          revertedFrom: currentDocument.version_number,
          revertedTo: versionToRevert,
          revertedAt: new Date().toISOString(),
          modelUsed: this.modelId,
        },
      });
      console.log('✅ [MERMAID-AGENT-STREAMING] Diagram reverted and saved as new version');
    }

    // Signal streaming complete
    dataStream.write({
      type: "data-finish",
      data: null,
    });

    console.log('✅ [MERMAID-AGENT-STREAMING] Diagram reverted:', diagramId);

    return {
      output: {
        id: diagramId,
        kind: 'mermaid code',
        isRevert: true,
        revertedFrom: currentDocument.version_number,
        revertedTo: versionToRevert,
      },
      success: true,
    };
  }
}
