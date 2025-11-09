import "server-only";

import { google, createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, tool, type LanguageModel } from 'ai';
import { z } from 'zod';
import { GoogleProviderToolsAgent } from './provider-tools-agent';
//import { GoogleDocumentAgent } from './document-agent';
import { GoogleDocumentAgentStreaming } from './document-agent-streaming';
import { getAdminConfig } from '@/lib/db/queries/admin';
import type { ChatModelAgentConfig } from '../../core/types';
import type {
  ChatParams,
  StreamingResponse
} from '../../core/types';
import {
  ProviderError,
  AgentError,
  StreamingError,
  ErrorCodes
} from '../../core/errors';

/**
 * Model configuration interface for chat agent
 */
interface ModelConfig {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  isDefault?: boolean;
  thinkingEnabled?: boolean;
  supportsThinkingMode?: boolean;
  fileInputEnabled?: boolean;
  allowedFileTypes?: string[];
}

/**
 * Google Chat Agent implementation using Google AI SDK
 * Handles streaming responses with thinking mode integration
 * This is the main orchestrator agent that communicates with users
 */
export class GoogleChatAgent {
  private config: ChatModelAgentConfig;
  private apiKey?: string;
  private googleProvider?: ReturnType<typeof createGoogleGenerativeAI>;
  private providerToolsAgent?: GoogleProviderToolsAgent;
  private providerToolsConfig?: any;
  //private documentAgent?: GoogleDocumentAgent;
  private documentAgentStreaming?: GoogleDocumentAgentStreaming;
  private documentAgentConfig?: any;

  constructor(config: ChatModelAgentConfig) {
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
   * Load provider tools agent configuration
   * Public method so it can be called before building tools
   */
  async loadProviderToolsConfig() {
    try {
      const config = await getAdminConfig({
        configKey: 'provider_tools_agent_google'
      });

      if (config?.configData && (config.configData as any).enabled) {
        console.log('✅ [AGENT-INIT] Provider Tools Agent loaded and enabled');

        this.providerToolsConfig = config.configData;
        this.providerToolsAgent = new GoogleProviderToolsAgent(config.configData as any);

        if (this.apiKey) {
          this.providerToolsAgent.setApiKey(this.apiKey);
        } else {
          console.log('⚠️  [AGENT-INIT] Provider Tools Agent: No API key available');
        }
      } else {
        console.log('❌ [AGENT-INIT] Provider Tools Agent: disabled or not found');
      }
    } catch (error) {
      console.error('❌ [AGENT-INIT] Failed to load Provider Tools Agent:', error);
      // Don't throw - tools are optional
    }
  }

  /**
   * Load document agent configuration
   * Public method so it can be called before building tools
   */
  async loadDocumentAgentConfig() {
    try {
      const config = await getAdminConfig({
        configKey: 'document_agent_google'
      });

      if (config?.configData && (config.configData as any).enabled) {
        console.log('✅ [AGENT-INIT] Document Agent loaded and enabled (STREAMING VERSION)');

        this.documentAgentConfig = config.configData;
        // Use new streaming version instead of old tool-based version
        this.documentAgentStreaming = new GoogleDocumentAgentStreaming(config.configData as any);

        if (this.apiKey) {
          this.documentAgentStreaming.setApiKey(this.apiKey);
        } else {
          console.log('⚠️  [AGENT-INIT] Document Agent: No API key available');
        }
      } else {
        console.log('❌ [AGENT-INIT] Document Agent: disabled or not found');
      }
    } catch (error) {
      console.error('❌ [AGENT-INIT] Failed to load Document Agent:', error);
      // Don't throw - tools are optional
    }
  }

  /**
   * Set the model for provider tools agent
   * Call this before building tools to ensure provider tools use the same model
   */
  setProviderToolsModel(modelId: string) {
    if (this.providerToolsAgent) {
      this.providerToolsAgent.setModel(modelId);
    }
  }

  /**
   * Set the model for document agent
   * Call this before building tools to ensure document agent uses the same model
   */
  setDocumentAgentModel(modelId: string) {
    if (this.documentAgentStreaming) {
      this.documentAgentStreaming.setModel(modelId);
    }
  }

  /**
   * Generate streaming chat response
   */
  async *chat(params: ChatParams): AsyncGenerator<StreamingResponse, void, unknown> {
    try {
      // Load provider tools config if not already loaded
      if (!this.providerToolsAgent && this.apiKey) {
        await this.loadProviderToolsConfig();
      }

      // Load document agent config if not already loaded
      if (!this.documentAgentStreaming && this.apiKey) {
        await this.loadDocumentAgentConfig();
      }

      const model = this.getModel(params.modelId);
      const systemPrompt = this.buildSystemPrompt();

      // Convert messages to AI SDK format
      const messages = params.messages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      }));

