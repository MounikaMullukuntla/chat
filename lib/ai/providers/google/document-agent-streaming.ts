import "server-only";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { UIMessageStreamWriter } from "ai";
import type { DocumentAgentConfig } from "../../core/types";
import type { ChatMessage } from "@/lib/types";
import { streamTextDocument } from "../../tools/document/streamTextDocument";
import { streamTextDocumentUpdate } from "../../tools/document/streamTextDocumentUpdate";
import { getAdminConfig } from "@/lib/db/queries/admin";

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
  private prompts?: {
    createDocument?: string;
    updateDocument?: string;
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
   * Load prompts from database configuration
   */
  private async loadPrompts(): Promise<void> {
    if (this.prompts) return; // Already loaded

    try {
      const config = await getAdminConfig({
        configKey: 'document_agent_google'
      });

      if (config?.configData && (config.configData as any).prompts) {
        this.prompts = (config.configData as any).prompts;
        console.log('✅ [DOC-AGENT-STREAMING] Loaded prompts from database');
      } else {
        console.log('⚠️ [DOC-AGENT-STREAMING] No prompts found in config, using defaults');
        // Fallback to hardcoded prompts
        this.prompts = {
          createDocument: "You are a skilled content writer. Create comprehensive, well-structured documents based on the user's request.\n\nUse proper markdown formatting, clear sections, and professional tone.",
          updateDocument: "You are a skilled content editor. Update and improve existing documents based on user instructions.\n\nMaintain coherence and provide the COMPLETE updated document."
        };
      }
    } catch (error) {
      console.error('❌ [DOC-AGENT-STREAMING] Failed to load prompts:', error);
      // Use fallback prompts
      this.prompts = {
        createDocument: "Create a comprehensive document based on the user's request.",
        updateDocument: "Update the existing document based on user instructions."
      };
    }
  }

  /**
   * Execute document agent with streaming
   * Operation is determined by chat agent and passed directly
   */
  async execute(params: {
    operation: 'create' | 'update';
    instruction: string;
    dataStream: UIMessageStreamWriter<ChatMessage>;
    user?: any;
    chatId?: string;
  }): Promise<{ output: any; success: boolean; reasoning?: string }> {
    const { operation, instruction, dataStream, user, chatId } = params;

    try {
      console.log('📄 [DOC-AGENT-STREAMING] Starting execution');
      console.log('📄 [DOC-AGENT-STREAMING] Operation:', operation);
      console.log('📄 [DOC-AGENT-STREAMING] Instruction:', instruction.substring(0, 200));

      // Load prompts from database if not already loaded
      await this.loadPrompts();

      if (operation === 'create') {
        console.log('📄 [DOC-AGENT-STREAMING] Operation: CREATE');

        // Extract title from instruction (simple heuristic: first line or up to 100 chars)
        const title = instruction.split('\n')[0].substring(0, 100).trim();
        console.log('📄 [DOC-AGENT-STREAMING] Title:', title);

        // Get the system prompt for document creation
        const systemPrompt = this.prompts?.createDocument || "Create a comprehensive document.";

        // Stream document creation in real-time
        const documentId = await streamTextDocument({
          title,
          instruction,
          systemPrompt,
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

        // Extract document ID from instruction
        // Expected format: "Update document abc-123 to..." or just instructions if ID is in context
        const docIdMatch = instruction.match(/document\s+([a-f0-9-]{36})/i);
        const documentId = docIdMatch ? docIdMatch[1] : null;

        if (!documentId) {
          throw new Error('No document ID found in instruction. Please specify the document ID to update.');
        }

        console.log('📄 [DOC-AGENT-STREAMING] Document ID:', documentId);

        // Get the system prompt for document updates
        const systemPrompt = this.prompts?.updateDocument || "Update the existing document.";

        // Stream document update in real-time
        await streamTextDocumentUpdate({
          documentId,
          updateInstruction: instruction,
          systemPrompt,
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
