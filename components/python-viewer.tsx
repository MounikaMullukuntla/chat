"use client";

import { useEffect, useState } from "react";
import { Editor } from "@monaco-editor/react";
import { PythonConsole } from "./python-console";

interface PythonViewerProps {
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
}

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
    if (executionOutput && (executionOutput.stdout || executionOutput.stderr || executionOutput.error || executionOutput.plots)) {
      setShowConsole(true);
    }
  }, [executionOutput]);

  // Show loading only if streaming but no content yet
  if (status === "streaming" && !content.trim()) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <div className="text-sm text-muted-foreground">
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
          <div className="text-lg font-medium">No code content</div>
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
      <div className={`${showConsole ? 'h-1/2' : 'h-full'} flex flex-col border-b border-gray-700`}>
        {/* Editor Header */}
        <div className="flex items-center justify-between border-b border-gray-700 bg-gray-800 px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-300">
              Python Code
            </span>
            {status === "streaming" && (
              <div className="flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
                <span>Generating...</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onExecute}
              disabled={isExecuting}
              className="flex items-center gap-1.5 rounded bg-green-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExecuting ? (
                <>
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Run</span>
                </>
              )}
            </button>
            <button
              onClick={() => setShowConsole(!showConsole)}
              className="rounded bg-gray-700 px-3 py-1 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-600"
            >
              {showConsole ? 'Hide Console' : 'Show Console'}
            </button>
          </div>
        </div>

        {/* Monaco Editor */}
        <div className="flex-1 overflow-hidden">
          <Editor
            height="100%"
            defaultLanguage="python"
            value={content}
            onChange={(value) => onChange && onChange(value || "")}
            theme="vs-dark"
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
          />
        </div>
      </div>

      {/* Console Section */}
      {showConsole && (
        <div className="h-1/2 flex flex-col overflow-hidden">
          <PythonConsole
            output={executionOutput}
            isExecuting={isExecuting}
            onClear={onClearConsole}
          />
        </div>
      )}
    </div>
  );
}
