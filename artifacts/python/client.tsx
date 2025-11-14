import { FileTextIcon, WrenchIcon } from "lucide-react";
import { toast } from "sonner";
import { Artifact } from "@/components/create-artifact";
import {
  ClockRewind,
  CopyIcon,
  RedoIcon,
  SaveIcon,
  UndoIcon,
} from "@/components/icons";
import { PythonCodeEditor } from "@/components/python-code-editor";
import { PythonDiffViewer } from "@/components/python-diff-viewer";
import { PythonViewer } from "@/components/python-viewer";

export const pythonArtifact = new Artifact<
  "python code",
  {
    isCodeView?: boolean;
    hasExecutionError?: boolean;
    draftContent?: string;
    hasUnsavedChanges?: boolean;
    savedContent?: string;
    isExecuting?: boolean;
    executionOutput?: {
      stdout?: string;
      stderr?: string;
      error?: string;
      result?: any;
      plots?: string[];
    };
  }
>({
  kind: "python code",
  description:
    "Useful for creating Python scripts for data analysis, calculations, visualizations, and programming tasks. Supports in-browser execution via Pyodide.",
  initialize: ({ setMetadata }) => {
    setMetadata({
      isCodeView: false,
      hasExecutionError: false,
      draftContent: "",
      hasUnsavedChanges: false,
      savedContent: "",
      isExecuting: false,
      executionOutput: undefined,
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
          isVisible:
            draftArtifact.status === "streaming" && newContent.length > 0
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
        executionOutput: undefined, // Clear previous execution output
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
    const draftContent = metadata?.draftContent || "";
    const isExecuting = metadata?.isExecuting || false;
    const executionOutput = metadata?.executionOutput;

    const handleError = (_errorMessage: string) => {
      setMetadata({ ...metadata, hasExecutionError: true });
    };

    const handleExecute = async () => {
      setMetadata({ ...metadata, isExecuting: true });

      try {
        // Dynamically import Pyodide functions
        const { executePython } = await import("@/lib/pyodide/runner");
        const codeToExecute = draftContent || content;

        const result = await executePython(codeToExecute);

        setMetadata({
          ...metadata,
          isExecuting: false,
          executionOutput: result,
          hasExecutionError: !!result.error,
        });

        if (result.error) {
          toast.error("Execution error - check console");
        } else {
          toast.success("Code executed successfully!");
        }
      } catch (error) {
        console.error("Execution error:", error);
        setMetadata({
          ...metadata,
          isExecuting: false,
          executionOutput: {
            stdout: "",
            stderr: "",
            error: error instanceof Error ? error.message : String(error),
          },
          hasExecutionError: true,
        });
        toast.error("Failed to execute code");
      }
    };

    if (isLoading) {
      return (
        <div className="flex h-full items-center justify-center">
          <div className="animate-pulse text-muted-foreground">
            Loading code...
          </div>
        </div>
      );
    }

    // Diff mode: Show code comparison
    if (mode === "diff") {
      const oldContent = getDocumentContentById(currentVersionIndex - 1);
      const newContent = getDocumentContentById(currentVersionIndex);

      return (
        <div className="flex flex-row px-4 py-8 md:p-20">
          <PythonDiffViewer
            newContent={newContent}
            newVersion={currentVersionIndex + 1}
            oldContent={oldContent}
            oldVersion={currentVersionIndex}
          />
        </div>
      );
    }

    // Edit mode: Show code editor
    if (isCodeView) {
      const savedContent = metadata?.savedContent;
      if (!savedContent || savedContent !== content) {
        setMetadata({
          ...metadata,
          savedContent: content,
        });
      }

      const displayContent = draftContent || content;

      return (
        <div className="h-full w-full">
          <PythonCodeEditor
            content={displayContent}
            onChange={(newContent) => {
              const savedContentToCompare = metadata?.savedContent || content;
              const hasChanges = newContent !== savedContentToCompare;

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

    // Default: Python viewer with execution support
    const handleChange = (newContent: string) => {
      const savedContentToCompare = metadata?.savedContent || content;
      const hasChanges = newContent !== savedContentToCompare;

      setMetadata({
        ...metadata,
        draftContent: newContent,
        hasUnsavedChanges: hasChanges,
        savedContent: savedContentToCompare,
      });
    };

    const handleClearConsole = () => {
      setMetadata({
        ...metadata,
        executionOutput: undefined,
        hasExecutionError: false,
      });
    };

    return (
      <div className="flex h-full w-full items-center justify-center">
        <PythonViewer
          content={draftContent || content}
          executionOutput={executionOutput}
          isExecuting={isExecuting}
          onChange={handleChange}
          onClearConsole={handleClearConsole}
          onError={handleError}
          onExecute={handleExecute}
          status={status}
        />
      </div>
    );
  },
  actions: [
    {
      icon: <SaveIcon size={18} />,
      description: "Save changes",
      onClick: ({ metadata, setMetadata, onSaveContent }) => {
        const draftContent = metadata?.draftContent || "";
        if (draftContent) {
          onSaveContent(draftContent, false);

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
        return currentVersionIndex === 0;
      },
    },
    {
      icon: <UndoIcon size={18} />,
      description: "View Previous version",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("prev");
      },
      isDisabled: ({ currentVersionIndex }) => {
        return currentVersionIndex === 0;
      },
    },
    {
      icon: <RedoIcon size={18} />,
      description: "View Next version",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("next");
      },
      isDisabled: ({ isCurrentVersion }) => {
        return isCurrentVersion;
      },
    },
    {
      icon: <CopyIcon size={18} />,
      description: "Copy code to clipboard",
      onClick: ({ content }) => {
        navigator.clipboard.writeText(content);
        toast.success("Copied to clipboard!");
      },
    },
  ],
  toolbar: [
    {
      icon: <WrenchIcon />,
      description: "Fix errors",
      onClick: ({ sendMessage, documentId }) => {
        sendMessage({
          role: "user",
          parts: [
            {
              type: "text",
              text: `Please fix the errors in the Python code with ID ${documentId}`,
            },
          ],
        });
      },
      isVisible: ({ metadata }) => {
        return metadata?.hasExecutionError === true;
      },
    },
    {
      icon: <FileTextIcon />,
      description: "Explain code",
      onClick: ({ sendMessage, documentId }) => {
        sendMessage({
          role: "user",
          parts: [
            {
              type: "text",
              text: `Please add detailed comments to explain the Python code${documentId ? ` (Document ID: ${documentId})` : ""}`,
            },
          ],
        });
      },
    },
  ],
});
