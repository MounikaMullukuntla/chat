import "server-only";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { UIMessageStreamWriter } from "ai";
import type { User } from "@supabase/supabase-js";
import type { ChatMessage } from "@/lib/types";
import { getAdminConfig } from "@/lib/db/queries/admin";
import { getDocumentById, getDocumentByIdAndVersion, saveDocument } from "@/lib/db/queries/document";
import { streamPythonCode } from "../../tools/python/streamPythonCode";
import { streamPythonCodeUpdate } from "../../tools/python/streamPythonCodeUpdate";
import { streamPythonCodeFix } from "../../tools/python/streamPythonCodeFix";

// Agent config interface
interface PythonAgentConfig {
  systemPrompt: string;
  enabled: boolean;
  tools?: Record<string, { description: string; enabled: boolean; }>;
}

/**
 * GooglePythonAgentStreaming - Handles all Python code operations with streaming
 *
 * This agent supports 6 modes of operation:
 * 1. Chat-only code - Handled by chat agent directly (not this agent)
 * 2. Generate - Generate Python code and return (non-streaming to UI)
 * 3. Create - Create new Python code artifact with streaming
 * 4. Update - Update existing code with streaming
 * 5. Fix - Fix errors with streaming
 * 6. Revert - Restore previous version (non-destructive)
 */
export class GooglePythonAgentStreaming {
  private apiKey?: string;
  private googleProvider?: ReturnType<typeof createGoogleGenerativeAI>;
  private modelId?: string;
  private config: PythonAgentConfig;
  private toolConfigs?: {
    create?: { systemPrompt: string; enabled: boolean };
    update?: { systemPrompt: string; userPromptTemplate: string; enabled: boolean };
    fix?: { systemPrompt: string; userPromptTemplate: string; enabled: boolean };
    explain?: { systemPrompt: string; userPromptTemplate: string; enabled: boolean };
    generate?: { systemPrompt: string; enabled: boolean };
    revert?: { enabled: boolean };
  };

  constructor(config: PythonAgentConfig) {
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
      throw new Error("GooglePythonAgentStreaming: Configuration is required");
    }

