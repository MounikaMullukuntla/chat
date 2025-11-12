"use client";

import { useEffect, useState } from "react";
import { Editor } from "@monaco-editor/react";

interface PythonCodeEditorProps {
  content: string;
  onChange?: (content: string) => void;
  readOnly?: boolean;
  versionNumber?: number;
}

export function PythonCodeEditor({
  content,
  onChange,
  readOnly = false,
  versionNumber,
}: PythonCodeEditorProps) {
  const [lineCount, setLineCount] = useState(1);

  useEffect(() => {
    // Update line count when content changes
    const lines = content.split("\n").length;
    setLineCount(lines);
  }, [content]);

  const handleEditorChange = (value: string | undefined) => {
    if (onChange && !readOnly && value !== undefined) {
      onChange(value);
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-gray-900 text-gray-100">
      {/* Editor Header */}
      <div className="flex items-center justify-between border-b border-gray-700 bg-gray-800 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-300">
            Python Code
          </span>
          {versionNumber && (
            <span className="rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-400">
              v{versionNumber}
            </span>
          )}
        </div>
        {readOnly && (
          <span className="text-xs text-gray-500">Read-only</span>
        )}
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage="python"
          value={content}
          onChange={handleEditorChange}
          theme="vs-dark"
          options={{
            readOnly,
            minimap: { enabled: true },
            fontSize: 14,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            insertSpaces: true,
            wordWrap: "on",
            folding: true,
            foldingStrategy: "indentation",
            showFoldingControls: "always",
            autoClosingBrackets: "always",
            autoClosingQuotes: "always",
            autoIndent: "full",
            formatOnPaste: true,
            formatOnType: true,
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: "on",
            snippetSuggestions: "inline",
            quickSuggestions: {
              other: true,
              comments: false,
              strings: false,
            },
          }}
        />
      </div>

      {/* Editor Footer - Info */}
      <div className="border-t border-gray-700 bg-gray-800 px-4 py-2">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {lineCount} lines • {content.length} characters
          </span>
          <span>Python 3.11</span>
        </div>
      </div>
    </div>
  );
}
