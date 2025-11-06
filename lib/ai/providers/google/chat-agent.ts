import "server-only";

import { google, createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, tool, type LanguageModel } from 'ai';
import { z } from 'zod';
import { GoogleProviderToolsAgent } from './provider-tools-agent';
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
      console.log('🔧 [DEBUG] Loading provider tools config...');
      
      const config = await getAdminConfig({
        configKey: 'provider_tools_agent_google'
      });

      console.log('🔧 [DEBUG] Provider tools config loaded:', !!config);
      console.log('🔧 [DEBUG] Config data:', config?.configData);

      if (config?.configData && (config.configData as any).enabled) {
        console.log('✅ [DEBUG] Provider tools config is enabled, creating agent');
        
        this.providerToolsConfig = config.configData;
        this.providerToolsAgent = new GoogleProviderToolsAgent(config.configData as any);
        
        if (this.apiKey) {
          this.providerToolsAgent.setApiKey(this.apiKey);
          console.log('✅ [DEBUG] API key set for provider tools agent');
        } else {
          console.log('⚠️ [DEBUG] No API key available for provider tools agent');
        }
      } else {
        console.log('❌ [DEBUG] Provider tools config not enabled or not found');
      }
    } catch (error) {
      console.error('❌ [DEBUG] Failed to load provider tools config:', error);
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
   * Generate streaming chat response
   */
  async *chat(params: ChatParams): AsyncGenerator<StreamingResponse, void, unknown> {
    try {
      console.log('🤖 [DEBUG] GoogleChatAgent.chat() called with:', {
        modelId: params.modelId,
        messageCount: params.messages.length,
        hasSystemPrompt: !!params.systemPrompt,
        thinkingMode: params.thinkingMode
      });

      // Load provider tools config if not already loaded
      if (!this.providerToolsAgent && this.apiKey) {
        await this.loadProviderToolsConfig();
      }

      const model = this.getModel(params.modelId);
      const systemPrompt = this.buildSystemPrompt();

      // Convert messages to AI SDK format
      const messages = params.messages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      }));

      console.log('🔧 [DEBUG] Prepared for streamText:', {
        model: typeof model,
        systemPromptLength: systemPrompt.length,
        messagesCount: messages.length,
        lastMessage: messages[messages.length - 1]?.content?.substring(0, 100) + '...'
      });

      // Build tools from provider tools agent
      const tools = this.buildTools(params.dataStream);

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
        console.log('🔧 [DEBUG] Tools enabled:', Object.keys(tools));
      }

      // Add thinking mode middleware if enabled and supported
      if (params.thinkingMode && this.supportsThinking(params.modelId)) {
        const { extractReasoningMiddleware } = await import('ai');
        streamConfig.experimental_transform = extractReasoningMiddleware({
          tagName: "think"
        });
      }

      console.log('🚀 [DEBUG] Starting streamText...');
      const result = streamText(streamConfig);

      // Stream the response
      let hasStarted = false;
      let chunkCount = 0;
      
      console.log('📡 [DEBUG] Starting to iterate over textStream...');
      for await (const chunk of result.textStream) {
        chunkCount++;
        
        if (!hasStarted) {
          hasStarted = true;
          console.log('✨ [DEBUG] First chunk received, streaming started');
        }

        console.log(`📦 [DEBUG] Chunk ${chunkCount}: "${chunk.substring(0, 50)}${chunk.length > 50 ? '...' : ''}"`);

        yield {
          content: chunk,
          finished: false
        };
      }

      console.log(`🏁 [DEBUG] Text stream completed. Total chunks: ${chunkCount}`);

      // Get final result
      console.log('🔚 [DEBUG] Getting final result...');
      const finalResult = await result;
      
      console.log('✅ [DEBUG] Yielding finished signal');
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
   * Build AI SDK tools - Provider Tools Agent is treated as a single tool
   */
  buildTools(dataStream: any): Record<string, any> | undefined {
    console.log('🔧 [DEBUG] buildTools() called');
    console.log('🔧 [DEBUG] Provider Tools Agent exists:', !!this.providerToolsAgent);
    console.log('🔧 [DEBUG] Provider Tools Config:', this.providerToolsConfig);
    console.log('🔧 [DEBUG] Chat Agent Config Tools:', this.config.tools);
    
    const tools: Record<string, any> = {};

    // Provider Tools Agent as a single tool
    if (this.providerToolsAgent && this.providerToolsConfig?.enabled && this.config.tools?.providerToolsAgent?.enabled) {
      console.log('✅ [DEBUG] All conditions met - adding providerToolsAgent tool');
      
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
          console.log('🚀 [DEBUG] providerToolsAgent.execute() called with params:', JSON.stringify(params, null, 2));
          console.log('🚀 [DEBUG] params type:', typeof params);
          console.log('🚀 [DEBUG] params keys:', Object.keys(params || {}));

          // Extract input from params
          const input = params.input;
          console.log('🚀 [DEBUG] Extracted input:', input);

          // Execute provider tools agent
          const result = await providerToolsAgent.execute({ input });
          console.log('🚀 [DEBUG] providerToolsAgent result:', result);
          console.log('🚀 [DEBUG] providerToolsAgent output length:', result.output?.length || 0);

          // Return ONLY the output string - AI SDK will use this to continue generation
          // The model will receive this as the tool result and generate a response
          return result.output;
        }
      });
    } else {
      console.log('❌ [DEBUG] Provider Tools Agent conditions not met:');
      console.log('  - providerToolsAgent exists:', !!this.providerToolsAgent);
      console.log('  - providerToolsConfig enabled:', this.providerToolsConfig?.enabled);
      console.log('  - config.tools.providerToolsAgent enabled:', this.config.tools?.providerToolsAgent?.enabled);
    }

    const hasTools = Object.keys(tools).length > 0;
    console.log('🔧 [DEBUG] buildTools() returning:', hasTools ? Object.keys(tools) : 'undefined');
    
    return hasTools ? tools : undefined;
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

    console.log('🔧 [DEBUG] Built system prompt length:', prompt.length);
    console.log('🔧 [DEBUG] System prompt preview:', prompt.substring(0, 200) + '...');

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