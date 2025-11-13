import "server-only";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { UIMessageStreamWriter } from "ai";
import type { DocumentAgentConfig } from "../../core/types";
import type { ChatMessage } from "@/lib/types";
import { streamTextDocument } from "../../tools/document/streamTextDocument";
import { streamTextDocumentUpdate } from "../../tools/document/streamTextDocumentUpdate";
import { streamDocumentSuggestions } from "../../tools/document/streamDocumentSuggestions";
import { getAdminConfig } from "@/lib/db/queries/admin";
import { getDocumentById, getDocumentByIdAndVersion, saveDocument } from "@/lib/db/queries/document";

/**
 * GoogleDocumentAgentStreaming - Simplified streaming version of document agent
 *
 * This agent handles document operations with real-time streaming:
 * - Chat agent decides the operation (create/update) and passes it directly
 * - No intermediate LLM call for operation parsing
 * - Uses streamText() for real-time content generation
 * - Streams content directly to client as LLM generates it
 */
export class GoogleDocumentAgentStreaming {
  private apiKey?: string;
  private googleProvider?: ReturnType<typeof createGoogleGenerativeAI>;
  private modelId?: string;
  private config: DocumentAgentConfig;
  private toolConfigs?: {
    create?: { systemPrompt: string; userPromptTemplate: string; enabled: boolean };
    update?: { systemPrompt: string; userPromptTemplate: string; enabled: boolean };
    suggestion?: { systemPrompt: string; userPromptTemplate: string; enabled: boolean };
    revert?: { enabled: boolean };
  };

  constructor(config: DocumentAgentConfig) {
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
      throw new Error("GoogleDocumentAgentStreaming: Configuration is required");
    }

