"use client";

import { useEffect, useRef } from "react";

type PythonConsoleProps = {
  output?: {
    stdout?: string;
    stderr?: string;
    error?: string;
    result?: any;
    plots?: string[]; // Base64 encoded images
  };
  isExecuting?: boolean;
  onClear?: () => void;
};

export function PythonConsole({
  output,
  isExecuting = false,
  onClear,
}: PythonConsoleProps) {
  const consoleRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new output arrives
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, []);

  const hasOutput =
    output &&
    (output.stdout ||
      output.stderr ||
      output.error ||
      output.result ||
      output.plots);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-gray-950">
      {/* Console Header */}
      <div className="flex items-center justify-between border-gray-700 border-b bg-gray-800 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-300 text-sm">Console</span>
          {isExecuting && (
            <div className="flex items-center gap-1.5 text-blue-400 text-xs">
              <div className="h-2 w-2 animate-pulse rounded-full bg-blue-400" />
              <span>Running...</span>
            </div>
          )}
        </div>
        {hasOutput && onClear && (
          <button
            className="text-gray-500 text-xs transition-colors hover:text-gray-300"
            onClick={onClear}
          >
            Clear
          </button>
        )}
      </div>

      {/* Console Output */}
      <div
        className="flex-1 overflow-y-auto px-4 py-3 font-mono text-sm"
        ref={consoleRef}
      >
        {!hasOutput && !isExecuting && (
          <div className="flex h-full items-center justify-center text-gray-600">
            <div className="text-center">
              <svg
                className="mx-auto mb-2 h-12 w-12 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                />
              </svg>
              <p className="text-sm">No output yet</p>
              <p className="mt-1 text-xs">Click "Run" to execute the code</p>
            </div>
          </div>
        )}

        {isExecuting && !hasOutput && (
          <div className="flex items-center gap-2 text-blue-400">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
            <span>Executing Python code...</span>
          </div>
        )}

        {/* Standard Output */}
        {output?.stdout && (
          <div className="mb-2">
            <div className="mb-1 text-gray-500 text-xs">stdout:</div>
            <pre className="whitespace-pre-wrap break-words text-gray-300">
              {output.stdout}
            </pre>
          </div>
        )}

        {/* Standard Error */}
        {output?.stderr && (
          <div className="mb-2">
            <div className="mb-1 text-xs text-yellow-500">stderr:</div>
            <pre className="whitespace-pre-wrap break-words text-yellow-300">
              {output.stderr}
            </pre>
          </div>
        )}

        {/* Error Output */}
        {output?.error && (
          <div className="mb-2">
            <div className="mb-1 text-red-500 text-xs">Error:</div>
            <pre className="whitespace-pre-wrap break-words text-red-300">
              {output.error}
            </pre>
          </div>
        )}

        {/* Result (for expressions/return values) */}
        {output?.result !== undefined && output?.result !== null && (
          <div className="mb-2">
            <div className="mb-1 text-green-500 text-xs">Result:</div>
            <pre className="whitespace-pre-wrap break-words text-green-300">
              {typeof output.result === "object"
                ? JSON.stringify(output.result, null, 2)
                : String(output.result)}
            </pre>
          </div>
        )}

        {/* Plots (matplotlib/plotly images) */}
        {output?.plots && output.plots.length > 0 && (
          <div className="mb-2">
            <div className="mb-2 text-purple-500 text-xs">Plots:</div>
            <div className="space-y-3">
              {output.plots.map((plot, index) => (
                <div
                  className="rounded border border-gray-700 bg-gray-900 p-2"
                  key={index}
                >
                  <img
                    alt={`Plot ${index + 1}`}
                    className="h-auto max-w-full rounded"
                    src={`data:image/png;base64,${plot}`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Console Footer */}
      <div className="border-gray-700 border-t bg-gray-800 px-4 py-1.5">
        <div className="flex items-center justify-between text-gray-500 text-xs">
          <span>Python 3.11 (Pyodide)</span>
          {hasOutput && (
            <span>
              {output?.stdout
                ? `${output.stdout.split("\n").length} lines`
                : ""}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
