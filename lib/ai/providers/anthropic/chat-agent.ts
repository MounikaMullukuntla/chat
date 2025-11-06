/**

// @ts-nocheck - DISABLED FOR MVP
import "server-only";

import { anthropic } from '@ai-sdk/anthropic';
import { streamText, generateText, type LanguageModel } from 'ai';
import type { 
  ChatParams, 
  StreamingResponse, 
  ChatModelAgentConfig,
  ModelConfig 
} from '../../core/types';
import { 
  ProviderError, 
  AgentError, 
  StreamingError, 
  ErrorCodes 
} from '../../core/errors';


 * Anthropic Chat Agent implementation using Anthropic AI SDK
 * Handles streaming responses with thinking mode integration
export class AnthropicChatAgent {
  private config: ChatModelAgentConfig;

  constructor(config: ChatModelAgentConfig) {
    this.config = config;
    this.validateConfig();
  }

  /**
   * Generate streaming chat response
  async *chat(params: ChatParams): AsyncGenerator<StreamingResponse, void, unknown> {
    try {
      const model = this.getModel(params.modelId);
      const systemPrompt = params.systemPrompt || this.config.systemPrompt;

      // Convert messages to AI SDK format
      const messages = params.messages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      }));

      // Configure streaming with thinking mode if enabled
      const streamConfig: any = {
        model,
        system: systemPrompt,
        messages,
        temperature: 0.7
      };

      // Add thinking mode middleware if enabled and supported
      if (params.thinkingMode && this.supportsThinking(params.modelId)) {
        const { extractReasoningMiddleware } = await import('ai');
        streamConfig.experimental_transform = extractReasoningMiddleware({ 
          tagName: "think" 
        });
      }

      const result = streamText(streamConfig);

      // Stream the response
      let hasStarted = false;
      for await (const chunk of result.textStream) {
        if (!hasStarted) {
          hasStarted = true;
        }

        yield {
          content: chunk,
          finished: false
        };
      }

      // Signal completion
      yield {
        content: '',
        finished: true
      };

    } catch (error) {
      console.error('Anthropic Chat Agent error:', error);
      
      if (error instanceof Error) {
        // Handle specific Anthropic API errors
        if (error.message.includes('API key') || error.message.includes('Unauthorized')) {
          throw new ProviderError(
            'anthropic',
            ErrorCodes.AUTHENTICATION_FAILED,
            'Anthropic API authentication failed. Please check your API key.',
            error
          );
        }
        
        if (error.message.includes('quota') || error.message.includes('rate limit')) {
          throw new ProviderError(
            'anthropic',
            ErrorCodes.RATE_LIMIT_EXCEEDED,
            'Anthropic API rate limit exceeded. Please try again later.',
            error
          );
        }
        
        if (error.message.includes('model') || error.message.includes('not found')) {
          throw new ProviderError(
            'anthropic',
            ErrorCodes.MODEL_NOT_SUPPORTED,
            `Model ${params.modelId} is not supported or available.`,
            error
          );
        }

        if (error.message.includes('content_policy') || error.message.includes('safety')) {
          throw new ProviderError(
            'anthropic',
            ErrorCodes.PROVIDER_API_ERROR,
            'Content was filtered by Anthropic safety systems. Please modify your request.',
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
   * Generate non-streaming chat response
  async generateResponse(params: ChatParams): Promise<string> {
    try {
      const model = this.getModel(params.modelId);
      const systemPrompt = params.systemPrompt || this.config.systemPrompt;

      // Convert messages to AI SDK format
      const messages = params.messages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      }));

      const result = await generateText({
        model,
        system: systemPrompt,
        messages,
        temperature: 0.7
      });

      return result.text;

    } catch (error) {
      console.error('Anthropic Chat Agent generation error:', error);
      
      throw new AgentError(
        'anthropic-chat',
        ErrorCodes.AGENT_CREATION_FAILED,
        `Failed to generate response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get the appropriate Anthropic model instance
  private getModel(modelId: string): LanguageModel {
    const modelConfig = this.getModelConfig(modelId);
    
    if (!modelConfig) {
      throw new ProviderError(
        'anthropic',
        ErrorCodes.MODEL_NOT_FOUND,
        `Model ${modelId} not found in configuration`
      );
    }

    if (!modelConfig.enabled) {
      throw new ProviderError(
        'anthropic',
        ErrorCodes.MODEL_DISABLED,
        `Model ${modelId} is disabled`
      );
    }

    // Return Anthropic model instance
    return anthropic(modelId);
  }

  /**
   * Get model configuration by ID
  private getModelConfig(modelId: string): ModelConfig | undefined {
    return this.config.availableModels.find(model => model.id === modelId);
  }

  /**
   * Check if a model supports thinking mode
  private supportsThinking(modelId: string): boolean {
    const modelConfig = this.getModelConfig(modelId);
    return modelConfig?.thinkingEnabled || modelConfig?.supportsThinkingMode || false;
  }

  /**
   * Validate the agent configuration
  private validateConfig(): void {
    if (!this.config) {
      throw new AgentError(
        'anthropic-chat',
        ErrorCodes.INVALID_CONFIGURATION,
        'Chat agent configuration is required'
      );
    }

    if (!this.config.enabled) {
      throw new AgentError(
        'anthropic-chat',
        ErrorCodes.AGENT_DISABLED,
        'Anthropic chat agent is disabled'
      );
    }

    if (!this.config.availableModels || this.config.availableModels.length === 0) {
      throw new AgentError(
        'anthropic-chat',
        ErrorCodes.INVALID_CONFIGURATION,
        'No models configured for Anthropic chat agent'
      );
    }

    // Validate that at least one model is enabled
    const enabledModels = this.config.availableModels.filter(model => model.enabled);
    if (enabledModels.length === 0) {
      throw new AgentError(
        'anthropic-chat',
        ErrorCodes.INVALID_CONFIGURATION,
        'No enabled models found for Anthropic chat agent'
      );
    }
  }

  /**
   * Get available models for this agent
  getAvailableModels(): ModelConfig[] {
    return this.config.availableModels.filter(model => model.enabled);
  }

  /**
   * Get the default model for this agent
  getDefaultModel(): ModelConfig | null {
    const availableModels = this.getAvailableModels();
    return availableModels.find(model => model.isDefault) || availableModels[0] || null;
  }

  /**
   * Check if file input is supported
  supportsFileInput(modelId?: string): boolean {
    if (modelId) {
      const modelConfig = this.getModelConfig(modelId);
      if (modelConfig?.fileInputEnabled !== undefined) {
        return modelConfig.fileInputEnabled;
      }
    }

    // Fall back to provider-level settings
    return this.config.fileInputEnabled || 
           this.config.capabilities?.fileInput || 
           false;
  }

  /**
   * Get allowed file types
  getAllowedFileTypes(modelId?: string): string[] {
    if (modelId) {
      const modelConfig = this.getModelConfig(modelId);
      if (modelConfig?.allowedFileTypes) {
        return modelConfig.allowedFileTypes;
      }
    }

    // Fall back to provider-level settings
    if (this.config.allowedFileTypes) {
      return this.config.allowedFileTypes;
    }

    // Extract from fileInputTypes structure
    if (this.config.fileInputTypes) {
      const allowedTypes: string[] = [];
      
      Object.entries(this.config.fileInputTypes).forEach(([category, types]: [string, any]) => {
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
}*/