      // Build tools from provider tools agent
      const tools = this.buildTools(params.dataStream, params.user);

      // Configure streaming with thinking mode if enabled
      const streamConfig: any = {
        model,
        system: systemPrompt,
        messages,
        temperature: 0.7
      };

      // Add tools if available
      if (tools) {
        streamConfig.tools = tools;
        streamConfig.maxSteps = 5; // Limit tool call iterations
      }

      // Add thinking mode middleware if enabled and supported
      if (params.thinkingMode && this.supportsThinking(params.modelId)) {
        const { extractReasoningMiddleware } = await import('ai');
        streamConfig.experimental_transform = extractReasoningMiddleware({
          tagName: "think"
        });
      }

      const result = streamText(streamConfig);

      // Stream the response
      for await (const chunk of result.textStream) {
        yield {
          content: chunk,
          finished: false
        };
      }

      // Get final result
      const finalResult = await result;

      yield {
        content: '',
        finished: true
      };

    } catch (error) {
      console.error('Google Chat Agent error:', error);
      
      if (error instanceof Error) {
        // Handle specific Google API errors
        if (error.message.includes('API key')) {
          throw new ProviderError(
            'google',
            ErrorCodes.AUTHENTICATION_FAILED,
            'Google API authentication failed. Please check your API key.',
            error
          );
        }
        
        if (error.message.includes('quota') || error.message.includes('rate limit')) {
          throw new ProviderError(
            'google',
            ErrorCodes.RATE_LIMIT_EXCEEDED,
            'Google API rate limit exceeded. Please try again later.',
            error
          );
        }
        
        if (error.message.includes('model')) {
          throw new ProviderError(
            'google',
            ErrorCodes.MODEL_NOT_SUPPORTED,
            `Model ${params.modelId} is not supported or available.`,
            error
          );
        }
      }

      throw new StreamingError(
        `Failed to generate response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Build AI SDK tools - Specialized agents are treated as individual tools
   */
  buildTools(dataStream: any, user?: any): Record<string, any> | undefined {
    const tools: Record<string, any> = {};
    const enabledTools: string[] = [];

    // Track recently created documents in this conversation for context
    const recentDocuments: Array<{id: string, title: string}> = [];

    // Provider Tools Agent as a single tool
    if (this.providerToolsAgent && this.providerToolsConfig?.enabled && this.config.tools?.providerToolsAgent?.enabled) {
      const providerToolsAgent = this.providerToolsAgent;

      // Check if tool description is missing and throw error
      if (!this.config.tools.providerToolsAgent.description) {
        throw new AgentError(
          'google-chat',
          ErrorCodes.INVALID_CONFIGURATION,
          'providerToolsAgent tool description is required when tool is enabled'
        );
      }

      // Check if tool parameter description is missing and throw error
      if (!this.config.tools.providerToolsAgent.tool_input?.parameter_description) {
        throw new AgentError(
          'google-chat',
          ErrorCodes.INVALID_CONFIGURATION,
          'providerToolsAgent tool parameter description is required when tool is enabled'
        );
      }

      tools.providerToolsAgent = tool({
        description: this.config.tools.providerToolsAgent.description,
        inputSchema: z.object({
          input: z.string().describe(this.config.tools.providerToolsAgent.tool_input.parameter_description)
        }),
        execute: async (params: { input: string }) => {
          console.log('🔧 [TOOL-CALL] Provider Tools Agent executing:', params.input.substring(0, 100));

          // Execute provider tools agent
          const result = await providerToolsAgent.execute({ input: params.input });

          // Return ONLY the output string - AI SDK will use this to continue generation
          return result.output;
        }
      });
      enabledTools.push('providerToolsAgent');
    }

    // Document Agent as a single tool (using streaming version)
    if (this.documentAgentStreaming && this.documentAgentConfig?.enabled && this.config.tools?.documentAgent?.enabled) {
      const documentAgentStreaming = this.documentAgentStreaming;

      // Check if tool description is missing and throw error
      if (!this.config.tools.documentAgent.description) {
        throw new AgentError(
          'google-chat',
          ErrorCodes.INVALID_CONFIGURATION,
          'documentAgent tool description is required when tool is enabled'
        );
      }

      // Check if tool parameter descriptions are missing and throw error
      if (!this.config.tools.documentAgent.tool_input?.operation?.parameter_description ||
          !this.config.tools.documentAgent.tool_input?.instruction?.parameter_description) {
        throw new AgentError(
          'google-chat',
          ErrorCodes.INVALID_CONFIGURATION,
          'documentAgent tool parameter descriptions (operation and instruction) are required when tool is enabled'
        );
      }

      tools.documentAgent = tool({
        description: this.config.tools.documentAgent.description,
        inputSchema: z.object({
          operation: z.enum(['create', 'update']).describe(
            this.config.tools.documentAgent.tool_input.operation.parameter_description
          ),
          instruction: z.string().describe(
            this.config.tools.documentAgent.tool_input.instruction.parameter_description
          )
        }),
        execute: async (params: { operation: 'create' | 'update'; instruction: string }) => {
          console.log('📄 [TOOL-CALL] Document Agent executing');
          console.log('📄 [TOOL-CALL] Operation:', params.operation);
          console.log('📄 [TOOL-CALL] Instruction:', params.instruction.substring(0, 100));

          // TODO: Enrich input - feature can be added here
          // Example: Add recent document context, conversation history, etc.

          // Execute document agent (streaming version)
          // The streaming agent handles data stream events internally
          const result = await documentAgentStreaming.execute({
            operation: params.operation,
            instruction: params.instruction,
            dataStream,
            user,
            chatId: undefined // chatId not available in tool context
          });

          // Track created documents if operation was successful
          if (result.success && result.output && typeof result.output === 'object') {
            const docId = result.output.id;
            const title = result.output.title;

            if (docId && title) {
              recentDocuments.push({ id: docId, title });
              console.log('📄 [CONTEXT] Tracked document:', docId, '-', title);
            }
          }

          // Return the structured output from document agent
          console.log('📄 [TOOL-CALL] documentAgent returning type:', typeof result.output);
          console.log('📄 [TOOL-CALL] documentAgent returning value:', JSON.stringify(result.output));

          // IMPORTANT: Verify the return value is JSON serializable
          if (result.output && typeof result.output === 'object') {
            // Make sure it's a plain object without circular references
            const cleanOutput = {
              id: result.output.id,
              title: result.output.title,
              kind: result.output.kind || 'text'
            };
            console.log('📄 [TOOL-CALL] Returning cleaned output:', JSON.stringify(cleanOutput));
            return cleanOutput;
          }

          return result.output;
        }
      });
      enabledTools.push('documentAgent');
    }

    if (enabledTools.length > 0) {
      console.log('🔧 [TOOLS-READY] Enabled tools:', enabledTools.join(', '));
      return tools;
    }

    console.log('⚠️  [TOOLS-READY] No tools enabled');
    return undefined;
  }

  /**
   * Build system prompt with tool descriptions
   */
  buildSystemPrompt(): string {
    let prompt = this.config.systemPrompt;

    // Add tool usage instructions if provider tools are enabled
    if (this.providerToolsAgent && this.config.tools?.providerToolsAgent?.enabled) {
      prompt += `\n\nWhen you need to search the web, analyze URLs, or execute code, use the providerToolsAgent tool. After receiving the tool result, incorporate the information into your response naturally and provide a comprehensive answer to the user.`;
    }

    // Add tool usage instructions if document agent is enabled (streaming version)
    if (this.documentAgentStreaming && this.config.tools?.documentAgent?.enabled) {
      prompt += `\n\nWhen you need to create or update documents, reports, or spreadsheets, use the documentAgent tool. This includes:
- Creating text documents with markdown formatting
- Updating existing text documents
- Creating spreadsheets with CSV data
- Updating existing spreadsheets

The document will be streamed in real-time to the user's artifact panel. After the document agent completes, inform the user about what was created or updated.`;
    }

    return prompt;
  }

  /**
   * Get the appropriate Google model instance
   */
  getModel(modelId: string): LanguageModel {
    if (this.googleProvider) {
      return this.googleProvider(modelId);
    }

    // Fallback to environment variable if no API key is set
    return google(modelId);
  }

  /**
   * Get model configuration by ID
   */
  private getModelConfig(modelId: string): any | undefined {
    return this.config.availableModels?.find(model => model.id === modelId);
  }

  /**
   * Check if a model supports thinking mode
   */
  supportsThinking(modelId: string): boolean {
    const modelConfig = this.getModelConfig(modelId);
    return modelConfig?.thinkingEnabled || modelConfig?.supportsThinkingMode || false;
  }

  /**
   * Validate the agent configuration
   */
  private validateConfig(): void {
    if (!this.config) {
      throw new AgentError(
        'google-chat',
        ErrorCodes.INVALID_CONFIGURATION,
        'Chat agent configuration is required'
      );
    }

    if (!this.config.enabled) {
      throw new AgentError(
        'google-chat',
        ErrorCodes.AGENT_DISABLED,
        'Google chat agent is disabled'
      );
    }

    // Validate that at least one model is enabled (if availableModels is provided)
    if (this.config.availableModels) {
      const enabledModels = this.config.availableModels.filter(model => model.enabled);
      if (enabledModels.length === 0) {
        throw new AgentError(
          'google-chat',
          ErrorCodes.INVALID_CONFIGURATION,
          'No enabled models found for Google chat agent'
        );
      }
    }
  }

  /**
   * Get available models for this agent
   */
  getAvailableModels(): ModelConfig[] {
    if (!this.config.availableModels) {
      return [];
    }
    return this.config.availableModels.filter(model => model.enabled) as ModelConfig[];
  }

  /**
   * Get the default model for this agent
   */
  getDefaultModel(): ModelConfig | null {
    const availableModels = this.getAvailableModels();
    return availableModels.find(model => model.isDefault) || availableModels[0] || null;
  }

  /**
   * Check if file input is supported
   */
  supportsFileInput(modelId?: string): boolean {
    if (modelId) {
      const modelConfig = this.getModelConfig(modelId);
      if (modelConfig?.fileInputEnabled !== undefined) {
        return modelConfig.fileInputEnabled;
      }
    }

    // Fall back to provider-level settings (use optional chaining for AgentConfig)
    return (this.config as any).fileInputEnabled ||
           (this.config as any).capabilities?.fileInput ||
           false;
  }

  /**
   * Get allowed file types
   */
  getAllowedFileTypes(modelId?: string): string[] {
    if (modelId) {
      const modelConfig = this.getModelConfig(modelId);
      if (modelConfig?.allowedFileTypes) {
        return modelConfig.allowedFileTypes;
      }
    }

    // Fall back to provider-level settings (use type assertion for optional properties)
    const configWithExtras = this.config as any;

    if (configWithExtras.allowedFileTypes) {
      return configWithExtras.allowedFileTypes;
    }

    // Extract from fileInputTypes structure
    if (configWithExtras.fileInputTypes) {
      const allowedTypes: string[] = [];

      Object.entries(configWithExtras.fileInputTypes).forEach(([category, types]: [string, any]) => {
        if (category === 'images' && types.enabled) {
          allowedTypes.push('image/*');
        } else if (category === 'pdf' && types.enabled) {
          allowedTypes.push('application/pdf');
        } else if (typeof types === 'object' && types !== null) {
          Object.entries(types).forEach(([ext, config]: [string, any]) => {
            if (config.enabled) {
              allowedTypes.push(ext);
            }
          });
        }
      });
      
      return allowedTypes;
    }

    return [];
  }
}