    if (!this.config.enabled) {
      throw new Error("GooglePythonAgentStreaming: Agent is disabled");
    }
  }

  /**
   * Load tool configs from database configuration
   */
  private async loadToolConfigs(): Promise<void> {
    if (this.toolConfigs) return; // Already loaded

    try {
      const config = await getAdminConfig({
        configKey: 'python_agent_google'
      });

      if (config?.configData && (config.configData as any).tools) {
        const tools = (config.configData as any).tools;
        this.toolConfigs = {
          create: tools.create,
          update: tools.update,
          fix: tools.fix,
          explain: tools.explain,
          generate: tools.generate,
          revert: tools.revert
        };
        console.log('✅ [PYTHON-AGENT-STREAMING] Loaded tool configs from database');

        // Validate required tools have required fields
        if (!this.toolConfigs.create?.systemPrompt) {
          throw new Error('GooglePythonAgentStreaming: Missing systemPrompt for create tool');
        }
        if (!this.toolConfigs.update?.systemPrompt || !this.toolConfigs.update?.userPromptTemplate) {
          throw new Error('GooglePythonAgentStreaming: Missing systemPrompt or userPromptTemplate for update tool');
        }
        if (!this.toolConfigs.fix?.systemPrompt || !this.toolConfigs.fix?.userPromptTemplate) {
          throw new Error('GooglePythonAgentStreaming: Missing systemPrompt or userPromptTemplate for fix tool');
        }
        if (!this.toolConfigs.explain?.systemPrompt || !this.toolConfigs.explain?.userPromptTemplate) {
          throw new Error('GooglePythonAgentStreaming: Missing systemPrompt or userPromptTemplate for explain tool');
        }
        if (!this.toolConfigs.generate?.systemPrompt) {
          throw new Error('GooglePythonAgentStreaming: Missing systemPrompt for generate tool');
        }
      } else {
        throw new Error('GooglePythonAgentStreaming: Tools configuration not found in database. Please ensure python_agent_google config has tools defined.');
      }
    } catch (error) {
      console.error('❌ [PYTHON-AGENT-STREAMING] Failed to load tool configs:', error);
      // Re-throw the error - no fallback configs allowed
      throw error;
    }
  }

  /**
   * Execute Python agent with streaming
   * Operation is determined by chat agent and passed directly
   */
  async execute(params: {
    operation: 'generate' | 'create' | 'update' | 'fix' | 'explain' | 'revert';
    instruction: string;
    codeId?: string;
    targetVersion?: number;
    dataStream: UIMessageStreamWriter<ChatMessage>;
    user?: User;
    chatId?: string;
  }): Promise<{ output: any; success: boolean }> {
    const { operation, instruction, codeId, targetVersion, dataStream, user, chatId } = params;

    try {
      console.log('🐍 [PYTHON-AGENT-STREAMING] Starting execution');
      console.log('🐍 [PYTHON-AGENT-STREAMING] Operation:', operation);
      console.log('🐍 [PYTHON-AGENT-STREAMING] Instruction:', instruction.substring(0, 200));

      // Load prompts from database if not already loaded
      await this.loadToolConfigs();

      if (operation === 'generate') {
        return await this.handleGenerate({ instruction });
      }

      if (operation === 'create') {
        return await this.handleCreate({ instruction, dataStream, user, chatId });
      }

      if (operation === 'update') {
        return await this.handleUpdate({ codeId: codeId!, instruction, dataStream, user, chatId });
      }

      if (operation === 'fix') {
        return await this.handleFix({ codeId: codeId!, instruction, dataStream, user, chatId });
      }

      if (operation === 'explain') {
        return await this.handleExplain({ codeId: codeId!, instruction, dataStream, user, chatId });
      }

      if (operation === 'revert') {
        return await this.handleRevert({ codeId: codeId!, targetVersion, dataStream, user, chatId });
      }

      throw new Error(`Unknown operation: ${operation}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('❌ [PYTHON-AGENT-STREAMING] Execution failed:', errorMessage);

      return {
        output: `Error: ${errorMessage}`,
        success: false,
      };
    }
  }

  /**
   * Mode 2: Generate - Generate Python code and return (non-streaming to UI)
   */
  private async handleGenerate(params: {
    instruction: string;
  }): Promise<{ output: any; success: boolean }> {
    const { instruction } = params;

    console.log('🐍 [PYTHON-AGENT-STREAMING] Operation: GENERATE');

    if (!this.toolConfigs?.generate?.enabled) {
      throw new Error('GooglePythonAgentStreaming: generate tool is not enabled');
    }

    const toolConfig = this.toolConfigs.generate;
    if (!toolConfig.systemPrompt) {
      throw new Error('GooglePythonAgentStreaming: generate tool configuration incomplete');
    }

    const systemPrompt = toolConfig.systemPrompt;
    const title = instruction.split('\n')[0].substring(0, 100).trim() || 'Python Code';

    // Use streamPythonCode tool with streamToUI=false
    const result = await streamPythonCode({
      title,
      instruction,
      systemPrompt,
      dataStream: {} as any, // Not used in generate mode
      modelId: this.modelId!,
      apiKey: this.apiKey,
      streamToUI: false, // Key difference: don't stream to UI
    });

    console.log('✅ [PYTHON-AGENT-STREAMING] Code generated (non-streaming)');

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
   * Mode 3: Create - Create new Python code artifact with streaming
   */
  private async handleCreate(params: {
    instruction: string;
    dataStream: UIMessageStreamWriter<ChatMessage>;
    user?: User;
    chatId?: string;
  }): Promise<{ output: any; success: boolean }> {
    const { instruction, dataStream, user, chatId } = params;

    console.log('🐍 [PYTHON-AGENT-STREAMING] Operation: CREATE');

    if (!this.toolConfigs?.create?.enabled) {
      throw new Error('GooglePythonAgentStreaming: create tool is not enabled');
    }

    const toolConfig = this.toolConfigs.create;
    if (!toolConfig.systemPrompt) {
      throw new Error('GooglePythonAgentStreaming: create tool configuration incomplete');
    }

    // Extract title from instruction
    const title = instruction.split('\n')[0].substring(0, 100).trim() || 'Python Code';
    const systemPrompt = toolConfig.systemPrompt;

    // Use streamPythonCode tool
    const result = await streamPythonCode({
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

    console.log('✅ [PYTHON-AGENT-STREAMING] Code created:', result.documentId);

    return {
      output: {
        id: result.documentId,
        title: title,
        kind: 'python code',
      },
      success: true,
    };
  }

  /**
   * Mode 4: Update - Update existing code with streaming
   */
  private async handleUpdate(params: {
    codeId: string;
    instruction: string;
    dataStream: UIMessageStreamWriter<ChatMessage>;
    user?: User;
    chatId?: string;
  }): Promise<{ output: any; success: boolean }> {
    const { codeId, instruction, dataStream, user, chatId } = params;

    console.log('🐍 [PYTHON-AGENT-STREAMING] Operation: UPDATE');
    console.log('🐍 [PYTHON-AGENT-STREAMING] Code ID:', codeId);

    if (!this.toolConfigs?.update?.enabled) {
      throw new Error('GooglePythonAgentStreaming: update tool is not enabled');
    }

    const toolConfig = this.toolConfigs.update;
    if (!toolConfig.systemPrompt || !toolConfig.userPromptTemplate) {
      throw new Error('GooglePythonAgentStreaming: update tool configuration incomplete');
    }

    // Use streamPythonCodeUpdate tool
    await streamPythonCodeUpdate({
      codeId,
      updateInstruction: instruction,
      systemPrompt: toolConfig.systemPrompt,
      userPromptTemplate: toolConfig.userPromptTemplate,
      dataStream,
      user,
      chatId,
      modelId: this.modelId!,
      apiKey: this.apiKey,
    });

    console.log('✅ [PYTHON-AGENT-STREAMING] Code updated:', codeId);

    return {
      output: {
        id: codeId,
        kind: 'python code',
        isUpdate: true,
      },
      success: true,
    };
  }

  /**
   * Mode 5: Fix - Fix errors with streaming
   */
  private async handleFix(params: {
    codeId: string;
    instruction: string;
    dataStream: UIMessageStreamWriter<ChatMessage>;
    user?: User;
    chatId?: string;
  }): Promise<{ output: any; success: boolean }> {
    const { codeId, instruction, dataStream, user, chatId } = params;

    console.log('🐍 [PYTHON-AGENT-STREAMING] Operation: FIX');
    console.log('🐍 [PYTHON-AGENT-STREAMING] Code ID:', codeId);

    if (!this.toolConfigs?.fix?.enabled) {
      throw new Error('GooglePythonAgentStreaming: fix tool is not enabled');
    }

    const toolConfig = this.toolConfigs.fix;
    if (!toolConfig.systemPrompt || !toolConfig.userPromptTemplate) {
      throw new Error('GooglePythonAgentStreaming: fix tool configuration incomplete');
    }

    // Use streamPythonCodeFix tool
    await streamPythonCodeFix({
      codeId,
      errorInfo: instruction,
      systemPrompt: toolConfig.systemPrompt,
      userPromptTemplate: toolConfig.userPromptTemplate,
      dataStream,
      user,
      chatId,
      modelId: this.modelId!,
      apiKey: this.apiKey,
    });

    console.log('✅ [PYTHON-AGENT-STREAMING] Code fixed:', codeId);

    return {
      output: {
        id: codeId,
        kind: 'python code',
        isFix: true,
      },
      success: true,
    };
  }

  /**
   * Mode 6: Explain - Add comments to explain the code
   */
  private async handleExplain(params: {
    codeId: string;
    instruction: string;
    dataStream: UIMessageStreamWriter<ChatMessage>;
    user?: User;
    chatId?: string;
  }): Promise<{ output: any; success: boolean }> {
    const { codeId, instruction, dataStream, user, chatId } = params;

    console.log('🐍 [PYTHON-AGENT-STREAMING] Operation: EXPLAIN');
    console.log('🐍 [PYTHON-AGENT-STREAMING] Code ID:', codeId);

    if (!this.toolConfigs?.explain?.enabled) {
      throw new Error('GooglePythonAgentStreaming: explain tool is not enabled');
    }

    const toolConfig = this.toolConfigs.explain;
    if (!toolConfig.systemPrompt || !toolConfig.userPromptTemplate) {
      throw new Error('GooglePythonAgentStreaming: explain tool configuration incomplete');
    }

    // Use streamPythonCodeUpdate with explain-specific system prompt
    await streamPythonCodeUpdate({
      codeId,
      updateInstruction: instruction || "Add detailed comments to explain what this code does, including function purposes, complex logic, and key implementation details.",
      systemPrompt: toolConfig.systemPrompt,
      userPromptTemplate: toolConfig.userPromptTemplate,
      dataStream,
      user,
      chatId,
      modelId: this.modelId!,
      apiKey: this.apiKey,
      metadata: {
        updateType: 'explain',
      }
    });

    console.log('✅ [PYTHON-AGENT-STREAMING] Code explained:', codeId);

    return {
      output: {
        id: codeId,
        kind: 'python code',
        isExplain: true,
      },
      success: true,
    };
  }

  /**
   * Mode 7: Revert - Restore previous version (non-destructive)
   */
  private async handleRevert(params: {
    codeId: string;
    targetVersion?: number;
    dataStream: UIMessageStreamWriter<ChatMessage>;
    user?: User;
    chatId?: string;
  }): Promise<{ output: any; success: boolean }> {
    const { codeId, targetVersion, dataStream, user, chatId } = params;

    console.log('🐍 [PYTHON-AGENT-STREAMING] Operation: REVERT');
    console.log('🐍 [PYTHON-AGENT-STREAMING] Code ID:', codeId);

    // Get current document to determine target version
    const currentDocument = await getDocumentById({ id: codeId });
    if (!currentDocument) {
      throw new Error(`Code with ID ${codeId} not found`);
    }

    console.log('🐍 [PYTHON-AGENT-STREAMING] Current version:', currentDocument.version_number);

    // Determine target version
    let versionToRevert = targetVersion;
    if (!versionToRevert) {
      // Default to previous version if not specified
      versionToRevert = currentDocument.version_number - 1;
      console.log('🐍 [PYTHON-AGENT-STREAMING] No target version specified, reverting to previous:', versionToRevert);
    }

    if (versionToRevert < 1) {
      throw new Error('Cannot revert: No previous version exists');
    }

    if (versionToRevert >= currentDocument.version_number) {
      throw new Error(`Cannot revert to version ${versionToRevert}: Current version is ${currentDocument.version_number}`);
    }

    // Fetch the target version
    const targetDocument = await getDocumentByIdAndVersion({
      id: codeId,
      version: versionToRevert
    });

    if (!targetDocument) {
      throw new Error(`Version ${versionToRevert} of code ${codeId} not found`);
    }

    console.log('🐍 [PYTHON-AGENT-STREAMING] Reverting to version:', versionToRevert);

    // Write artifact metadata to inform UI
    dataStream.write({
      type: "data-kind",
      data: 'python code',
    });

    dataStream.write({
      type: "data-id",
      data: codeId,
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
        id: codeId,
        title: targetDocument.title,
        content: revertedContent,
        kind: 'python code',
        userId: user.id,
        chatId: chatId || currentDocument.chat_id || undefined,
        parentVersionId: `${codeId}`,
        metadata: {
          updateType: 'revert',
          agent: 'GooglePythonAgentStreaming',
          revertedFrom: currentDocument.version_number,
          revertedTo: versionToRevert,
          revertedAt: new Date().toISOString(),
          modelUsed: this.modelId,
        },
      });
      console.log('✅ [PYTHON-AGENT-STREAMING] Code reverted and saved as new version');
    }

    // Signal streaming complete
    dataStream.write({
      type: "data-finish",
      data: null,
    });

    console.log('✅ [PYTHON-AGENT-STREAMING] Code reverted:', codeId);

    return {
      output: {
        id: codeId,
        kind: 'python code',
        isRevert: true,
        revertedFrom: currentDocument.version_number,
        revertedTo: versionToRevert,
      },
      success: true,
    };
  }
}
