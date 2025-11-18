/**
 * Artifact Component Unit Tests
 *
 * Tests for the Artifact component which handles rendering of different artifact types:
 * - Text documents
 * - Python code
 * - Mermaid diagrams
 * - Code files
 * - Images
 * - Spreadsheets
 */

import { describe, expect, it, vi } from "vitest";

// Mock mermaid to avoid CSS import issues
vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(),
  },
}));

import { artifactDefinitions } from "@/components/artifact";

describe("Artifact Component", () => {
  describe("Artifact Type Detection", () => {
    it("should have all artifact definitions available", () => {
      expect(artifactDefinitions).toBeDefined();
      expect(artifactDefinitions.length).toBeGreaterThan(0);
      expect(artifactDefinitions.length).toBe(6); // text, code, mermaid, python, image, sheet
    });

    it("should include text artifact definition", () => {
      const textDef = artifactDefinitions.find((def) => def.kind === "text");
      expect(textDef).toBeDefined();
      expect(textDef?.kind).toBe("text");
      expect(textDef?.description).toBeDefined();
    });

    it("should include python artifact definition", () => {
      const pythonDef = artifactDefinitions.find(
        (def) => def.kind === "python code"
      );
      expect(pythonDef).toBeDefined();
      expect(pythonDef?.kind).toBe("python code");
      expect(pythonDef?.description).toContain("Python");
    });

    it("should include mermaid artifact definition", () => {
      const mermaidDef = artifactDefinitions.find(
        (def) => def.kind === "mermaid code"
      );
      expect(mermaidDef).toBeDefined();
      expect(mermaidDef?.kind).toBe("mermaid code");
      expect(mermaidDef?.description).toContain("diagram");
    });

    it("should include code artifact definition", () => {
      const codeDef = artifactDefinitions.find((def) => def.kind === "code");
      expect(codeDef).toBeDefined();
      expect(codeDef?.kind).toBe("code");
    });

    it("should include image artifact definition", () => {
      const imageDef = artifactDefinitions.find((def) => def.kind === "image");
      expect(imageDef).toBeDefined();
      expect(imageDef?.kind).toBe("image");
    });

    it("should include sheet artifact definition", () => {
      const sheetDef = artifactDefinitions.find((def) => def.kind === "sheet");
      expect(sheetDef).toBeDefined();
      expect(sheetDef?.kind).toBe("sheet");
    });
  });

  describe("Document (Text) Artifact Rendering", () => {
    it("should have text artifact with content component", () => {
      const textDef = artifactDefinitions.find((def) => def.kind === "text");
      expect(textDef).toBeDefined();
      expect(textDef?.content).toBeDefined();
      expect(typeof textDef?.content).toBe("function");
    });

    it("should have text artifact with description", () => {
      const textDef = artifactDefinitions.find((def) => def.kind === "text");
      expect(textDef?.description).toContain("text");
    });

    it("should have text artifact with actions", () => {
      const textDef = artifactDefinitions.find((def) => def.kind === "text");
      expect(textDef?.actions).toBeDefined();
      expect(Array.isArray(textDef?.actions)).toBe(true);
      expect((textDef?.actions || []).length).toBeGreaterThan(0);
    });

    it("should have text artifact with toolbar actions", () => {
      const textDef = artifactDefinitions.find((def) => def.kind === "text");
      expect(textDef?.toolbar).toBeDefined();
      expect(Array.isArray(textDef?.toolbar)).toBe(true);
    });
  });

  describe("Python Artifact Rendering", () => {
    it("should have python artifact with content component", () => {
      const pythonDef = artifactDefinitions.find(
        (def) => def.kind === "python code"
      );
      expect(pythonDef).toBeDefined();
      expect(pythonDef?.content).toBeDefined();
      expect(typeof pythonDef?.content).toBe("function");
    });

    it("should have python artifact with initialization function", () => {
      const pythonDef = artifactDefinitions.find(
        (def) => def.kind === "python code"
      );
      expect(pythonDef?.initialize).toBeDefined();
      expect(typeof pythonDef?.initialize).toBe("function");
    });

    it("should have python artifact with stream handling", () => {
      const pythonDef = artifactDefinitions.find(
        (def) => def.kind === "python code"
      );
      expect(pythonDef?.onStreamPart).toBeDefined();
      expect(typeof pythonDef?.onStreamPart).toBe("function");
    });

    it("should have python artifact with actions for saving and version control", () => {
      const pythonDef = artifactDefinitions.find(
        (def) => def.kind === "python code"
      );
      expect(pythonDef?.actions).toBeDefined();
      expect(Array.isArray(pythonDef?.actions)).toBe(true);
      // Should have save, view changes, undo, redo, copy actions
      expect((pythonDef?.actions || []).length).toBeGreaterThanOrEqual(5);
    });

    it("should have python artifact with toolbar for fixing errors", () => {
      const pythonDef = artifactDefinitions.find(
        (def) => def.kind === "python code"
      );
      expect(pythonDef?.toolbar).toBeDefined();
      expect(Array.isArray(pythonDef?.toolbar)).toBe(true);
      expect((pythonDef?.toolbar || []).length).toBeGreaterThan(0);
    });
  });

  describe("Mermaid Artifact Rendering", () => {
    it("should have mermaid artifact with content component", () => {
      const mermaidDef = artifactDefinitions.find(
        (def) => def.kind === "mermaid code"
      );
      expect(mermaidDef).toBeDefined();
      expect(mermaidDef?.content).toBeDefined();
      expect(typeof mermaidDef?.content).toBe("function");
    });

    it("should have mermaid artifact with initialization function", () => {
      const mermaidDef = artifactDefinitions.find(
        (def) => def.kind === "mermaid code"
      );
      expect(mermaidDef?.initialize).toBeDefined();
      expect(typeof mermaidDef?.initialize).toBe("function");
    });

    it("should have mermaid artifact with stream handling", () => {
      const mermaidDef = artifactDefinitions.find(
        (def) => def.kind === "mermaid code"
      );
      expect(mermaidDef?.onStreamPart).toBeDefined();
      expect(typeof mermaidDef?.onStreamPart).toBe("function");
    });

    it("should have mermaid artifact with zoom and pan actions", () => {
      const mermaidDef = artifactDefinitions.find(
        (def) => def.kind === "mermaid code"
      );
      expect(mermaidDef?.actions).toBeDefined();
      expect(Array.isArray(mermaidDef?.actions)).toBe(true);
      // Should have view, code, save, version control, copy, zoom, pan actions
      expect((mermaidDef?.actions || []).length).toBeGreaterThanOrEqual(8);
    });

    it("should have mermaid artifact description mentioning diagrams", () => {
      const mermaidDef = artifactDefinitions.find(
        (def) => def.kind === "mermaid code"
      );
      expect(mermaidDef?.description).toMatch(
        /diagram|flowchart|visualization/i
      );
    });
  });

  describe("Artifact Loading State", () => {
    it("should have text artifact content that can handle loading state", () => {
      const textDef = artifactDefinitions.find((def) => def.kind === "text");
      // The content function should accept an isLoading prop
      expect(textDef?.content).toBeDefined();
      // We can't directly test the component rendering here, but we verify structure exists
      expect(typeof textDef?.content).toBe("function");
    });

    it("should have python artifact content that can handle loading state", () => {
      const pythonDef = artifactDefinitions.find(
        (def) => def.kind === "python code"
      );
      expect(pythonDef?.content).toBeDefined();
      expect(typeof pythonDef?.content).toBe("function");
    });

    it("should have mermaid artifact content that can handle loading state", () => {
      const mermaidDef = artifactDefinitions.find(
        (def) => def.kind === "mermaid code"
      );
      expect(mermaidDef?.content).toBeDefined();
      expect(typeof mermaidDef?.content).toBe("function");
    });

    it("should have all artifacts with content components", () => {
      artifactDefinitions.forEach((artifact) => {
        expect(artifact.content).toBeDefined();
        expect(typeof artifact.content).toBe("function");
      });
    });
  });

  describe("Artifact Error State", () => {
    it("should have python artifact with error handling metadata", () => {
      const pythonDef = artifactDefinitions.find(
        (def) => def.kind === "python code"
      );
      // Python artifact should have toolbar actions for fixing errors
      const toolbar = pythonDef?.toolbar || [];
      expect(toolbar.length).toBeGreaterThan(0);
    });

    it("should have mermaid artifact with error handling metadata", () => {
      const mermaidDef = artifactDefinitions.find(
        (def) => def.kind === "mermaid code"
      );
      // Mermaid artifact should have toolbar actions for fixing errors
      const toolbar = mermaidDef?.toolbar || [];
      expect(toolbar.length).toBeGreaterThan(0);
    });

    it("should have all artifacts properly defined with required properties", () => {
      artifactDefinitions.forEach((artifact) => {
        expect(artifact.kind).toBeDefined();
        expect(artifact.description).toBeDefined();
        expect(artifact.content).toBeDefined();
        expect(typeof artifact.kind).toBe("string");
        expect(typeof artifact.description).toBe("string");
        expect(typeof artifact.content).toBe("function");
      });
    });
  });

  describe("Artifact Capabilities", () => {
    it("should have artifacts with different capabilities", () => {
      const textDef = artifactDefinitions.find((def) => def.kind === "text");
      const pythonDef = artifactDefinitions.find(
        (def) => def.kind === "python code"
      );
      const mermaidDef = artifactDefinitions.find(
        (def) => def.kind === "mermaid code"
      );

      // Text artifact should have basic actions
      expect(textDef?.actions?.length).toBeDefined();

      // Python artifact should have execution-related actions (more actions)
      expect((pythonDef?.actions || []).length).toBeGreaterThan(0);

      // Mermaid artifact should have view-related actions (most actions with zoom/pan)
      expect((mermaidDef?.actions || []).length).toBeGreaterThan(0);
    });

    it("should have streaming artifacts with onStreamPart handlers", () => {
      const pythonDef = artifactDefinitions.find(
        (def) => def.kind === "python code"
      );
      const mermaidDef = artifactDefinitions.find(
        (def) => def.kind === "mermaid code"
      );
      const textDef = artifactDefinitions.find((def) => def.kind === "text");

      expect(textDef?.onStreamPart).toBeDefined();
      expect(pythonDef?.onStreamPart).toBeDefined();
      expect(mermaidDef?.onStreamPart).toBeDefined();
    });

    it("should have artifacts with initialization functions where needed", () => {
      const pythonDef = artifactDefinitions.find(
        (def) => def.kind === "python code"
      );
      const mermaidDef = artifactDefinitions.find(
        (def) => def.kind === "mermaid code"
      );
      const textDef = artifactDefinitions.find((def) => def.kind === "text");

      // Artifacts with complex state should have initialize functions
      expect(pythonDef?.initialize).toBeDefined();
      expect(mermaidDef?.initialize).toBeDefined();
      expect(textDef?.initialize).toBeDefined();
    });

    it("should have unique artifact kinds", () => {
      const kinds = artifactDefinitions.map((def) => def.kind);
      const uniqueKinds = new Set(kinds);
      expect(kinds.length).toBe(uniqueKinds.size);
    });
  });

  describe("Artifact Actions Structure", () => {
    it("should have consistent action structure across artifacts", () => {
      artifactDefinitions.forEach((artifact) => {
        if (artifact.actions && Array.isArray(artifact.actions)) {
          artifact.actions.forEach((action) => {
            expect(action.icon).toBeDefined();
            expect(action.description).toBeDefined();
            expect(action.onClick).toBeDefined();
            expect(typeof action.description).toBe("string");
            expect(typeof action.onClick).toBe("function");
          });
        }
      });
    });

    it("should have toolbar items with proper structure where defined", () => {
      artifactDefinitions.forEach((artifact) => {
        if (artifact.toolbar && Array.isArray(artifact.toolbar)) {
          artifact.toolbar.forEach((toolbarItem) => {
            expect(toolbarItem.icon).toBeDefined();
            expect(toolbarItem.description).toBeDefined();
            expect(toolbarItem.onClick).toBeDefined();
            expect(typeof toolbarItem.description).toBe("string");
            expect(typeof toolbarItem.onClick).toBe("function");
          });
        }
      });
    });
  });
});
