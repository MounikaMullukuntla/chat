/**
 * Error classes for the chat agent system
 */

/**
 * Base error class for provider-related errors
 */
export class ProviderError extends Error {
  constructor(
    public readonly provider: string,
    public readonly code: string,
    message: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'ProviderError';
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage(): string {
    return getUserFriendlyMessage(this.code, { provider: this.provider });
  }

  /**
   * Convert to ChatSDKError for API responses
   */
  toChatSDKError(): any {
    const { ChatSDKError } = require('../../errors');
    return new ChatSDKError('bad_request:api', this.getUserFriendlyMessage());
  }
}

/**
 * Error class for agent-related errors
 */
export class AgentError extends Error {
  constructor(
    public readonly agent: string,
    public readonly code: string,
    message: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'AgentError';
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage(): string {
    return getUserFriendlyMessage(this.code, { agent: this.agent });
  }

  /**
   * Convert to ChatSDKError for API responses
   */
  toChatSDKError(): any {
    const { ChatSDKError } = require('../../errors');
    return new ChatSDKError('bad_request:api', this.getUserFriendlyMessage());
  }
}

/**
 * Error class for configuration-related errors
 */
export class ConfigurationError extends Error {
  constructor(
    public readonly configKey: string,
    message: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'ConfigurationError';
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage(): string {
    return getUserFriendlyMessage('INVALID_CONFIGURATION', { configKey: this.configKey });
  }

  /**
   * Convert to ChatSDKError for API responses
   */
  toChatSDKError(): any {
    const { ChatSDKError } = require('../../errors');
    return new ChatSDKError('bad_request:api', this.getUserFriendlyMessage());
  }
}

/**
 * Error class for streaming-related errors
 */
export class StreamingError extends Error {
  constructor(
    message: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'StreamingError';
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage(): string {
    return getUserFriendlyMessage('STREAMING_FAILED');
  }

  /**
   * Convert to ChatSDKError for API responses
   */
  toChatSDKError(): any {
    const { ChatSDKError } = require('../../errors');
    return new ChatSDKError('bad_request:stream', this.getUserFriendlyMessage());
  }
}

/**
 * Error codes for common error scenarios
 */
export const ErrorCodes = {
  // Provider errors
  PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
  PROVIDER_NOT_FOUND: 'PROVIDER_NOT_FOUND',
  PROVIDER_DISABLED: 'PROVIDER_DISABLED',
  PROVIDER_CONFIG_INVALID: 'PROVIDER_CONFIG_INVALID',
  PROVIDER_API_ERROR: 'PROVIDER_API_ERROR',
  
  // Agent errors
  AGENT_CREATION_FAILED: 'AGENT_CREATION_FAILED',
  AGENT_NOT_FOUND: 'AGENT_NOT_FOUND',
  AGENT_DISABLED: 'AGENT_DISABLED',
  AGENT_TYPE_INVALID: 'AGENT_TYPE_INVALID',
  
  // Configuration errors
  INVALID_CONFIGURATION: 'INVALID_CONFIGURATION',
  CONFIG_NOT_FOUND: 'CONFIG_NOT_FOUND',
  CONFIG_VALIDATION_FAILED: 'CONFIG_VALIDATION_FAILED',
  
  // Model errors
  MODEL_NOT_SUPPORTED: 'MODEL_NOT_SUPPORTED',
  MODEL_NOT_FOUND: 'MODEL_NOT_FOUND',
  MODEL_DISABLED: 'MODEL_DISABLED',
  
  // Streaming errors
  STREAMING_FAILED: 'STREAMING_FAILED',
  REASONING_FAILED: 'REASONING_FAILED',
  
  // Rate limiting and authentication
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  
  // Database errors
  DATABASE_CONNECTION_FAILED: 'DATABASE_CONNECTION_FAILED',
  DATABASE_QUERY_FAILED: 'DATABASE_QUERY_FAILED',
  DATABASE_VALIDATION_FAILED: 'DATABASE_VALIDATION_FAILED'
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];
/**

 * Get user-friendly error messages for different error codes
 */
export function getUserFriendlyMessage(
  code: string, 
  context?: { provider?: string; agent?: string; configKey?: string; model?: string }
): string {
  const { provider, agent, configKey, model } = context || {};

  switch (code) {
    // Provider errors
    case ErrorCodes.PROVIDER_UNAVAILABLE:
      return `The ${provider || 'AI'} provider is currently unavailable. Please try again later.`;
    case ErrorCodes.PROVIDER_NOT_FOUND:
      return `The requested provider "${provider}" was not found. Please check your configuration.`;
    case ErrorCodes.PROVIDER_DISABLED:
      return `The ${provider || 'AI'} provider is currently disabled. Please contact your administrator.`;
    case ErrorCodes.PROVIDER_CONFIG_INVALID:
      return `The ${provider || 'AI'} provider configuration is invalid. Please check your settings.`;
    case ErrorCodes.PROVIDER_API_ERROR:
      return `There was an error communicating with the ${provider || 'AI'} provider. Please try again.`;

    // Agent errors
    case ErrorCodes.AGENT_CREATION_FAILED:
      return `Failed to create the ${agent || 'AI'} agent. Please check your configuration.`;
    case ErrorCodes.AGENT_NOT_FOUND:
      return `The requested agent "${agent}" was not found. Please check your configuration.`;
    case ErrorCodes.AGENT_DISABLED:
      return `The ${agent || 'AI'} agent is currently disabled. Please contact your administrator.`;
    case ErrorCodes.AGENT_TYPE_INVALID:
      return `The agent type "${agent}" is not supported. Please use a valid agent type.`;

    // Configuration errors
    case ErrorCodes.INVALID_CONFIGURATION:
      return configKey 
        ? `The configuration for "${configKey}" is invalid. Please check your settings.`
        : 'The configuration is invalid. Please check your settings.';
    case ErrorCodes.CONFIG_NOT_FOUND:
      return configKey
        ? `Configuration for "${configKey}" was not found. Please check your setup.`
        : 'Required configuration was not found. Please check your setup.';
    case ErrorCodes.CONFIG_VALIDATION_FAILED:
      return 'Configuration validation failed. Please check your settings and try again.';

    // Model errors
    case ErrorCodes.MODEL_NOT_SUPPORTED:
      return model
        ? `The model "${model}" is not supported by this provider.`
        : 'The requested model is not supported.';
    case ErrorCodes.MODEL_NOT_FOUND:
      return model
        ? `The model "${model}" was not found. Please select a different model.`
        : 'The requested model was not found.';
    case ErrorCodes.MODEL_DISABLED:
      return model
        ? `The model "${model}" is currently disabled.`
        : 'The selected model is currently disabled.';

    // Streaming errors
    case ErrorCodes.STREAMING_FAILED:
      return 'Failed to stream the response. Please try again.';
    case ErrorCodes.REASONING_FAILED:
      return 'Failed to process reasoning content. The response may be incomplete.';

    // Rate limiting and authentication
    case ErrorCodes.RATE_LIMIT_EXCEEDED:
      return 'You have exceeded the rate limit. Please wait a moment before trying again.';
    case ErrorCodes.AUTHENTICATION_FAILED:
      return 'Authentication failed. Please check your credentials.';

    // Database errors
    case ErrorCodes.DATABASE_CONNECTION_FAILED:
      return 'Unable to connect to the database. Please try again later.';
    case ErrorCodes.DATABASE_QUERY_FAILED:
      return 'Database query failed. Please try again later.';
    case ErrorCodes.DATABASE_VALIDATION_FAILED:
      return 'Database validation failed. Please check your input and try again.';

    default:
      return 'An unexpected error occurred. Please try again later.';
  }
}

/**
 * Database operation error handling utilities
 */
export class DatabaseErrorHandler {
  /**
   * Wrap database operations with error handling
   */
  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    context: {
      operation: string;
      configKey?: string;
      provider?: string;
      agent?: string;
    }
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      // Log the original error for debugging
      console.error(`Database operation failed: ${context.operation}`, {
        context,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });

