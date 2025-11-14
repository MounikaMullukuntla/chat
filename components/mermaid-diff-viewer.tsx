"use client";

import DiffMatchPatch from "diff-match-patch";
import { useMemo } from "react";

// Type for diff tuples: [operation, text]
type Diff = [number, string];

type MermaidDiffViewerProps = {
  oldContent: string;
  newContent: string;
  oldVersion?: number;
  newVersion?: number;
};

export function MermaidDiffViewer({
  oldContent,
  newContent,
  oldVersion,
  newVersion,
}: MermaidDiffViewerProps) {
  const diffs = useMemo(() => {
    const dmp = new DiffMatchPatch();
    const diff = dmp.diff_main(oldContent, newContent);
    dmp.diff_cleanupSemantic(diff);
    return diff;
  }, [oldContent, newContent]);

  const renderDiff = (diffs: Diff[]) => {
    return diffs.map((diff, index) => {
      const [operation, text] = diff;
      const lines = text.split("\n");

      return lines.map((line, lineIndex) => {
        // Skip empty last line from split
        if (lineIndex === lines.length - 1 && line === "") {
          return null;
        }

        let bgColor = "";
        let textColor = "";
        let symbol = " ";

        if (operation === -1) {
          // DIFF_DELETE
          bgColor = "bg-red-900/30";
          textColor = "text-red-200";
          symbol = "-";
        } else if (operation === 1) {
          // DIFF_INSERT
          bgColor = "bg-green-900/30";
          textColor = "text-green-200";
          symbol = "+";
        } else {
          bgColor = "bg-gray-800";
          textColor = "text-gray-300";
          symbol = " ";
        }

        return (
          <div
            className={`flex font-mono text-sm ${bgColor}`}
            key={`${index}-${lineIndex}`}
          >
            <span className="w-8 select-none px-2 text-center text-gray-500">
              {symbol}
            </span>
            <span className={`flex-1 px-2 ${textColor}`}>{line || " "}</span>
          </div>
        );
      });
    });
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-gray-900">
      {/* Diff Header */}
      <div className="flex items-center justify-between border-gray-700 border-b bg-gray-800 px-4 py-3">
        <div className="flex items-center gap-4">
          <h3 className="font-medium text-gray-200">Diagram Changes</h3>
          {oldVersion && newVersion && (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <span className="rounded bg-red-900/30 px-2 py-1 text-red-200">
                v{oldVersion}
              </span>
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
              <span className="rounded bg-green-900/30 px-2 py-1 text-green-200">
                v{newVersion}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4 text-gray-500 text-xs">
          <div className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded bg-red-900/30" />
            <span>Removed</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded bg-green-900/30" />
            <span>Added</span>
          </div>
        </div>
      </div>

      {/* Diff Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-2">{renderDiff(diffs)}</div>
      </div>

      {/* Diff Footer */}
      <div className="border-gray-700 border-t bg-gray-800 px-4 py-2">
        <div className="text-gray-500 text-xs">
          Showing line-by-line differences between versions
        </div>
      </div>
    </div>
  );
}
