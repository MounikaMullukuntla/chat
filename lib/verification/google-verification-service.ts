/**
 * Google AI API key verification service
 */

import { BaseVerificationService } from "./base-verification-service";
import { VerificationErrorCode, type VerificationResult } from "./types";

export class GoogleVerificationService extends BaseVerificationService {
  protected providerName = "Google AI";
  private readonly baseUrl = "https://generativelanguage.googleapis.com/v1beta";

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
      const response = await this.makeRequest(
        `${this.baseUrl}/models?key=${encodeURIComponent(apiKey)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // Handle different response status codes
      if (response.status === 200) {
        const data = await response.json();

        // Verify we got a valid response with models
        if (data.models && Array.isArray(data.models)) {
          return {
            success: true,
            details: {
              provider: "Google AI",
              model: data.models.length > 0 ? data.models[0].name : "Available",
              usage: {
                modelsCount: data.models.length,
              },
            },
          };
        }
        throw this.createVerificationError(
          "Invalid response format from Google AI API",
          VerificationErrorCode.SERVICE_UNAVAILABLE
        );
      }
      if (response.status === 400) {
        const errorData = await response.json().catch(() => ({}));

        if (errorData.error?.message?.includes("API key")) {
          throw this.createVerificationError(
            "Invalid API key",
            VerificationErrorCode.INVALID_KEY
          );
        }

        throw this.createVerificationError(
          "Bad request to Google AI API",
          VerificationErrorCode.AUTHENTICATION_FAILED
        );
      }
      if (response.status === 401 || response.status === 403) {
        throw this.createVerificationError(
          "Authentication failed",
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
          "Insufficient quota or billing not enabled",
          VerificationErrorCode.INSUFFICIENT_QUOTA
        );
      }
      if (response.status >= 500) {
        throw this.createVerificationError(
          "Google AI service unavailable",
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
   * Validate Google AI API key format
   */
  protected validateKeyFormat(apiKey: string): boolean {
    if (!super.validateKeyFormat(apiKey)) {
      return false;
    }

    const trimmedKey = apiKey.trim();

    // Google AI API keys typically start with "AIza" and are about 39 characters long
    if (!trimmedKey.startsWith("AIza")) {
      return false;
    }

    // Check reasonable length (Google keys are typically 39 characters)
    if (trimmedKey.length < 35 || trimmedKey.length > 45) {
      return false;
    }

    return true;
  }
}
