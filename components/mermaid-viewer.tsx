"use client";

import mermaid from "mermaid";
import { useEffect, useRef, useState } from "react";

type MermaidViewerProps = {
  content: string;
  status?: "streaming" | "idle";
  onError?: (errorMessage: string) => void;
  zoom?: number;
  isPanning?: boolean;
};

export function MermaidViewer({
  content,
  status,
  onError,
  zoom = 1,
  isPanning = false,
}: MermaidViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgWrapperRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPanningActive, setIsPanningActive] = useState(false);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Initialize Mermaid only once
    if (!isInitialized) {
      mermaid.initialize({
        startOnLoad: false,
        theme: "default",
        securityLevel: "loose",
        fontFamily: "inherit",
        fontSize: 14,
        suppressErrorRendering: true,
        flowchart: {
          useMaxWidth: false,
          htmlLabels: true,
        },
        sequence: {
          useMaxWidth: false,
        },
        gantt: {
          useMaxWidth: false,
        },
        class: {
          useMaxWidth: false,
        },
        state: {
          useMaxWidth: false,
        },
        er: {
          useMaxWidth: false,
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
      if (!containerRef.current) {
        return;
      }

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
        const errorMessage =
          err instanceof Error
            ? `Diagram syntax error: ${err.message}`
            : "Failed to render diagram. Please check the Mermaid syntax.";
        setError(errorMessage);

        // Notify parent component about the error
        if (onError) {
          onError(errorMessage);
        }
      }
    };

    renderDiagram();
  }, [content, status, isInitialized, onError]);

  if (status === "streaming") {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <div className="text-muted-foreground text-sm">
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
          <div className="font-medium text-lg">No diagram content</div>
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
          <div className="mb-2 font-medium text-destructive text-lg">
            Rendering Error
          </div>
          <div className="mb-4 text-muted-foreground text-sm">{error}</div>
          <div className="text-muted-foreground text-xs">
            Please check your Mermaid syntax and try again.
          </div>
        </div>
      </div>
    );
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isPanning) {
      setIsPanningActive(true);
      setDragStart({
        x: e.clientX - panPosition.x,
        y: e.clientY - panPosition.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanningActive && isPanning) {
      setPanPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanningActive(false);
  };

  return (
    <div
      className="flex h-full w-full items-center justify-center"
      onMouseDown={handleMouseDown}
      onMouseLeave={handleMouseUp}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{ overflow: "hidden" }}
    >
      <div
        ref={svgWrapperRef}
        style={{
          transform: `scale(${zoom}) translate(${panPosition.x / zoom}px, ${panPosition.y / zoom}px)`,
          transformOrigin: "center center",
          transition: isPanningActive ? "none" : "transform 0.2s ease-out",
          cursor: isPanning
            ? isPanningActive
              ? "grabbing"
              : "grab"
            : "default",
        }}
      >
        <div
          className="mermaid-container"
          ref={containerRef}
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "200px",
          }}
        />
      </div>
    </div>
  );
}
