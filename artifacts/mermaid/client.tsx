import { toast } from "sonner";
import { Artifact } from "@/components/create-artifact";
import {
  ClockRewind,
  CopyIcon,
  MessageIcon,
  RedoIcon,
  UndoIcon,
  CodeIcon,
  EyeIcon,
  SaveIcon,
  ZoomInIcon,
  ZoomOutIcon,
  ZoomResetIcon,
  PanIcon,
} from "@/components/icons";
import { MermaidViewer } from "@/components/mermaid-viewer";
import { MermaidCodeEditor } from "@/components/mermaid-code-editor";
import { MermaidDiffViewer } from "@/components/mermaid-diff-viewer";
import { WrenchIcon } from "lucide-react";

export const mermaidArtifact = new Artifact<"mermaid code", {
  isCodeView?: boolean;
  hasRenderError?: boolean;
  draftContent?: string;
  hasUnsavedChanges?: boolean;
  savedContent?: string;
  isRerendering?: boolean;
  zoom?: number;
  isPanning?: boolean;
}>({
  kind: "mermaid code",
  description: "Useful for creating diagrams, flowcharts, and visualizations using Mermaid syntax.",
  initialize: ({ setMetadata }) => {
    setMetadata({
      isCodeView: false,
      hasRenderError: false,
      draftContent: "",
      hasUnsavedChanges: false,
      savedContent: "",
      isRerendering: false,
      zoom: 1,
      isPanning: false,
    });
  },
  onStreamPart: ({ streamPart, setArtifact, setMetadata }) => {
    if (streamPart.type === "data-codeDelta") {
      setArtifact((draftArtifact) => {
        const newContent = streamPart.data;
        return {
          ...draftArtifact,
          content: newContent,
          // Show panel when streaming starts and we have content
          isVisible: draftArtifact.status === "streaming" && newContent.length > 0
            ? true
            : draftArtifact.isVisible,
          status: "streaming",
        };
      });

      // Reset draft content and unsaved changes when streaming
      setMetadata((metadata) => ({
        ...metadata,
        draftContent: "",
        hasUnsavedChanges: false,
      }));
    }
  },
  content: ({
    content,
    status,
    isLoading,
    metadata,
    setMetadata,
    mode,
    currentVersionIndex,
    getDocumentContentById,
  }) => {
    const isCodeView = metadata?.isCodeView || false;
    const hasRenderError = metadata?.hasRenderError || false;
    const draftContent = metadata?.draftContent || "";

    const handleError = (errorMessage: string) => {
      setMetadata({ ...metadata, hasRenderError: true });
    };

    if (isLoading) {
      return (
        <div className="flex h-full items-center justify-center">
          <div className="animate-pulse text-muted-foreground">
            Loading diagram...
          </div>
        </div>
      );
    }

    // Diff mode: Show code comparison like document artifact
    if (mode === "diff") {
      const oldContent = getDocumentContentById(currentVersionIndex - 1);
      const newContent = getDocumentContentById(currentVersionIndex);

      return (
        <div className="flex flex-row px-4 py-8 md:p-20">
          <MermaidDiffViewer
            oldContent={oldContent}
            newContent={newContent}
            oldVersion={currentVersionIndex}
            newVersion={currentVersionIndex + 1}
          />
        </div>
      );
    }

    // Edit mode: Show either code editor or diagram viewer
    if (isCodeView) {
      // Store the saved content on first render in code view
      const savedContent = metadata?.savedContent;
      if (!savedContent || savedContent !== content) {
        setMetadata({
          ...metadata,
          savedContent: content,
        });
      }

      // Use draft content if available, otherwise use saved content
      const displayContent = draftContent || content;

      return (
        <div className="h-full w-full">
          <MermaidCodeEditor
            content={displayContent}
            onChange={(newContent) => {
              // Compare against the saved content we stored
              const savedContentToCompare = metadata?.savedContent || content;
              const hasChanges = newContent !== savedContentToCompare;

              console.log('🔧 [MERMAID] onChange fired');
              console.log('🔧 [MERMAID] newContent length:', newContent.length);
              console.log('🔧 [MERMAID] savedContent length:', savedContentToCompare.length);
              console.log('🔧 [MERMAID] hasChanges:', hasChanges);

              setMetadata({
                ...metadata,
                draftContent: newContent,
                hasUnsavedChanges: hasChanges,
                savedContent: savedContentToCompare,
              });
            }}
            readOnly={false}
          />
        </div>
      );
    }

    // Default: diagram view - always show saved content
    const isRerendering = metadata?.isRerendering || false;

    if (isRerendering) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <div className="text-sm text-muted-foreground">Rendering diagram...</div>
        </div>
      );
    }

    const zoom = metadata?.zoom || 1;
    const isPanning = metadata?.isPanning || false;

    return (
      <div className="flex h-full w-full items-center justify-center">
        <MermaidViewer
          content={content}
          status={status}
          onError={handleError}
          zoom={zoom}
          isPanning={isPanning}
        />
      </div>
    );
  },
  actions: [
    {
      icon: <EyeIcon size={18} />,
      description: "View rendered diagram",
      onClick: async ({ setMetadata, metadata, onSaveContent }) => {
        const hasUnsavedChanges = metadata?.hasUnsavedChanges || false;
        const draftContent = metadata?.draftContent || "";

        // If there are unsaved changes, save them first
        if (hasUnsavedChanges && draftContent) {
          console.log('💾 [MERMAID] Auto-saving before switching to diagram view');

          // Show re-rendering state
          setMetadata({
            ...metadata,
            isRerendering: true,
          });

          // Save the changes (no debounce)
          onSaveContent(draftContent, false);

          // Small delay to allow save to complete
          await new Promise(resolve => setTimeout(resolve, 300));

          // Clear draft and switch to diagram view
          setMetadata({
            ...metadata,
            isCodeView: false,
            hasRenderError: false,
            hasUnsavedChanges: false,
            draftContent: "",
            isRerendering: false,
          });

          toast.success("Changes saved and diagram updated!");
        } else {
          // No changes, just switch view
          setMetadata({
            ...metadata,
            isCodeView: false,
            hasRenderError: false,
            isRerendering: false,
          });
        }
      },
    },
    {
      icon: <CodeIcon size={18} />,
      description: "View code editor",
      onClick: ({ setMetadata, metadata }) => {
        setMetadata({ ...metadata, isCodeView: true });
      },
    },
    {
      icon: <SaveIcon size={18} />,
      description: "Save changes",
      onClick: ({ metadata, setMetadata, onSaveContent }) => {
        const draftContent = metadata?.draftContent || "";
        if (draftContent) {
          // Save immediately without debounce
          onSaveContent(draftContent, false);

          // Clear draft and unsaved flag
          setMetadata({
            ...metadata,
            hasUnsavedChanges: false,
            draftContent: "",
          });

          toast.success("Changes saved!");
        }
      },
      isDisabled: ({ metadata }) => {
        return !(metadata?.hasUnsavedChanges === true);
      },
    },
    {
      icon: <ClockRewind size={18} />,
      description: "View changes",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("toggle");
      },
      isDisabled: ({ currentVersionIndex }) => {
        if (currentVersionIndex === 0) {
          return true;
        }
        return false;
      },
    },
    {
      icon: <UndoIcon size={18} />,
      description: "View Previous version",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("prev");
      },
      isDisabled: ({ currentVersionIndex }) => {
        if (currentVersionIndex === 0) {
          return true;
        }
        return false;
      },
    },
    {
      icon: <RedoIcon size={18} />,
      description: "View Next version",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("next");
      },
      isDisabled: ({ isCurrentVersion }) => {
        if (isCurrentVersion) {
          return true;
        }
        return false;
      },
    },
    {
      icon: <CopyIcon size={18} />,
      description: "Copy diagram code to clipboard",
      onClick: ({ content }) => {
        navigator.clipboard.writeText(content);
        toast.success("Copied to clipboard!");
      },
    },
    {
      icon: <ZoomInIcon size={18} />,
      description: "Zoom in",
      onClick: ({ metadata, setMetadata }) => {
        const currentZoom = metadata?.zoom || 1;
        const newZoom = Math.min(currentZoom + 0.25, 3);
        setMetadata({ ...metadata, zoom: newZoom });
      },
    },
    {
      icon: <ZoomOutIcon size={18} />,
      description: "Zoom out",
      onClick: ({ metadata, setMetadata }) => {
        const currentZoom = metadata?.zoom || 1;
        const newZoom = Math.max(currentZoom - 0.25, 0.5);
        setMetadata({ ...metadata, zoom: newZoom });
      },
    },
    {
      icon: <ZoomResetIcon size={18} />,
      description: "Reset zoom",
      onClick: ({ metadata, setMetadata }) => {
        setMetadata({ ...metadata, zoom: 1 });
      },
    },
    {
      icon: <PanIcon size={18} />,
      description: "Toggle pan mode",
      onClick: ({ metadata, setMetadata }) => {
        const isPanning = metadata?.isPanning || false;
        setMetadata({ ...metadata, isPanning: !isPanning });
      },
    },
  ],
  toolbar: [
    {
      icon: <WrenchIcon />,
      description: "Fix syntax errors",
      onClick: ({ sendMessage, documentId }) => {
        sendMessage({
          role: "user",
          parts: [
            {
              type: "text",
              text: `Please fix the syntax errors in the Mermaid diagram with ID ${documentId}`,
            },
          ],
        });
      },
      isVisible: ({ metadata }) => {
        // Only show when there's a render error
        return metadata?.hasRenderError === true;
      },
    },
    {
      icon: <MessageIcon />,
      description: "Improve diagram",
      onClick: ({ sendMessage, documentId }) => {
        sendMessage({
          role: "user",
          parts: [
            {
              type: "text",
              text: `Please improve the Mermaid diagram${documentId ? ` (Document ID: ${documentId})` : ''} by adding more details, better formatting, or clearer relationships.`,
            },
          ],
        });
      },
    },
  ],
});