    if (!this.config.enabled) {
      throw new Error("GoogleDocumentAgentStreaming: Agent is disabled");
    }
  }

  /**
   * Load tool configs from database configuration
   */
  private async loadToolConfigs(): Promise<void> {
    if (this.toolConfigs) return; // Already loaded

    try {
      const config = await getAdminConfig({
        configKey: 'document_agent_google'
      });

      if (config?.configData && (config.configData as any).tools) {
        const tools = (config.configData as any).tools;
        this.toolConfigs = {
          create: tools.create,
          update: tools.update,
          suggestion: tools.suggestion,
          revert: tools.revert
        };
        console.log('✅ [DOC-AGENT-STREAMING] Loaded tool configs from database');

        // Validate all required tools are present and have required fields
        if (!this.toolConfigs.create?.systemPrompt || !this.toolConfigs.create?.userPromptTemplate) {
          throw new Error('GoogleDocumentAgentStreaming: Missing systemPrompt or userPromptTemplate for create tool');
        }
        if (!this.toolConfigs.update?.systemPrompt || !this.toolConfigs.update?.userPromptTemplate) {
          throw new Error('GoogleDocumentAgentStreaming: Missing systemPrompt or userPromptTemplate for update tool');
        }
        if (!this.toolConfigs.suggestion?.systemPrompt || !this.toolConfigs.suggestion?.userPromptTemplate) {
          throw new Error('GoogleDocumentAgentStreaming: Missing systemPrompt or userPromptTemplate for suggestion tool');
        }
      } else {
        throw new Error('GoogleDocumentAgentStreaming: Tools configuration not found in database. Please ensure document_agent_google config has tools defined.');
      }
    } catch (error) {
      console.error('❌ [DOC-AGENT-STREAMING] Failed to load tool configs:', error);
      // Re-throw the error - no fallback configs allowed
      throw error;
    }
  }

  /**
   * Execute document agent with streaming
   * Operation is determined by chat agent and passed directly
   */
  async execute(params: {
    operation: 'create' | 'update' | 'revert' | 'suggestion';
    instruction: string;
    documentId?: string;
    targetVersion?: number;
    dataStream: UIMessageStreamWriter<ChatMessage>;
    user?: any;
    chatId?: string;
  }): Promise<{ output: any; success: boolean; reasoning?: string }> {
    const { operation, instruction, documentId, targetVersion, dataStream, user, chatId } = params;

    try {
      console.log('📄 [DOC-AGENT-STREAMING] Starting execution');
      console.log('📄 [DOC-AGENT-STREAMING] Operation:', operation);
      console.log('📄 [DOC-AGENT-STREAMING] Instruction:', instruction.substring(0, 200));

      // Load tool configs from database if not already loaded
      await this.loadToolConfigs();

      if (operation === 'create') {
        console.log('📄 [DOC-AGENT-STREAMING] Operation: CREATE');

        if (!this.toolConfigs?.create?.enabled) {
          throw new Error('GoogleDocumentAgentStreaming: create tool is not enabled');
        }

        const toolConfig = this.toolConfigs.create;
        if (!toolConfig.systemPrompt || !toolConfig.userPromptTemplate) {
          throw new Error('GoogleDocumentAgentStreaming: create tool configuration incomplete');
        }

        // Extract title from instruction (simple heuristic: first line or up to 100 chars)
        const title = instruction.split('\n')[0].substring(0, 100).trim();
        console.log('📄 [DOC-AGENT-STREAMING] Title:', title);

        // Stream document creation in real-time
        const documentId = await streamTextDocument({
          title,
          instruction,
          systemPrompt: toolConfig.systemPrompt,
          userPromptTemplate: toolConfig.userPromptTemplate,
          dataStream,
          user,
          chatId,
          modelId: this.modelId!,
          apiKey: this.apiKey,
        });

        console.log('✅ [DOC-AGENT-STREAMING] Document created:', documentId);

        // Return structured output for message part
        return {
          output: {
            id: documentId,
            title: title,
            kind: 'text',
          },
          success: true,
        };
      }

      if (operation === 'update') {
        console.log('📄 [DOC-AGENT-STREAMING] Operation: UPDATE');

        // Document ID should be provided by chat agent
        if (!documentId) {
          throw new Error('Document ID is required for update operations. The chat agent should extract it from artifact context and pass it explicitly.');
        }

        console.log('📄 [DOC-AGENT-STREAMING] Document ID:', documentId);

        if (!this.toolConfigs?.update?.enabled) {
          throw new Error('GoogleDocumentAgentStreaming: update tool is not enabled');
        }

        const toolConfig = this.toolConfigs.update;
        if (!toolConfig.systemPrompt || !toolConfig.userPromptTemplate) {
          throw new Error('GoogleDocumentAgentStreaming: update tool configuration incomplete');
        }

        // Stream document update in real-time
        await streamTextDocumentUpdate({
          documentId,
          updateInstruction: instruction,
          systemPrompt: toolConfig.systemPrompt,
          userPromptTemplate: toolConfig.userPromptTemplate,
          dataStream,
          user,
          chatId,
          modelId: this.modelId!,
          apiKey: this.apiKey,
        });

        console.log('✅ [DOC-AGENT-STREAMING] Document updated:', documentId);

        // Return structured output for message part
        return {
          output: {
            id: documentId,
            kind: 'text',
            isUpdate: true,
          },
          success: true,
        };
      }

      if (operation === 'revert') {
        console.log('📄 [DOC-AGENT-STREAMING] Operation: REVERT');

        // Document ID is required for revert
        if (!documentId) {
          throw new Error('Document ID is required for revert operations. The chat agent should extract it from artifact context and pass it explicitly.');
        }

        // Get current document to determine target version
        const currentDocument = await getDocumentById({ id: documentId });
        if (!currentDocument) {
          throw new Error(`Document with ID ${documentId} not found`);
        }

        console.log('📄 [DOC-AGENT-STREAMING] Current document version:', currentDocument.version_number);

        // Determine target version
        let versionToRevert = targetVersion;
        if (!versionToRevert) {
          // Default to previous version if not specified
          versionToRevert = currentDocument.version_number - 1;
          console.log('📄 [DOC-AGENT-STREAMING] No target version specified, reverting to previous:', versionToRevert);
        }

        if (versionToRevert < 1) {
          throw new Error('Cannot revert: No previous version exists');
        }

        if (versionToRevert >= currentDocument.version_number) {
          throw new Error(`Cannot revert to version ${versionToRevert}: Current version is ${currentDocument.version_number}`);
        }

        // Fetch the target version
        const targetDocument = await getDocumentByIdAndVersion({
          id: documentId,
          version: versionToRevert
        });

        if (!targetDocument) {
          throw new Error(`Version ${versionToRevert} of document ${documentId} not found`);
        }

        console.log('📄 [DOC-AGENT-STREAMING] Reverting to version:', versionToRevert);
        console.log('📄 [DOC-AGENT-STREAMING] Target content length:', targetDocument.content?.length || 0);

        // Write artifact metadata to inform UI
        dataStream.write({
          type: "data-kind",
          data: targetDocument.kind as any,
          transient: true,
        });

        dataStream.write({
          type: "data-id",
          data: documentId,
          transient: true,
        });

        dataStream.write({
          type: "data-title",
          data: targetDocument.title,
          transient: true,
        });

        // Clear the artifact panel
        dataStream.write({
          type: "data-clear",
          data: null,
          transient: true,
        });

        // Stream the reverted content to the UI
        const revertedContent = targetDocument.content || '';
        const chunkSize = 100;

        for (let i = 0; i < revertedContent.length; i += chunkSize) {
          const chunk = revertedContent.substring(i, i + chunkSize);
          dataStream.write({
            type: "data-textDelta",
            data: chunk,
            transient: true,
          });
        }

        // Save as new version (non-destructive revert)
        if (user?.id) {
          await saveDocument({
            id: documentId,
            title: targetDocument.title,
            content: revertedContent,
            kind: targetDocument.kind as any,
            userId: user.id,
            chatId: chatId || currentDocument.chat_id || undefined,
            parentVersionId: `${documentId}`,
            metadata: {
              updateType: 'revert',
              agentInfo: 'document-agent-streaming',
              revertedFrom: currentDocument.version_number,
              revertedTo: versionToRevert,
              revertedAt: new Date().toISOString(),
              modelUsed: this.modelId,
            },
          });
          console.log('✅ [DOC-AGENT-STREAMING] Document reverted and saved as new version');
        }

        // Signal streaming complete
        dataStream.write({
          type: "data-finish",
          data: null,
          transient: true,
        });

        console.log('✅ [DOC-AGENT-STREAMING] Document reverted:', documentId);

        // Return structured output for message part
        return {
          output: {
            id: documentId,
            kind: targetDocument.kind,
            isRevert: true,
            revertedFrom: currentDocument.version_number,
            revertedTo: versionToRevert,
          },
          success: true,
        };
      }

      if (operation === 'suggestion') {
        console.log('📄 [DOC-AGENT-STREAMING] Operation: SUGGESTION');

        // Document ID is required for suggestions
        if (!documentId) {
          throw new Error('Document ID is required for suggestion operations. The chat agent should extract it from artifact context and pass it explicitly.');
        }

        console.log('📄 [DOC-AGENT-STREAMING] Document ID:', documentId);

        if (!this.toolConfigs?.suggestion?.enabled) {
          throw new Error('GoogleDocumentAgentStreaming: suggestion tool is not enabled');
        }

        const toolConfig = this.toolConfigs.suggestion;
        if (!toolConfig.systemPrompt || !toolConfig.userPromptTemplate) {
          throw new Error('GoogleDocumentAgentStreaming: suggestion tool configuration incomplete');
        }

        // Generate and stream suggestions in real-time
        const result = await streamDocumentSuggestions({
          documentId,
          instruction,
          systemPrompt: toolConfig.systemPrompt,
          userPromptTemplate: toolConfig.userPromptTemplate,
          dataStream,
          user,
          chatId,
          modelId: this.modelId!,
          apiKey: this.apiKey,
        });

        console.log('✅ [DOC-AGENT-STREAMING] Suggestions generated:', result.suggestionCount);

        // Return structured output for message part
        return {
          output: {
            id: documentId,
            kind: 'text',
            isSuggestion: true,
            suggestionCount: result.suggestionCount,
          },
          success: true,
        };
      }

      throw new Error(`Unknown operation: ${operation}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('❌ [DOC-AGENT-STREAMING] Execution failed:', errorMessage);

      return {
        output: `Error: ${errorMessage}`,
        success: false,
      };
    }
  }
}
