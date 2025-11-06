/**
 * Anthropic API key verification service
 */

import { BaseVerificationService } from './base-verification-service';
import { VerificationResult, VerificationErrorCode } from './types';

export class AnthropicVerificationService extends BaseVerificationService {
  protected providerName = 'Anthropic';
  private readonly baseUrl = 'https://api.anthropic.com/v1';

  async verify(apiKey: string): Promise<VerificationResult> {
    try {
      // Validate key format
      if (!this.validateKeyFormat(apiKey)) {
        throw this.createVerificationError(
          'Invalid API key format',
          VerificationErrorCode.INVALID_FORMAT
        );
      }

      // Make a minimal API call to create a very short message (lightweight operation)
      const response = await this.makeRequest(
        `${this.baseUrl}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1,
            messages: [
              {
                role: 'user',
                content: 'Hi'
              }
            ]
          })
        }
      );

      // Handle different response status codes
      if (response.status === 200) {
        const data = await response.json();
        
        // Verify we got a valid response
        if (data.content && Array.isArray(data.content)) {
          return {
            success: true,
            details: {
              provider: 'Anthropic',
              model: data.model || 'claude-3-haiku-20240307',
              usage: {
                inputTokens: data.usage?.input_tokens || 0,
                outputTokens: data.usage?.output_tokens || 0
              }
            }
          };
        } else {
          throw this.createVerificationError(
            'Invalid response format from Anthropic API',
            VerificationErrorCode.SERVICE_UNAVAILABLE
          );
        }
      } else if (response.status === 400) {
        const errorData = await response.json().catch(() => ({}));
        
        if (errorData.error?.type === 'invalid_request_error') {
          if (errorData.error.message?.includes('credit')) {
            throw this.createVerificationError(
              'Insufficient credits',
              VerificationErrorCode.INSUFFICIENT_QUOTA
            );
          }
          
          throw this.createVerificationError(
            'Invalid request to Anthropic API',
            VerificationErrorCode.AUTHENTICATION_FAILED
          );
        }
        
        throw this.createVerificationError(
          'Bad request to Anthropic API',
          VerificationErrorCode.AUTHENTICATION_FAILED
        );
      } else if (response.status === 401) {
        throw this.createVerificationError(
          'Invalid API key',
          VerificationErrorCode.INVALID_KEY
        );
      } else if (response.status === 403) {
        throw this.createVerificationError(
          'Access forbidden - check API key permissions',
          VerificationErrorCode.AUTHENTICATION_FAILED
        );
      } else if (response.status === 429) {
        const rateLimitInfo = this.parseRateLimitInfo(response.headers);
        throw this.createVerificationError(
          'Rate limit exceeded',
          VerificationErrorCode.RATE_LIMITED,
          response.status,
          rateLimitInfo
        );
      } else if (response.status >= 500) {
        throw this.createVerificationError(
          'Anthropic service unavailable',
          VerificationErrorCode.SERVICE_UNAVAILABLE,
          response.status
        );
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw this.createVerificationError(
          errorData.error?.message || `HTTP ${response.status}`,
          VerificationErrorCode.AUTHENTICATION_FAILED,
          response.status
        );
      }
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Validate Anthropic API key format
   */
  protected validateKeyFormat(apiKey: string): boolean {
    if (!super.validateKeyFormat(apiKey)) {
      return false;
    }

    const trimmedKey = apiKey.trim();
    
    // Anthropic API keys start with "sk-ant-" and are longer
    if (!trimmedKey.startsWith('sk-ant-')) {
      return false;
    }

    // Check reasonable length (Anthropic keys are typically much longer than 50 characters)
    if (trimmedKey.length < 50) {
      return false;
    }

    return true;
  }
}