"use client";

import { useEffect, useState } from "react";
import type { AdminConfigSummary } from "@/lib/types";

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

  const fetchModelCapabilities = async () => {
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
        throw new Error(
          `Failed to fetch model capabilities: ${response.status}`
        );
      }

      const data = await response.json();
      // Extract capabilities from the consolidated response
      setModelCapabilities(data.capabilities);
    } catch (err) {
      console.error("Failed to fetch model capabilities:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch model capabilities"
      );
      setModelCapabilities(null);
    } finally {
      setIsLoading(false);
    }
  };

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
