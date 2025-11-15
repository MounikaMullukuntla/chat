"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminConfigSummary } from "@/lib/types";
import {
  logAppError,
  ErrorCategory,
  ErrorSeverity,
} from "@/lib/errors/logger";

type UseModelCapabilitiesResult = {
  modelCapabilities: AdminConfigSummary | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useModelCapabilities(): UseModelCapabilitiesResult {
  const [modelCapabilities, setModelCapabilities] =
    useState<AdminConfigSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModelCapabilities = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/admin/config/summary", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        // Categorize error based on status code
        let errorCategory = ErrorCategory.API_REQUEST_FAILED;
        let severity = ErrorSeverity.ERROR;

        switch (response.status) {
          case 401:
            errorCategory = ErrorCategory.UNAUTHORIZED_ACCESS;
            severity = ErrorSeverity.WARNING;
            break;
          case 403:
            errorCategory = ErrorCategory.PERMISSION_DENIED;
            severity = ErrorSeverity.WARNING;
            break;
          case 404:
            errorCategory = ErrorCategory.API_REQUEST_FAILED;
            severity = ErrorSeverity.WARNING;
            break;
          case 429:
            errorCategory = ErrorCategory.API_RATE_LIMIT;
            severity = ErrorSeverity.WARNING;
            break;
          case 500:
          case 502:
          case 503:
          case 504:
            errorCategory = ErrorCategory.EXTERNAL_SERVICE_ERROR;
            severity = ErrorSeverity.ERROR;
            break;
        }

        const errorMessage = `Failed to fetch model capabilities: ${response.status} ${response.statusText}`;

        // Log the API error
        await logAppError(
          errorCategory,
          errorMessage,
          {
            endpoint: "/api/admin/config/summary",
            statusCode: response.status,
            statusText: response.statusText,
            method: "GET",
            timestamp: new Date().toISOString(),
          },
          undefined, // No user_id available in this hook
          severity
        );

        throw new Error(errorMessage);
      }

      const data = await response.json();
      // Extract capabilities from the consolidated response
      setModelCapabilities(data.capabilities);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to fetch model capabilities";

      console.error("Failed to fetch model capabilities:", err);

      // Log unexpected errors (network failures, JSON parsing, etc.)
      if (!(err instanceof Error && err.message.includes("Failed to fetch model capabilities:"))) {
        // This is an unexpected error (network, parsing, etc.)
        let errorCategory = ErrorCategory.NETWORK_ERROR;

        if (err instanceof Error) {
          if (err.message.includes("JSON")) {
            errorCategory = ErrorCategory.API_REQUEST_FAILED;
          } else if (err.message.includes("network") || err.message.includes("fetch")) {
            errorCategory = ErrorCategory.NETWORK_ERROR;
          }
        }

        await logAppError(
          errorCategory,
          `Unexpected error fetching model capabilities: ${errorMessage}`,
          {
            endpoint: "/api/admin/config/summary",
            error: errorMessage,
            errorType: err instanceof Error ? err.constructor.name : "Unknown",
            stack: err instanceof Error ? err.stack : undefined,
            timestamp: new Date().toISOString(),
          },
          undefined,
          ErrorSeverity.ERROR
        );
      }

      setError(errorMessage);
      setModelCapabilities(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModelCapabilities();
  }, [fetchModelCapabilities]);

  const refetch = () => {
    fetchModelCapabilities();
  };

  return {
    modelCapabilities,
    isLoading,
    error,
    refetch,
  };
}
