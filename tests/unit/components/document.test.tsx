/**
 * Unit tests for Document Viewer (Text Artifact)
 * Tests cover: document display, edit mode, version navigation, diff viewer, and suggestion display
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { textArtifact } from "@/artifacts/text/client";
import type { Suggestion } from "@/lib/db/drizzle-schema";
import { render, screen } from "@/tests/helpers/test-utils";

// Mock dependencies
vi.mock("@/artifacts/actions", () => ({
  getSuggestions: vi.fn(),
}));

vi.mock("@/components/text-editor", () => ({
  Editor: vi.fn(({ content, suggestions, status }) => (
    <div data-testid="editor">
      <div data-testid="editor-content">{content}</div>
      <div data-testid="editor-status">{status}</div>
      {suggestions && suggestions.length > 0 && (
        <div data-testid="editor-suggestions">
          {suggestions.map((s: Suggestion) => (
            <div data-testid={`suggestion-${s.id}`} key={s.id}>
              {s.originalText}
            </div>
          ))}
        </div>
      )}
    </div>
  )),
}));

vi.mock("@/components/diffview", () => ({
  DiffView: vi.fn(({ oldContent, newContent }) => (
    <div data-testid="diff-view">
      <div data-testid="diff-old">{oldContent}</div>
      <div data-testid="diff-new">{newContent}</div>
    </div>
  )),
}));

vi.mock("@/components/document-skeleton", () => ({
  DocumentSkeleton: vi.fn(() => (
    <div data-testid="document-skeleton">Loading...</div>
  )),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Document Viewer (Text Artifact)", () => {
  const mockSetMetadata = vi.fn();
  const mockSetArtifact = vi.fn();
  const mockOnSaveContent = vi.fn();
  const mockGetDocumentContentById = vi.fn();
  const mockHandleVersionChange = vi.fn();
  const mockSendMessage = vi.fn();

  const defaultProps = {
    mode: "edit" as const,
    status: "idle" as const,
    content: "Test document content",
    isCurrentVersion: true,
    currentVersionIndex: 0,
    onSaveContent: mockOnSaveContent,
    getDocumentContentById: mockGetDocumentContentById,
    isLoading: false,
    metadata: {
      suggestions: [] as Suggestion[],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Document Display", () => {
    it("should render document content in editor", () => {
      const Content = textArtifact.content;
      render(<Content {...defaultProps} />);

      expect(screen.getByTestId("editor")).toBeInTheDocument();
      expect(screen.getByTestId("editor-content")).toHaveTextContent(
        "Test document content"
      );
    });

    it("should display loading skeleton when isLoading is true", () => {
      const Content = textArtifact.content;
      render(<Content {...defaultProps} isLoading={true} />);

      expect(screen.getByTestId("document-skeleton")).toBeInTheDocument();
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("should render empty document when content is empty", () => {
      const Content = textArtifact.content;
      render(<Content {...defaultProps} content="" />);

      expect(screen.getByTestId("editor")).toBeInTheDocument();
      expect(screen.getByTestId("editor-content")).toHaveTextContent("");
    });

    it("should display correct status", () => {
      const Content = textArtifact.content;
      render(<Content {...defaultProps} status="streaming" />);

      expect(screen.getByTestId("editor-status")).toHaveTextContent(
        "streaming"
      );
    });

    it("should handle long content", () => {
      const longContent = "A".repeat(10_000);
      const Content = textArtifact.content;
      render(<Content {...defaultProps} content={longContent} />);

      expect(screen.getByTestId("editor-content")).toHaveTextContent(
        longContent
      );
    });
  });

  describe("Edit Mode Toggle", () => {
    it("should render editor in edit mode by default", () => {
      const Content = textArtifact.content;
      render(<Content {...defaultProps} mode="edit" />);

      expect(screen.getByTestId("editor")).toBeInTheDocument();
      expect(screen.queryByTestId("diff-view")).not.toBeInTheDocument();
    });

    it("should switch to diff mode", () => {
      mockGetDocumentContentById.mockImplementation((index: number) => {
        if (index === 0) {
          return "Version 1 content";
        }
        if (index === 1) {
          return "Version 2 content";
        }
        return "";
      });

      const Content = textArtifact.content;
      render(<Content {...defaultProps} currentVersionIndex={1} mode="diff" />);

      expect(screen.getByTestId("diff-view")).toBeInTheDocument();
      expect(screen.queryByTestId("editor")).not.toBeInTheDocument();
    });

    it("should pass correct version content to diff view", () => {
      mockGetDocumentContentById.mockImplementation((index: number) => {
        if (index === 0) {
          return "Old version";
        }
        if (index === 1) {
          return "New version";
        }
        return "";
      });

      const Content = textArtifact.content;
      render(<Content {...defaultProps} currentVersionIndex={1} mode="diff" />);

      expect(screen.getByTestId("diff-old")).toHaveTextContent("Old version");
      expect(screen.getByTestId("diff-new")).toHaveTextContent("New version");
    });
  });

  describe("Version Navigation", () => {
    describe("View Changes Action", () => {
      it("should have view changes action", () => {
        const viewChangesAction = textArtifact.actions[0];
        expect(viewChangesAction.description).toBe("View changes");
      });

      it("should toggle diff view on click", () => {
        const viewChangesAction = textArtifact.actions[0];
        viewChangesAction.onClick({
          handleVersionChange: mockHandleVersionChange,
        } as any);

        expect(mockHandleVersionChange).toHaveBeenCalledWith("toggle");
      });

      it("should be disabled when on version 0", () => {
        const viewChangesAction = textArtifact.actions[0];
        const isDisabled = viewChangesAction.isDisabled?.({
          currentVersionIndex: 0,
        } as any);

        expect(isDisabled).toBe(true);
      });

      it("should be enabled when not on version 0", () => {
        const viewChangesAction = textArtifact.actions[0];
        const isDisabled = viewChangesAction.isDisabled?.({
          currentVersionIndex: 1,
        } as any);

        expect(isDisabled).toBe(false);
      });
    });

    describe("Previous Version Action", () => {
      it("should have previous version action", () => {
        const prevAction = textArtifact.actions[1];
        expect(prevAction.description).toBe("View Previous version");
      });

      it("should navigate to previous version on click", () => {
        const prevAction = textArtifact.actions[1];
        prevAction.onClick({
          handleVersionChange: mockHandleVersionChange,
        } as any);

        expect(mockHandleVersionChange).toHaveBeenCalledWith("prev");
      });

      it("should be disabled on version 0", () => {
        const prevAction = textArtifact.actions[1];
        const isDisabled = prevAction.isDisabled?.({
          currentVersionIndex: 0,
        } as any);

        expect(isDisabled).toBe(true);
      });

      it("should be enabled on later versions", () => {
        const prevAction = textArtifact.actions[1];
        const isDisabled = prevAction.isDisabled?.({
          currentVersionIndex: 2,
        } as any);

        expect(isDisabled).toBe(false);
      });
    });

    describe("Next Version Action", () => {
      it("should have next version action", () => {
        const nextAction = textArtifact.actions[2];
        expect(nextAction.description).toBe("View Next version");
      });

      it("should navigate to next version on click", () => {
        const nextAction = textArtifact.actions[2];
        nextAction.onClick({
          handleVersionChange: mockHandleVersionChange,
        } as any);

        expect(mockHandleVersionChange).toHaveBeenCalledWith("next");
      });

      it("should be disabled when on current version", () => {
        const nextAction = textArtifact.actions[2];
        const isDisabled = nextAction.isDisabled?.({
          isCurrentVersion: true,
        } as any);

        expect(isDisabled).toBe(true);
      });

      it("should be enabled when viewing older versions", () => {
        const nextAction = textArtifact.actions[2];
        const isDisabled = nextAction.isDisabled?.({
          isCurrentVersion: false,
        } as any);

        expect(isDisabled).toBe(false);
      });
    });

    describe("Copy to Clipboard Action", () => {
      it("should have copy to clipboard action", () => {
        const copyAction = textArtifact.actions[3];
        expect(copyAction.description).toBe("Copy to clipboard");
      });

      it("should copy content to clipboard on click", async () => {
        const mockWriteText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, "clipboard", {
          value: {
            writeText: mockWriteText,
          },
          writable: true,
          configurable: true,
        });

        const copyAction = textArtifact.actions[3];
        await copyAction.onClick({ content: "Test content to copy" } as any);

        expect(mockWriteText).toHaveBeenCalledWith("Test content to copy");
      });
    });
  });

  describe("Diff Viewer", () => {
    it("should display diff view when mode is diff", () => {
      mockGetDocumentContentById.mockImplementation((index: number) => {
        return index === 0 ? "Original text" : "Modified text";
      });

      const Content = textArtifact.content;
      render(<Content {...defaultProps} currentVersionIndex={1} mode="diff" />);

      expect(screen.getByTestId("diff-view")).toBeInTheDocument();
    });

    it("should show old and new content in diff view", () => {
      mockGetDocumentContentById.mockImplementation((index: number) => {
        if (index === 0) {
          return "This is the old content.";
        }
        if (index === 1) {
          return "This is the new content.";
        }
        return "";
      });

      const Content = textArtifact.content;
      render(<Content {...defaultProps} currentVersionIndex={1} mode="diff" />);

      expect(screen.getByTestId("diff-old")).toHaveTextContent(
        "This is the old content."
      );
      expect(screen.getByTestId("diff-new")).toHaveTextContent(
        "This is the new content."
      );
    });

    it("should handle empty old version in diff", () => {
      mockGetDocumentContentById.mockImplementation((index: number) => {
        return index === 1 ? "New content" : "";
      });

      const Content = textArtifact.content;
      render(<Content {...defaultProps} currentVersionIndex={1} mode="diff" />);

      expect(screen.getByTestId("diff-old")).toHaveTextContent("");
      expect(screen.getByTestId("diff-new")).toHaveTextContent("New content");
    });

    it("should compare correct version indices", () => {
      mockGetDocumentContentById.mockImplementation((index: number) => {
        return `Version ${index} content`;
      });

      const Content = textArtifact.content;
      render(<Content {...defaultProps} currentVersionIndex={3} mode="diff" />);

      expect(mockGetDocumentContentById).toHaveBeenCalledWith(2); // previous version
      expect(mockGetDocumentContentById).toHaveBeenCalledWith(3); // current version
    });
  });

  describe("Suggestion Display", () => {
    const mockSuggestions: Suggestion[] = [
      {
        id: "sugg-1",
        documentId: "doc-1",
        originalText: "old text",
        suggestedText: "new text",
        description: "Improve clarity",
        documentCreatedAt: new Date(),
        selectionStart: 0,
        selectionEnd: 8,
      } as Suggestion,
      {
        id: "sugg-2",
        documentId: "doc-1",
        originalText: "another text",
        suggestedText: "better text",
        description: "Grammar fix",
        documentCreatedAt: new Date(),
        selectionStart: 10,
        selectionEnd: 22,
      } as Suggestion,
    ];

    it("should render editor without suggestions when metadata has empty array", () => {
      const Content = textArtifact.content;
      render(<Content {...defaultProps} metadata={{ suggestions: [] }} />);

      expect(screen.getByTestId("editor")).toBeInTheDocument();
      expect(
        screen.queryByTestId("editor-suggestions")
      ).not.toBeInTheDocument();
    });

    it("should pass suggestions to editor", () => {
      const Content = textArtifact.content;
      render(
        <Content
          {...defaultProps}
          metadata={{ suggestions: mockSuggestions }}
        />
      );

      expect(screen.getByTestId("editor-suggestions")).toBeInTheDocument();
      expect(screen.getByTestId("suggestion-sugg-1")).toHaveTextContent(
        "old text"
      );
      expect(screen.getByTestId("suggestion-sugg-2")).toHaveTextContent(
        "another text"
      );
    });

    it("should handle single suggestion", () => {
      const Content = textArtifact.content;
      render(
        <Content
          {...defaultProps}
          metadata={{ suggestions: [mockSuggestions[0]] }}
        />
      );

      expect(screen.getByTestId("suggestion-sugg-1")).toBeInTheDocument();
      expect(screen.queryByTestId("suggestion-sugg-2")).not.toBeInTheDocument();
    });

    it("should handle multiple suggestions", () => {
      const Content = textArtifact.content;
      render(
        <Content
          {...defaultProps}
          metadata={{ suggestions: mockSuggestions }}
        />
      );

      expect(screen.getByTestId("suggestion-sugg-1")).toBeInTheDocument();
      expect(screen.getByTestId("suggestion-sugg-2")).toBeInTheDocument();
    });

    it("should display shrink div when suggestions exist on mobile", () => {
      const Content = textArtifact.content;
      const { container } = render(
        <Content
          {...defaultProps}
          metadata={{ suggestions: mockSuggestions }}
        />
      );

      // Check for the shrink div with md:hidden class
      const shrinkDiv = container.querySelector(".md\\:hidden");
      expect(shrinkDiv).toBeInTheDocument();
    });

    it("should not display shrink div when no suggestions", () => {
      const Content = textArtifact.content;
      const { container } = render(
        <Content {...defaultProps} metadata={{ suggestions: [] }} />
      );

      const shrinkDiv = container.querySelector(".md\\:hidden");
      expect(shrinkDiv).not.toBeInTheDocument();
    });
  });

  describe("Streaming Updates", () => {
    it("should handle textDelta stream part", () => {
      const streamPart = {
        type: "data-textDelta" as const,
        data: " more content",
      };

      const mockCurrentArtifact = {
        content: "Initial content",
        status: "streaming" as const,
        isVisible: false,
      };

      let updatedArtifact: any;
      const mockSetArtifactFn = vi.fn((updateFn) => {
        updatedArtifact = updateFn(mockCurrentArtifact);
      });

      textArtifact.onStreamPart?.({
        streamPart,
        setMetadata: mockSetMetadata,
        setArtifact: mockSetArtifactFn,
      } as any);

      expect(mockSetArtifactFn).toHaveBeenCalled();
      expect(updatedArtifact.content).toBe("Initial content more content");
      expect(updatedArtifact.status).toBe("streaming");
      expect(updatedArtifact.isVisible).toBe(true);
    });

    it("should handle suggestion stream part", () => {
      const streamPart = {
        type: "data-suggestion" as const,
        data: {
          id: "new-sugg",
          originalText: "test",
          suggestedText: "improved",
        },
      };

      const mockCurrentMetadata = {
        suggestions: [] as Suggestion[],
      };

      let updatedMetadata: any;
      const mockSetMetadataFn = vi.fn((updateFn) => {
        updatedMetadata = updateFn(mockCurrentMetadata);
      });

      textArtifact.onStreamPart?.({
        streamPart,
        setMetadata: mockSetMetadataFn,
        setArtifact: mockSetArtifact,
      } as any);

      expect(mockSetMetadataFn).toHaveBeenCalled();
      expect(updatedMetadata.suggestions).toHaveLength(1);
      expect(updatedMetadata.suggestions[0].id).toBe("new-sugg");
    });

    it("should append multiple textDelta updates", () => {
      const streamParts = [
        { type: "data-textDelta" as const, data: "First " },
        { type: "data-textDelta" as const, data: "Second " },
        { type: "data-textDelta" as const, data: "Third" },
      ];

      let currentArtifact = {
        content: "",
        status: "streaming" as const,
        isVisible: false,
      };

      streamParts.forEach((streamPart) => {
        textArtifact.onStreamPart?.({
          streamPart,
          setMetadata: mockSetMetadata,
          setArtifact: (updateFn: any) => {
            currentArtifact = updateFn(currentArtifact);
          },
        } as any);
      });

      expect(currentArtifact.content).toBe("First Second Third");
    });
  });

  describe("Toolbar Actions", () => {
    it("should have add final polish toolbar action", () => {
      const polishAction = textArtifact.toolbar?.[0];
      expect(polishAction?.description).toBe("Add final polish");
    });

    it("should send message for final polish", () => {
      const polishAction = textArtifact.toolbar?.[0];
      polishAction?.onClick({
        sendMessage: mockSendMessage,
        documentId: "doc-123",
      } as any);

      expect(mockSendMessage).toHaveBeenCalledWith({
        role: "user",
        parts: [
          {
            type: "text",
            text: expect.stringContaining(
              "Please add final polish to the document"
            ),
          },
        ],
      });
    });

    it("should have request suggestions toolbar action", () => {
      const suggestionsAction = textArtifact.toolbar?.[1];
      expect(suggestionsAction?.description).toBe("Request suggestions");
    });

    it("should send message for suggestions", () => {
      const suggestionsAction = textArtifact.toolbar?.[1];
      suggestionsAction?.onClick({
        sendMessage: mockSendMessage,
        documentId: "doc-456",
      } as any);

      expect(mockSendMessage).toHaveBeenCalledWith({
        role: "user",
        parts: [
          {
            type: "text",
            text: expect.stringContaining("Please analyze the document"),
          },
        ],
      });
    });
  });

  describe("Initialization", () => {
    it("should fetch suggestions on initialize", async () => {
      const { getSuggestions } = await import("@/artifacts/actions");
      vi.mocked(getSuggestions).mockResolvedValue([]);

      await textArtifact.initialize?.({
        documentId: "doc-789",
        setMetadata: mockSetMetadata,
      } as any);

      expect(getSuggestions).toHaveBeenCalledWith({ documentId: "doc-789" });
      expect(mockSetMetadata).toHaveBeenCalledWith({ suggestions: [] });
    });

    it("should set metadata with fetched suggestions", async () => {
      const mockFetchedSuggestions: Suggestion[] = [
        {
          id: "fetch-1",
          documentId: "doc-789",
          originalText: "fetched",
          suggestedText: "retrieved",
          description: "Test",
          documentCreatedAt: new Date(),
          selectionStart: 0,
          selectionEnd: 7,
        } as Suggestion,
      ];

      const { getSuggestions } = await import("@/artifacts/actions");
      vi.mocked(getSuggestions).mockResolvedValue(mockFetchedSuggestions);

      await textArtifact.initialize?.({
        documentId: "doc-789",
        setMetadata: mockSetMetadata,
      } as any);

      expect(mockSetMetadata).toHaveBeenCalledWith({
        suggestions: mockFetchedSuggestions,
      });
    });
  });

  describe("Artifact Configuration", () => {
    it("should have correct kind", () => {
      expect(textArtifact.kind).toBe("text");
    });

    it("should have description", () => {
      expect(textArtifact.description).toBe(
        "Useful for text content, like drafting essays and emails."
      );
    });

    it("should have 4 actions", () => {
      expect(textArtifact.actions).toHaveLength(4);
    });

    it("should have 2 toolbar items", () => {
      expect(textArtifact.toolbar).toHaveLength(2);
    });
  });
});