      // Convert to appropriate error type
      if (error instanceof Error) {
        if (error.message.includes('connection')) {
          throw new ConfigurationError(
            context.configKey || 'database',
            getUserFriendlyMessage(ErrorCodes.DATABASE_CONNECTION_FAILED),
            error
          );
        }
        
        if (error.message.includes('validation') || error.message.includes('constraint')) {
          throw new ConfigurationError(
            context.configKey || 'database',
            getUserFriendlyMessage(ErrorCodes.DATABASE_VALIDATION_FAILED),
            error
          );
        }
      }

      // Default to query failed error
      throw new ConfigurationError(
        context.configKey || 'database',
        getUserFriendlyMessage(ErrorCodes.DATABASE_QUERY_FAILED),
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Handle configuration retrieval errors
   */
  static async getConfig<T>(
    configKey: string,
    getter: () => Promise<T | null>
  ): Promise<T> {
    const result = await this.withErrorHandling(
      getter,
      { operation: 'getConfig', configKey }
    );

    if (!result) {
      throw new ConfigurationError(
        configKey,
        getUserFriendlyMessage(ErrorCodes.CONFIG_NOT_FOUND, { configKey })
      );
    }

    return result;
  }

  /**
   * Handle configuration validation errors
   */
  static validateConfig(
    configKey: string,
    config: any,
    validator: (config: any) => { isValid: boolean; errors: string[] }
  ): void {
    const validation = validator(config);
    
    if (!validation.isValid) {
      throw new ConfigurationError(
        configKey,
        `Configuration validation failed: ${validation.errors.join(', ')}`
      );
    }
  }

  /**
   * Handle provider-specific database operations
   */
  static async withProviderContext<T>(
    provider: string,
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof ConfigurationError || error instanceof ProviderError) {
        throw error; // Re-throw our custom errors
      }

      // Convert generic errors to provider errors
      throw new ProviderError(
        provider,
        ErrorCodes.PROVIDER_API_ERROR,
        `${operationName} failed for provider ${provider}`,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Handle agent-specific database operations
   */
  static async withAgentContext<T>(
    agent: string,
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof ConfigurationError || error instanceof AgentError) {
        throw error; // Re-throw our custom errors
      }

      // Convert generic errors to agent errors
      throw new AgentError(
        agent,
        ErrorCodes.AGENT_CREATION_FAILED,
        `${operationName} failed for agent ${agent}`,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
}

/**
 * Utility functions for error handling
 */
export class ErrorUtils {
  /**
   * Check if an error is a known chat agent error
   */
  static isChatAgentError(error: unknown): error is ProviderError | AgentError | ConfigurationError | StreamingError {
    return error instanceof ProviderError ||
           error instanceof AgentError ||
           error instanceof ConfigurationError ||
           error instanceof StreamingError;
  }

  /**
   * Convert any error to a user-friendly message
   */
  static toUserFriendlyMessage(error: unknown): string {
    if (ErrorUtils.isChatAgentError(error)) {
      return error.getUserFriendlyMessage();
    }

    if (error instanceof Error) {
      // Check for common error patterns
      if (error.message.includes('network') || error.message.includes('connection')) {
        return getUserFriendlyMessage(ErrorCodes.PROVIDER_UNAVAILABLE);
      }
      
      if (error.message.includes('rate limit') || error.message.includes('quota')) {
        return getUserFriendlyMessage(ErrorCodes.RATE_LIMIT_EXCEEDED);
      }
      
      if (error.message.includes('auth') || error.message.includes('unauthorized')) {
        return getUserFriendlyMessage(ErrorCodes.AUTHENTICATION_FAILED);
      }
    }

    return 'An unexpected error occurred. Please try again later.';
  }

  /**
   * Log error with appropriate level
   */
  static logError(error: unknown, context?: Record<string, any>): void {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    
    console.error('Chat Agent Error:', {
      message,
      stack,
      context,
      timestamp: new Date().toISOString()
    });
  }
}