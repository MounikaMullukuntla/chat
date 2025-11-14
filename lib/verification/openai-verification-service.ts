/**
 * OpenAI API key verification service
 */

import { BaseVerificationService } from "./base-verification-service";
import { VerificationErrorCode, type VerificationResult } from "./types";

export class OpenAIVerificationService extends BaseVerificationService {
  protected providerName = "OpenAI";
  private readonly baseUrl = "https://api.openai.com/v1";

  async verify(apiKey: string): Promise<VerificationResult> {
    try {
      // Validate key format
      if (!this.validateKeyFormat(apiKey)) {
        throw this.createVerificationError(
          "Invalid API key format",
          VerificationErrorCode.INVALID_FORMAT
        );
      }

      // Make a minimal API call to list models (lightweight operation)
      const response = await this.makeRequest(`${this.baseUrl}/models`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      // Handle different response status codes
      if (response.status === 200) {
        const data = await response.json();

        // Verify we got a valid response with models
        if (data.data && Array.isArray(data.data)) {
          // Find a common model to show
          const gptModel = data.data.find(
            (model: any) =>
              model.id?.includes("gpt") || model.id?.includes("text")
          );

          return {
            success: true,
            details: {
              provider: "OpenAI",
              model:
                gptModel?.id ||
                (data.data.length > 0 ? data.data[0].id : "Available"),
              usage: {
                modelsCount: data.data.length,
              },
            },
          };
        }
        throw this.createVerificationError(
          "Invalid response format from OpenAI API",
          VerificationErrorCode.SERVICE_UNAVAILABLE
        );
      }
      if (response.status === 400) {
        const _errorData = await response.json().catch(() => ({}));

        throw this.createVerificationError(
          "Bad request to OpenAI API",
          VerificationErrorCode.AUTHENTICATION_FAILED
        );
      }
      if (response.status === 401) {
        const errorData = await response.json().catch(() => ({}));

        if (errorData.error?.code === "invalid_api_key") {
          throw this.createVerificationError(
            "Invalid API key",
            VerificationErrorCode.INVALID_KEY
          );
        }

        throw this.createVerificationError(
          "Authentication failed",
          VerificationErrorCode.AUTHENTICATION_FAILED
        );
      }
      if (response.status === 403) {
        throw this.createVerificationError(
          "Access forbidden - check API key permissions",
          VerificationErrorCode.AUTHENTICATION_FAILED
        );
      }
      if (response.status === 429) {
        const rateLimitInfo = this.parseRateLimitInfo(response.headers);
        throw this.createVerificationError(
          "Rate limit exceeded",
          VerificationErrorCode.RATE_LIMITED,
          response.status,
          rateLimitInfo
        );
      }
      if (response.status === 402) {
        throw this.createVerificationError(
          "Insufficient quota or billing issue",
          VerificationErrorCode.INSUFFICIENT_QUOTA
        );
      }
      if (response.status >= 500) {
        throw this.createVerificationError(
          "OpenAI service unavailable",
          VerificationErrorCode.SERVICE_UNAVAILABLE,
          response.status
        );
      }
      const errorData = await response.json().catch(() => ({}));
      throw this.createVerificationError(
        errorData.error?.message || `HTTP ${response.status}`,
        VerificationErrorCode.AUTHENTICATION_FAILED,
        response.status
      );
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Validate OpenAI API key format
   */
  protected validateKeyFormat(apiKey: string): boolean {
    if (!super.validateKeyFormat(apiKey)) {
      return false;
    }

    const trimmedKey = apiKey.trim();

    // OpenAI API keys start with "sk-" and are typically 51 characters long
    if (!trimmedKey.startsWith("sk-")) {
      return false;
    }

    // Check reasonable length (OpenAI keys are typically around 51 characters)
    if (trimmedKey.length < 40 || trimmedKey.length > 60) {
      return false;
    }

    return true;
  }
}
