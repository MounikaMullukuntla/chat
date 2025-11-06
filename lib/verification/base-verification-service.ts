/**
 * Base verification service with common error handling and rate limiting
 */

import { VerificationResult, VerificationError, VerificationErrorCode, RateLimitInfo } from './types';

export abstract class BaseVerificationService {
  protected abstract providerName: string;
  
  /**
   * Abstract method to be implemented by specific provider services
   */
  abstract verify(apiKey: string): Promise<VerificationResult>;

  /**
   * Handle common network errors and convert them to VerificationResult
   */
  protected handleError(error: unknown): VerificationResult {
    if (error instanceof VerificationError) {
      return this.handleVerificationError(error);
    }

    if (error instanceof Error) {
      // Network or fetch errors
      if (error.message.includes('fetch') || error.message.includes('network')) {
        return {
          success: false,
          error: 'Network error occurred. Please check your connection and try again.'
        };
      }

      // Generic error
      return {
        success: false,
        error: error.message || 'An unexpected error occurred'
      };
    }

    return {
      success: false,
      error: 'An unknown error occurred'
    };
  }

  /**
   * Handle specific verification errors with appropriate user messages
   */
  private handleVerificationError(error: VerificationError): VerificationResult {
    switch (error.code) {
      case VerificationErrorCode.INVALID_KEY:
        return {
          success: false,
          error: `Invalid ${this.providerName} API key format. Please check your key and try again.`
        };

      case VerificationErrorCode.AUTHENTICATION_FAILED:
        return {
          success: false,
          error: `Authentication failed. Please verify your ${this.providerName} API key is correct.`
        };

      case VerificationErrorCode.RATE_LIMITED:
        const retryMessage = error.rateLimitInfo?.retryAfter 
          ? ` Please try again in ${error.rateLimitInfo.retryAfter} seconds.`
          : ' Please try again later.';
        return {
          success: false,
          error: `Rate limit exceeded for ${this.providerName} API.${retryMessage}`
        };

      case VerificationErrorCode.NETWORK_ERROR:
        return {
          success: false,
          error: 'Network error occurred. Please check your connection and try again.'
        };

      case VerificationErrorCode.SERVICE_UNAVAILABLE:
        return {
          success: false,
          error: `${this.providerName} service is currently unavailable. Please try again later.`
        };

      case VerificationErrorCode.INSUFFICIENT_QUOTA:
        return {
          success: false,
          error: `Insufficient quota or credits for ${this.providerName} API. Please check your account.`
        };

      default:
        return {
          success: false,
          error: error.message || `Failed to verify ${this.providerName} API key`
        };
    }
  }

  /**
   * Create a VerificationError with proper typing
   */
  protected createVerificationError(
    message: string, 
    code: VerificationErrorCode, 
    statusCode?: number,
    rateLimitInfo?: RateLimitInfo
  ): VerificationError {
    return new VerificationError(message, code, statusCode, rateLimitInfo);
  }

  /**
   * Validate API key format (basic validation)
   */
  protected validateKeyFormat(apiKey: string, expectedPrefix?: string): boolean {
    if (!apiKey || typeof apiKey !== 'string') {
      return false;
    }

    // Remove whitespace
    const trimmedKey = apiKey.trim();
    
    if (trimmedKey.length === 0) {
      return false;
    }

    // Check for expected prefix if provided
    if (expectedPrefix && !trimmedKey.startsWith(expectedPrefix)) {
      return false;
    }

    return true;
  }

  /**
   * Parse rate limit information from response headers
   */
  protected parseRateLimitInfo(headers: Headers): RateLimitInfo | undefined {
    const remaining = headers.get('x-ratelimit-remaining') || headers.get('x-rate-limit-remaining');
    const resetTime = headers.get('x-ratelimit-reset') || headers.get('x-rate-limit-reset');
    const retryAfter = headers.get('retry-after');

    if (!remaining && !resetTime && !retryAfter) {
      return undefined;
    }

    return {
      remaining: remaining ? parseInt(remaining, 10) : undefined,
      resetTime: resetTime ? new Date(parseInt(resetTime, 10) * 1000) : undefined,
      retryAfter: retryAfter ? parseInt(retryAfter, 10) : undefined
    };
  }

  /**
   * Make HTTP request with timeout and error handling
   */
  protected async makeRequest(
    url: string, 
    options: RequestInit, 
    timeoutMs: number = 10000
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw this.createVerificationError(
          'Request timeout',
          VerificationErrorCode.NETWORK_ERROR
        );
      }
      
      throw this.createVerificationError(
        'Network request failed',
        VerificationErrorCode.NETWORK_ERROR
      );
    }
  }
}