"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

interface MermaidViewerProps {
  content: string;
  status?: "streaming" | "idle";
}

export function MermaidViewer({ content, status }: MermaidViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize Mermaid only once
    if (!isInitialized) {
      mermaid.initialize({
        startOnLoad: false,
        theme: "default",
        securityLevel: "loose",
        fontFamily: "inherit",
        fontSize: 14,
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
        },
        sequence: {
          useMaxWidth: true,
        },
        gantt: {
          useMaxWidth: true,
        },
        class: {
          useMaxWidth: true,
        },
        state: {
          useMaxWidth: true,
        },
        er: {
          useMaxWidth: true,
        },
      });
      setIsInitialized(true);
    }
  }, [isInitialized]);

  useEffect(() => {
    if (!isInitialized || !content.trim() || status === "streaming") {
      return;
    }

    const renderDiagram = async () => {
      if (!containerRef.current) return;

      try {
        setError(null);
        
        // Clear previous content
        containerRef.current.innerHTML = "";
        
        // Generate unique ID for this diagram
        const diagramId = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Validate and render the diagram
        const { svg } = await mermaid.render(diagramId, content);
        
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err) {
        console.error("Mermaid rendering error:", err);
        setError(
          err instanceof Error 
            ? `Diagram syntax error: ${err.message}` 
            : "Failed to render diagram. Please check the Mermaid syntax."
        );
      }
    };

    renderDiagram();
  }, [content, status, isInitialized]);

  if (status === "streaming") {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <div className="text-sm text-muted-foreground">
            Generating diagram...
          </div>
        </div>
      </div>
    );
  }

  if (!content.trim()) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center text-muted-foreground">
          <div className="text-lg font-medium">No diagram content</div>
          <div className="text-sm">
            Diagram content will appear here once generated
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="mb-2 text-lg font-medium text-destructive">
            Rendering Error
          </div>
          <div className="text-sm text-muted-foreground mb-4">
            {error}
          </div>
          <div className="text-xs text-muted-foreground">
            Please check your Mermaid syntax and try again.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center overflow-auto">
      <div 
        ref={containerRef} 
        className="mermaid-container max-w-full"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "200px",
        }}
      />
    </div>
  );
}