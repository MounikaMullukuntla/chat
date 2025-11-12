"use client";

import { useState, useEffect, useCallback } from "react";
import { executePython, loadPackage, isPyodideReady, type ExecutionResult } from "@/lib/pyodide/runner";

export interface UsePyodideReturn {
  isLoading: boolean;
  isReady: boolean;
  isExecuting: boolean;
  execute: (code: string) => Promise<void>;
  output: ExecutionResult | null;
  loadPyodidePackage: (packageName: string) => Promise<void>;
  clearOutput: () => void;
}

/**
 * React hook for using Pyodide in components
 * Handles initialization, execution, and state management
 */
export function usePyodide(): UsePyodideReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [output, setOutput] = useState<ExecutionResult | null>(null);

  // Initialize Pyodide on mount
  useEffect(() => {
    let mounted = true;

    const initPyodide = async () => {
      try {
        // Clear any existing Pyodide instance to prevent version conflicts
        if ((window as any).pyodide) {
          console.log("🧹 Clearing existing Pyodide instance");
          delete (window as any).pyodide;
        }

        // Check if Pyodide script is loaded
        if (!(window as any).loadPyodide) {
          console.log("📦 Loading Pyodide script...");

          // Load Pyodide script from CDN (using 0.25.1 for better compatibility)
          const script = document.createElement("script");
          script.src = "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js";
          script.async = true;
          script.crossOrigin = "anonymous"; // Prevent CORS caching issues

          await new Promise<void>((resolve, reject) => {
            script.onload = () => {
              console.log("✅ Pyodide script loaded");
              resolve();
            };
            script.onerror = () => reject(new Error("Failed to load Pyodide script from CDN"));
            document.head.appendChild(script);
          });
        }

        console.log("📦 Initializing Pyodide...");
        // Initialize Pyodide (this will reuse existing instance if already initialized)
        await executePython("print('Pyodide ready')");

        if (mounted) {
          setIsReady(true);
          setIsLoading(false);
          console.log("✅ Pyodide hook initialized and ready");
        }
      } catch (error) {
        console.error("❌ Failed to initialize Pyodide in hook:", error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initPyodide();

    return () => {
      mounted = false;
    };
  }, []);

  // Execute Python code
  const execute = useCallback(async (code: string) => {
    if (!isReady) {
      console.warn("Pyodide not ready yet");
      return;
    }

    setIsExecuting(true);

    try {
      const result = await executePython(code);
      setOutput(result);
    } catch (error) {
      console.error("Execution error:", error);
      setOutput({
        stdout: "",
        stderr: "",
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsExecuting(false);
    }
  }, [isReady]);

  // Load additional packages
  const loadPyodidePackage = useCallback(async (packageName: string) => {
    if (!isReady) {
      console.warn("Pyodide not ready yet");
      return;
    }

    try {
      await loadPackage(packageName);
    } catch (error) {
      console.error(`Failed to load package ${packageName}:`, error);
      throw error;
    }
  }, [isReady]);

  // Clear output
  const clearOutput = useCallback(() => {
    setOutput(null);
  }, []);

  return {
    isLoading,
    isReady,
    isExecuting,
    execute,
    output,
    loadPyodidePackage,
    clearOutput,
  };
}
