import "server-only";

import { google, createGoogleGenerativeAI } from '@ai-sdk/google';
import { tool, type LanguageModel } from 'ai';
import { z } from 'zod';
import { GoogleProviderToolsAgent } from './provider-tools-agent';
//import { GoogleDocumentAgent } from './document-agent';
import { GoogleDocumentAgentStreaming } from './document-agent-streaming';
import { GoogleMermaidAgentStreaming } from './mermaid-agent-streaming';
import { GooglePythonAgentStreaming } from './python-agent-streaming';
import { getAdminConfig } from '@/lib/db/queries/admin';
import type { ChatModelAgentConfig } from '../../core/types';
import type {
  ChatParams
} from '../../core/types';
import {
  AgentError,
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
  private mermaidAgentStreaming?: GoogleMermaidAgentStreaming;
  private mermaidAgentConfig?: any;
  private pythonAgentStreaming?: GooglePythonAgentStreaming;
  private pythonAgentConfig?: any;

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
   * Load mermaid agent configuration
   * Public method so it can be called before building tools
   */
  async loadMermaidAgentConfig() {
    try {
      const config = await getAdminConfig({
        configKey: 'mermaid_agent_google'
      });

      if (config?.configData && (config.configData as any).enabled) {
        console.log('✅ [AGENT-INIT] Mermaid Agent loaded and enabled (STREAMING VERSION)');

        this.mermaidAgentConfig = config.configData;
        this.mermaidAgentStreaming = new GoogleMermaidAgentStreaming(config.configData as any);

        if (this.apiKey) {
          this.mermaidAgentStreaming.setApiKey(this.apiKey);
        } else {
          console.log('⚠️  [AGENT-INIT] Mermaid Agent: No API key available');
        }
      } else {
        console.log('❌ [AGENT-INIT] Mermaid Agent: disabled or not found');
      }
    } catch (error) {
      console.error('❌ [AGENT-INIT] Failed to load Mermaid Agent:', error);
      // Don't throw - tools are optional
    }
  }

  /**
   * Load python agent configuration
   * Public method so it can be called before building tools
   */
  async loadPythonAgentConfig() {
    try {
      const config = await getAdminConfig({
        configKey: 'python_agent_google'
      });

      if (config?.configData && (config.configData as any).enabled) {
        console.log('✅ [AGENT-INIT] Python Agent loaded and enabled (STREAMING VERSION)');

        this.pythonAgentConfig = config.configData;
        this.pythonAgentStreaming = new GooglePythonAgentStreaming(config.configData as any);

        if (this.apiKey) {
          this.pythonAgentStreaming.setApiKey(this.apiKey);
        } else {
          console.log('⚠️  [AGENT-INIT] Python Agent: No API key available');
        }
      } else {
        console.log('❌ [AGENT-INIT] Python Agent: disabled or not found');
      }
    } catch (error) {
      console.error('❌ [AGENT-INIT] Failed to load Python Agent:', error);
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
   * Set the model for mermaid agent
   * Call this before building tools to ensure mermaid agent uses the same model
   */
  setMermaidAgentModel(modelId: string) {
    if (this.mermaidAgentStreaming) {
      this.mermaidAgentStreaming.setModel(modelId);
    }
  }

  /**
   * Set the model for python agent
   * Call this before building tools to ensure python agent uses the same model
   */
  setPythonAgentModel(modelId: string) {
    if (this.pythonAgentStreaming) {
      this.pythonAgentStreaming.setModel(modelId);
    }
  }

  /**
   * Generate streaming chat response using AI SDK
   * This method handles all provider-specific logic including:
   * - Loading specialized agents
   * - Building tools
   * - Configuring thinking mode
   * - Creating UI message stream
   */
  async chat(params: ChatParams & {
    chatId: string;
    onFinish?: (event: { messages: any[] }) => Promise<void>;
    generateId?: () => string;
  }) {
    try {
      const { streamText, createUIMessageStream, JsonToSseTransformStream, stepCountIs } = await import('ai');

      // Load specialized agent configurations
      await this.loadProviderToolsConfig();
      await this.loadDocumentAgentConfig();
      await this.loadMermaidAgentConfig();
      await this.loadPythonAgentConfig();

      // Set the selected model for specialized agents (same model as chat)
      this.setProviderToolsModel(params.modelId);
      this.setDocumentAgentModel(params.modelId);
      this.setMermaidAgentModel(params.modelId);
      this.setPythonAgentModel(params.modelId);

      // Check if thinking mode is supported by the selected model
      const modelSupportsThinking = this.supportsThinking(params.modelId);
      const shouldEnableThinking = params.thinkingMode && modelSupportsThinking;

      // Create proper UI message stream using AI SDK
      const stream = createUIMessageStream({
        execute: ({ writer: dataStream }) => {
          // Use streamText directly with Google model from chat agent
          const model = this.getModel(params.modelId);

          // Build system prompt with tool descriptions from chat agent
          const systemPrompt = this.buildSystemPrompt();

          // Build tools from chat agent (includes provider tools and document agent if enabled)
          const tools = this.buildTools(dataStream, params.user, params.chatId);

          // Add artifact context to the first user message if available
          let messages = params.messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }));

          // Inject artifact context into the latest user message
          if (params.artifactContext && messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            if (lastMessage.role === 'user') {
              lastMessage.content = lastMessage.content + params.artifactContext;
            }
          }

          // Configure stream with Google's thinking config if enabled
          const streamConfig: any = {
            model,
            system: systemPrompt,
            messages: messages,
            temperature: 0.7,
          };

          // Add tools if available
          if (tools) {
            streamConfig.tools = tools;
            // Enable multi-step execution with stopWhen - this allows the model to:
            // 1. Call tools
            // 2. Receive tool results
            // 3. Generate a final response using those results
            streamConfig.stopWhen = stepCountIs(5); // Stop after 5 steps (tool calls + responses)
            console.log('🔧 [CHAT-AGENT] Multi-step execution enabled with stopWhen');
          }

          // Add Google-specific thinking configuration
          if (shouldEnableThinking) {
            streamConfig.providerOptions = {
              google: {
                thinkingConfig: {
                  thinkingBudget: 8192,
                  includeThoughts: true,
                },
              },
            };
          }

          console.log('🚀 [CHAT-AGENT] Starting streamText with tools:', tools ? Object.keys(tools) : 'none');
          console.log('🚀 [CHAT-AGENT] Thinking mode enabled:', shouldEnableThinking);

          const result = streamText(streamConfig);

          // Merge the AI stream into the UI message stream with reasoning enabled
          // The AI SDK will handle tool execution and streaming automatically
          dataStream.merge(
            result.toUIMessageStream({
              sendReasoning: shouldEnableThinking,
            })
          );
        },
        generateId: params.generateId,
        onFinish: async (event) => {
          if (params.onFinish) {
            await params.onFinish({ messages: event.messages });
          }
        },
        onError: () => {
          return "Oops, an error occurred!";
        },
      });

      // Return direct streaming response
      return new Response(stream.pipeThrough(new JsonToSseTransformStream()), {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-google-api-key',
        },
      });

    } catch (error) {
      console.error('Google Chat Agent error:', error);
      throw error;
    }
  }

  /**
   * Build AI SDK tools - Specialized agents are treated as individual tools
   */
  buildTools(dataStream: any, user?: any, chatId?: string): Record<string, any> | undefined {
    const tools: Record<string, any> = {};
    const enabledTools: string[] = [];

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
          operation: z.enum(['create', 'update', 'revert', 'suggestion']).describe(
            this.config.tools.documentAgent.tool_input.operation.parameter_description
          ),
          instruction: z.string().describe(
            this.config.tools.documentAgent.tool_input.instruction.parameter_description
          ),
          documentId: z.string().uuid().optional().describe(
            'UUID of the document to update, revert, or add suggestions to. Required for update, revert, and suggestion operations. Extract from artifact context when user references a specific document.'
          ),
          targetVersion: z.number().int().positive().optional().describe(
            'Target version number for revert operations. When user says "revert to version 2" or "go back to previous version", extract this number. For "previous version", use current version - 1.'
          )
        }),
        execute: async (params: { operation: 'create' | 'update' | 'revert' | 'suggestion'; instruction: string; documentId?: string; targetVersion?: number }) => {
          console.log('📄 [TOOL-CALL] Document Agent executing');
          console.log('📄 [TOOL-CALL] Operation:', params.operation);
          console.log('📄 [TOOL-CALL] Instruction:', params.instruction.substring(0, 100));
          console.log('📄 [TOOL-CALL] Document ID:', params.documentId || 'not provided');
          console.log('📄 [TOOL-CALL] Target Version:', params.targetVersion || 'not provided');

          // Execute document agent (streaming version)
          // The streaming agent handles data stream events internally
          const result = await documentAgentStreaming.execute({
            operation: params.operation,
            instruction: params.instruction,
            documentId: params.documentId,
            targetVersion: params.targetVersion,
            dataStream,
            user,
            chatId: chatId
          });

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

    // Mermaid Agent as a single tool (using streaming version)
    if (this.mermaidAgentStreaming && this.mermaidAgentConfig?.enabled && this.config.tools?.mermaidAgent?.enabled) {
      const mermaidAgentStreaming = this.mermaidAgentStreaming;

      // Check if tool description is missing and throw error
      if (!this.config.tools.mermaidAgent.description) {
        throw new AgentError(
          'google-chat',
          ErrorCodes.INVALID_CONFIGURATION,
          'mermaidAgent tool description is required when tool is enabled'
        );
      }

      // Check if tool parameter descriptions are missing and throw error
      if (!this.config.tools.mermaidAgent.tool_input?.operation?.parameter_description ||
          !this.config.tools.mermaidAgent.tool_input?.instruction?.parameter_description) {
        throw new AgentError(
          'google-chat',
          ErrorCodes.INVALID_CONFIGURATION,
          'mermaidAgent tool parameter descriptions (operation and instruction) are required when tool is enabled'
        );
      }

      tools.mermaidAgent = tool({
        description: this.config.tools.mermaidAgent.description,
        inputSchema: z.object({
          operation: z.enum(['generate', 'create', 'update', 'fix', 'revert']).describe(
            this.config.tools.mermaidAgent.tool_input.operation.parameter_description
          ),
          instruction: z.string().describe(
            this.config.tools.mermaidAgent.tool_input.instruction.parameter_description
          ),
          diagramId: z.string().uuid().optional().describe(
            'UUID of the Mermaid diagram to update, fix, or revert. Required for update, fix, and revert operations. Extract from artifact context when user references a specific diagram.'
          ),
          targetVersion: z.number().int().positive().optional().describe(
            'Target version number for revert operations. When user says "revert to version 2" or "go back to previous version", extract this number. For "previous version", use current version - 1.'
          )
        }),
        execute: async (params: { operation: 'generate' | 'create' | 'update' | 'fix' | 'revert'; instruction: string; diagramId?: string; targetVersion?: number }) => {
          console.log('🎨 [TOOL-CALL] Mermaid Agent executing');
          console.log('🎨 [TOOL-CALL] Operation:', params.operation);
          console.log('🎨 [TOOL-CALL] Instruction:', params.instruction.substring(0, 100));
          console.log('🎨 [TOOL-CALL] Diagram ID:', params.diagramId || 'not provided');
          console.log('🎨 [TOOL-CALL] Target Version:', params.targetVersion || 'not provided');

          // Execute mermaid agent (streaming version)
          // The streaming agent handles data stream events internally
          const result = await mermaidAgentStreaming.execute({
            operation: params.operation,
            instruction: params.instruction,
            diagramId: params.diagramId,
            targetVersion: params.targetVersion,
            dataStream,
            user,
            chatId: chatId
          });

          // Return the structured output from mermaid agent
          console.log('🎨 [TOOL-CALL] mermaidAgent returning type:', typeof result.output);
          console.log('🎨 [TOOL-CALL] mermaidAgent returning value:', JSON.stringify(result.output));

          // IMPORTANT: Verify the return value is JSON serializable
          if (result.output && typeof result.output === 'object') {
            // For generate mode, return the code directly
            if (result.output.generated && result.output.code) {
              console.log('🎨 [TOOL-CALL] Returning generated code');
              return { code: result.output.code, generated: true };
            }

            // For other modes, return clean metadata
            const cleanOutput = {
              id: result.output.id,
              title: result.output.title,
              kind: result.output.kind || 'mermaid code'
            };
            console.log('🎨 [TOOL-CALL] Returning cleaned output:', JSON.stringify(cleanOutput));
            return cleanOutput;
          }

          return result.output;
        }
      });
      enabledTools.push('mermaidAgent');
    }

    // Python Agent as a single tool (using streaming version)
    if (this.pythonAgentStreaming && this.pythonAgentConfig?.enabled && this.config.tools?.pythonAgent?.enabled) {
      const pythonAgentStreaming = this.pythonAgentStreaming;

      // Check if tool description is missing and throw error
      if (!this.config.tools.pythonAgent.description) {
        throw new AgentError(
          'google-chat',
          ErrorCodes.INVALID_CONFIGURATION,
          'pythonAgent tool description is required when tool is enabled'
        );
      }

      // Check if tool parameter descriptions are missing and throw error
      if (!this.config.tools.pythonAgent.tool_input?.operation?.parameter_description ||
          !this.config.tools.pythonAgent.tool_input?.instruction?.parameter_description) {
        throw new AgentError(
          'google-chat',
          ErrorCodes.INVALID_CONFIGURATION,
          'pythonAgent tool parameter descriptions (operation and instruction) are required when tool is enabled'
        );
      }

      tools.pythonAgent = tool({
        description: this.config.tools.pythonAgent.description,
        inputSchema: z.object({
          operation: z.enum(['generate', 'create', 'update', 'fix', 'explain', 'revert']).describe(
            this.config.tools.pythonAgent.tool_input.operation.parameter_description
          ),
          instruction: z.string().describe(
            this.config.tools.pythonAgent.tool_input.instruction.parameter_description
          ),
          codeId: z.string().uuid().optional().describe(
            'UUID of the Python code to update, fix, explain, or revert. Required for update, fix, explain, and revert operations. Extract from artifact context when user references a specific Python code artifact.'
          ),
          targetVersion: z.number().int().positive().optional().describe(
            'Target version number for revert operations. When user says "revert to version 2" or "go back to previous version", extract this number. For "previous version", use current version - 1.'
          )
        }),
        execute: async (params: { operation: 'generate' | 'create' | 'update' | 'fix' | 'explain' | 'revert'; instruction: string; codeId?: string; targetVersion?: number }) => {
          console.log('🐍 [TOOL-CALL] Python Agent executing');
          console.log('🐍 [TOOL-CALL] Operation:', params.operation);
          console.log('🐍 [TOOL-CALL] Instruction:', params.instruction.substring(0, 100));
          console.log('🐍 [TOOL-CALL] Code ID:', params.codeId || 'not provided');
          console.log('🐍 [TOOL-CALL] Target Version:', params.targetVersion || 'not provided');

          // Execute python agent (streaming version)
          // The streaming agent handles data stream events internally
          const result = await pythonAgentStreaming.execute({
            operation: params.operation,
            instruction: params.instruction,
            codeId: params.codeId,
            targetVersion: params.targetVersion,
            dataStream,
            user,
            chatId: chatId
          });

          // Return the structured output from python agent
          console.log('🐍 [TOOL-CALL] pythonAgent returning type:', typeof result.output);
          console.log('🐍 [TOOL-CALL] pythonAgent returning value:', JSON.stringify(result.output));

          // IMPORTANT: Verify the return value is JSON serializable
          if (result.output && typeof result.output === 'object') {
            // For generate mode, return the code directly
            if (result.output.generated && result.output.code) {
              console.log('🐍 [TOOL-CALL] Returning generated code');
              return { code: result.output.code, generated: true };
            }

            // For other modes, return clean metadata
            const cleanOutput = {
              id: result.output.id,
              title: result.output.title,
              kind: result.output.kind || 'python code'
            };
            console.log('🐍 [TOOL-CALL] Returning cleaned output:', JSON.stringify(cleanOutput));
            return cleanOutput;
          }

          return result.output;
        }
      });
      enabledTools.push('pythonAgent');
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