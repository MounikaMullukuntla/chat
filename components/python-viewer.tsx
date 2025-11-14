"use client";

import { Editor } from "@monaco-editor/react";
import { useEffect, useState } from "react";
import { PythonConsole } from "./python-console";

type PythonViewerProps = {
  content: string;
  status?: "streaming" | "idle";
  onError?: (errorMessage: string) => void;
  onExecute?: () => void;
  onChange?: (content: string) => void;
  executionOutput?: {
    stdout?: string;
    stderr?: string;
    error?: string;
    result?: any;
    plots?: string[]; // Base64 encoded images
  };
  isExecuting?: boolean;
  onClearConsole?: () => void;
};

export function PythonViewer({
  content,
  status,
  onError,
  onExecute,
  onChange,
  executionOutput,
  isExecuting = false,
  onClearConsole,
}: PythonViewerProps) {
  const [showConsole, setShowConsole] = useState(false);

  // Auto-show console when there's output
  useEffect(() => {
    if (
      executionOutput &&
      (executionOutput.stdout ||
        executionOutput.stderr ||
        executionOutput.error ||
        executionOutput.plots)
    ) {
      setShowConsole(true);
    }
  }, [executionOutput]);

  // Show loading only if streaming but no content yet
  if (status === "streaming" && !content.trim()) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <div className="text-muted-foreground text-sm">
            Generating code...
          </div>
        </div>
      </div>
    );
  }

  // Show empty state only if not streaming and no content
  if (!content.trim() && status !== "streaming") {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center text-muted-foreground">
          <div className="font-medium text-lg">No code content</div>
          <div className="text-sm">
            Python code will appear here once generated
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Code Editor Section */}
      <div
        className={`${showConsole ? "h-1/2" : "h-full"} flex flex-col border-gray-700 border-b`}
      >
        {/* Editor Header */}
        <div className="flex items-center justify-between border-gray-700 border-b bg-gray-800 px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-300 text-sm">
              Python Code
            </span>
            {status === "streaming" && (
              <div className="flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2 py-0.5 text-blue-400 text-xs">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
                <span>Generating...</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-1.5 rounded bg-green-600 px-3 py-1 font-medium text-white text-xs transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isExecuting}
              onClick={onExecute}
            >
              {isExecuting ? (
                <>
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                    <path
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                  <span>Run</span>
                </>
              )}
            </button>
            <button
              className="rounded bg-gray-700 px-3 py-1 font-medium text-gray-300 text-xs transition-colors hover:bg-gray-600"
              onClick={() => setShowConsole(!showConsole)}
            >
              {showConsole ? "Hide Console" : "Show Console"}
            </button>
          </div>
        </div>

        {/* Monaco Editor */}
        <div className="flex-1 overflow-hidden">
          <Editor
            defaultLanguage="python"
            height="100%"
            onChange={(value) => onChange?.(value || "")}
            options={{
              readOnly: false,
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 4,
              wordWrap: "on",
              formatOnPaste: true,
              formatOnType: true,
              autoIndent: "full",
            }}
            theme="vs-dark"
            value={content}
          />
        </div>
      </div>

      {/* Console Section */}
      {showConsole && (
        <div className="flex h-1/2 flex-col overflow-hidden">
          <PythonConsole
            isExecuting={isExecuting}
            onClear={onClearConsole}
            output={executionOutput}
          />
        </div>
      )}
    </div>
  );
}
