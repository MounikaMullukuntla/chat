"use client";

import { Editor } from "@monaco-editor/react";
import { useEffect, useState } from "react";

type PythonCodeEditorProps = {
  content: string;
  onChange?: (content: string) => void;
  readOnly?: boolean;
  versionNumber?: number;
};

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
      <div className="flex items-center justify-between border-gray-700 border-b bg-gray-800 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-300 text-sm">Python Code</span>
          {versionNumber && (
            <span className="rounded bg-gray-700 px-2 py-0.5 text-gray-400 text-xs">
              v{versionNumber}
            </span>
          )}
        </div>
        {readOnly && <span className="text-gray-500 text-xs">Read-only</span>}
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          defaultLanguage="python"
          height="100%"
          onChange={handleEditorChange}
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
          theme="vs-dark"
          value={content}
        />
      </div>

      {/* Editor Footer - Info */}
      <div className="border-gray-700 border-t bg-gray-800 px-4 py-2">
        <div className="flex items-center justify-between text-gray-500 text-xs">
          <span>
            {lineCount} lines • {content.length} characters
          </span>
          <span>Python 3.11</span>
        </div>
      </div>
    </div>
  );
}
