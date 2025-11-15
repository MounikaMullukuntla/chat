/**
 * Google AI API key verification service
 */

import { BaseVerificationService } from "./base-verification-service";
import { VerificationErrorCode, type VerificationResult } from "./types";

export class GoogleVerificationService extends BaseVerificationService {
  protected providerName = "Google AI";
  private readonly baseUrl = "https://generativelanguage.googleapis.com/v1beta";

  async verify(apiKey: string): Promise<VerificationResult> {
    const startTime = Date.now();

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
          // Log successful verification
          try {
            const {
              logUserActivity,
              UserActivityType,
              ActivityCategory,
            } = await import("@/lib/logging");

            const verificationTime = Date.now() - startTime;

            void logUserActivity({
              user_id: "", // Will be populated from session
              activity_type: UserActivityType.ADMIN_CONFIG_UPDATE,
              activity_category: ActivityCategory.ADMIN,
              activity_metadata: {
                verification_type: "google_ai_api_key",
                verification_time_ms: verificationTime,
                models_count: data.models.length,
                primary_model: data.models.length > 0 ? data.models[0].name : undefined,
              },
              resource_type: "google_verification",
              success: true,
            });
          } catch (logError) {
            console.error("Failed to log Google verification:", logError);
          }

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
      // Log verification failure
      try {
        const {
          logSystemError,
          ErrorCategory,
          ErrorSeverity,
        } = await import("@/lib/errors/logger");

        const verificationTime = Date.now() - startTime;
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        // Determine severity based on error type
        let severity = ErrorSeverity.WARNING;
        let category = ErrorCategory.EXTERNAL_SERVICE_ERROR;

        if (errorMessage.includes("Invalid") || errorMessage.includes("format")) {
          severity = ErrorSeverity.WARNING;
          category = ErrorCategory.VALIDATION_ERROR;
        } else if (errorMessage.includes("Rate limit") || errorMessage.includes("quota")) {
          severity = ErrorSeverity.WARNING;
          category = ErrorCategory.API_RATE_LIMIT;
        } else if (errorMessage.includes("service unavailable")) {
          severity = ErrorSeverity.ERROR;
          category = ErrorCategory.EXTERNAL_SERVICE_ERROR;
        }

        void logSystemError(
          category,
          `Google AI API key verification failed: ${errorMessage}`,
          {
            verification_type: "google_ai_api_key",
            verification_time_ms: verificationTime,
            error_details: error instanceof Error ? error.stack : undefined,
          },
          severity
        );
      } catch (logError) {
        console.error("Failed to log Google verification error:", logError);
      }

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
