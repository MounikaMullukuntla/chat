"use client";

import { useEffect, useRef, useState } from "react";

interface MermaidCodeEditorProps {
  content: string;
  onChange?: (content: string) => void;
  readOnly?: boolean;
  versionNumber?: number;
}

export function MermaidCodeEditor({
  content,
  onChange,
  readOnly = false,
  versionNumber,
}: MermaidCodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [lineCount, setLineCount] = useState(1);

  useEffect(() => {
    // Update line count when content changes
    const lines = content.split("\n").length;
    setLineCount(lines);
  }, [content]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (onChange && !readOnly) {
      onChange(e.target.value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle Tab key for indentation
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;

      // Insert tab
      const newValue = value.substring(0, start) + "  " + value.substring(end);
      textarea.value = newValue;

      // Move cursor
      textarea.selectionStart = textarea.selectionEnd = start + 2;

      // Trigger onChange
      if (onChange && !readOnly) {
        onChange(newValue);
      }
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-gray-900 text-gray-100">
      {/* Editor Header */}
      <div className="flex items-center justify-between border-b border-gray-700 bg-gray-800 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-300">
            Mermaid Code
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

      {/* Editor Content */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Line Numbers */}
        <div className="select-none border-r border-gray-700 bg-gray-800 px-3 py-4 text-right font-mono text-sm text-gray-500">
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i + 1} className="leading-6">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Code Area */}
        <div className="flex-1 overflow-auto">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            readOnly={readOnly}
            className="h-full w-full resize-none bg-gray-900 px-4 py-4 font-mono text-sm leading-6 text-gray-100 outline-none"
            style={{
              tabSize: 2,
              MozTabSize: 2,
            }}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
          />
        </div>
      </div>

      {/* Editor Footer - Info */}
      <div className="border-t border-gray-700 bg-gray-800 px-4 py-2">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {content.split("\n").length} lines • {content.length} characters
          </span>
          <span>Mermaid Syntax</span>
        </div>
      </div>
    </div>
  );
}
