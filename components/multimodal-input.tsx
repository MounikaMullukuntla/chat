"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import equal from "fast-deep-equal";
import {
  type ChangeEvent,
  type Dispatch,
  memo,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { useLocalStorage, useWindowSize } from "usehooks-ts";

import type { Attachment, ChatMessage, GitHubRepo } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import { cn } from "@/lib/utils";
import { Context } from "./elements/context";
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from "./elements/prompt-input";
import {
  ArrowUpIcon,
  StopIcon,
} from "./icons";
import { X } from "lucide-react";
import { ConditionalFileInput, createValidatedFileChangeHandler } from "./conditional-file-input";
import { GitHubRepoModal } from "./github-repo-modal";
import { ModelSelector } from "./model-selector";
import { PreviewAttachment } from "./preview-attachment";
import { SuggestedActions } from "./suggested-actions";
import { ThinkingModeToggle } from "./thinking-mode-toggle";
import { Button } from "./ui/button";
import type { VisibilityType } from "./visibility-selector";
import { useModelCapabilities } from "@/hooks/use-model-capabilities";

function PureMultimodalInput({
  chatId,
  input,
  setInput,
  status,
  stop,
  attachments,
  setAttachments,
  messages,
  setMessages,
  sendMessage,
  className,
  selectedVisibilityType,
  selectedModelId,
  onModelChange,
  usage,
  githubPAT,
}: {
  chatId: string;
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  status: UseChatHelpers<ChatMessage>["status"];
  stop: () => void;
  attachments: Attachment[];
  setAttachments: Dispatch<SetStateAction<Attachment[]>>;
  messages: UIMessage[];
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  className?: string;
  selectedVisibilityType: VisibilityType;
  selectedModelId: string;
  onModelChange?: (modelId: string) => void;
  usage?: AppUsage;
  githubPAT?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { width } = useWindowSize();

  // Thinking mode state - persists across model selections within the session
  const [thinkingMode, setThinkingMode] = useLocalStorage("thinking-mode", false);

  // GitHub repositories, files, and folders state - UI-level storage only (session-based)
  const [selectedRepos, setSelectedRepos] = useState<GitHubRepo[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<import('@/lib/types').GitHubFile[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<import('@/lib/types').GitHubFolder[]>([]);
  const [showGitHubModal, setShowGitHubModal] = useState(false);

  // Load GitHub context from session storage on mount
  useEffect(() => {
    const savedRepos = sessionStorage.getItem(`github-repos-${chatId}`);
    const savedFiles = sessionStorage.getItem(`github-files-${chatId}`);
    const savedFolders = sessionStorage.getItem(`github-folders-${chatId}`);

    if (savedRepos) {
      try {
        setSelectedRepos(JSON.parse(savedRepos));
      } catch (error) {
        console.error('Failed to parse saved GitHub repos:', error);
      }
    }

    if (savedFiles) {
      try {
        setSelectedFiles(JSON.parse(savedFiles));
      } catch (error) {
        console.error('Failed to parse saved GitHub files:', error);
      }
    }

    if (savedFolders) {
      try {
        setSelectedFolders(JSON.parse(savedFolders));
      } catch (error) {
        console.error('Failed to parse saved GitHub folders:', error);
      }
    }
  }, [chatId]);

  // Save GitHub context to session storage when they change
  useEffect(() => {
    if (selectedRepos.length > 0) {
      sessionStorage.setItem(`github-repos-${chatId}`, JSON.stringify(selectedRepos));
    } else {
      sessionStorage.removeItem(`github-repos-${chatId}`);
    }
  }, [selectedRepos, chatId]);

  useEffect(() => {
    if (selectedFiles.length > 0) {
      sessionStorage.setItem(`github-files-${chatId}`, JSON.stringify(selectedFiles));
    } else {
      sessionStorage.removeItem(`github-files-${chatId}`);
    }
  }, [selectedFiles, chatId]);

  useEffect(() => {
    if (selectedFolders.length > 0) {
      sessionStorage.setItem(`github-folders-${chatId}`, JSON.stringify(selectedFolders));
    } else {
      sessionStorage.removeItem(`github-folders-${chatId}`);
    }
  }, [selectedFolders, chatId]);

  // Handle GitHub selection changes
  const handleGitHubRepoChange = useCallback((repos: GitHubRepo[]) => {
    setSelectedRepos(repos);
  }, []);

  const handleGitHubFileChange = useCallback((files: import('@/lib/types').GitHubFile[]) => {
    setSelectedFiles(files);
  }, []);

  const handleGitHubFolderChange = useCallback((folders: import('@/lib/types').GitHubFolder[]) => {
    setSelectedFolders(folders);
  }, []);

  // Provider state for other components
  const [selectedProvider, setSelectedProvider] = useState("google");

  // Fetch model capabilities for all users
  const { modelCapabilities: adminConfig, isLoading: configLoading, error: configError } = useModelCapabilities();
  


  // Determine current provider from selected model
  useEffect(() => {
    if (adminConfig && selectedModelId) {
      // Find which provider contains this model
      for (const [providerId, providerConfig] of Object.entries(adminConfig.providers)) {
        if (providerConfig.models[selectedModelId]) {
          setSelectedProvider(providerId);
          return;
        }
      }
      
      // If no match found, default to first enabled provider
      const firstEnabledProvider = Object.entries(adminConfig.providers).find(
        ([_, config]) => config.enabled
      );
      if (firstEnabledProvider) {
        setSelectedProvider(firstEnabledProvider[0]);
      }
    }
  }, [adminConfig, selectedModelId]);

  const adjustHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "44px";
    }
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
  }, [adjustHeight]);

  const resetHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "44px";
    }
  }, []);

  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    "input",
    ""
  );

  useEffect(() => {
    if (textareaRef.current) {
      const domValue = textareaRef.current.value;
      // Prefer DOM value over localStorage to handle hydration
      const finalValue = domValue || localStorageInput || "";
      setInput(finalValue);
      adjustHeight();
    }
    // Only run once after hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adjustHeight, localStorageInput, setInput]);

  useEffect(() => {
    setLocalStorageInput(input);
  }, [input, setLocalStorageInput]);

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadQueue, setUploadQueue] = useState<string[]>([]);

  const submitForm = useCallback(() => {
    window.history.replaceState({}, "", `/chat/${chatId}`);

    // Check if thinking mode is supported and enabled
    const providerConfig = adminConfig?.providers?.[selectedProvider];
    const modelConfig = providerConfig?.models?.[selectedModelId];
    const supportsThinkingMode = modelConfig?.supportsThinkingMode || false;
    const shouldIncludeThinkingMode = supportsThinkingMode && thinkingMode;

    // Prepare message parts
    const messageParts: any[] = [
      ...attachments.map((attachment) => ({
        type: "file" as const,
        url: attachment.url,
        name: attachment.name,
        mediaType: attachment.contentType,
      })),
    ];

    // Add GitHub context if any items are selected
    // Use hybrid approach: show in message text but let GitHub MCP agent fetch actual content
    if (selectedRepos.length > 0 || selectedFiles.length > 0 || selectedFolders.length > 0) {
      let githubContext = '';

      if (selectedRepos.length > 0) {
        githubContext += `GitHub Repositories: ${selectedRepos.map(r => r.full_name).join(', ')}`;
      }

      if (selectedFiles.length > 0) {
        githubContext += (githubContext ? '\n' : '') + `Files: ${selectedFiles.map(f => f.path).join(', ')}`;
      }

      if (selectedFolders.length > 0) {
        githubContext += (githubContext ? '\n' : '') + `Folders: ${selectedFolders.map(f => f.path).join(', ')}`;
      }

      messageParts.push({
        type: "text",
        text: `${githubContext}\n\nQuery: ${input}`,
      });
    } else {
      messageParts.push({
        type: "text",
        text: input,
      });
    }

    const messageData: any = {
      role: "user",
      parts: messageParts,
    };

    // Add GitHub context metadata for GitHub MCP agent
    if (selectedRepos.length > 0 || selectedFiles.length > 0 || selectedFolders.length > 0) {
      messageData.experimental_providerMetadata = {
        github: {
          repos: selectedRepos,
          files: selectedFiles,
          folders: selectedFolders,
        },
        ...(shouldIncludeThinkingMode ? { thinking: true } : {}),
      };
    } else if (shouldIncludeThinkingMode) {
      // Include thinking mode parameters when enabled
      messageData.experimental_providerMetadata = {
        thinking: true,
      };
    }

    sendMessage(messageData);

    setAttachments([]);
    setLocalStorageInput("");
    resetHeight();
    setInput("");

    if (width && width > 768) {
      textareaRef.current?.focus();
    }
  }, [
    input,
    setInput,
    attachments,
    sendMessage,
    setAttachments,
    setLocalStorageInput,
    width,
    chatId,
    resetHeight,
    selectedModelId,
    selectedProvider,
    adminConfig,
    thinkingMode,
    selectedRepos,
  ]);

  const uploadFile = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const { url, pathname, contentType } = data;

        return {
          url,
          name: pathname,
          contentType,
        };
      }
      const { error } = await response.json();
      toast.error(error);
    } catch (_error) {
      toast.error("Failed to upload file, please try again!");
    }
  }, []);



  const contextProps = useMemo(
    () => ({
      usage,
    }),
    [usage]
  );

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);

      setUploadQueue(files.map((file) => file.name));

      try {
        const uploadPromises = files.map((file) => uploadFile(file));
        const uploadedAttachments = await Promise.all(uploadPromises);
        const successfullyUploadedAttachments = uploadedAttachments.filter(
          (attachment) => attachment !== undefined
        );

        setAttachments((currentAttachments) => [
          ...currentAttachments,
          ...successfullyUploadedAttachments,
        ]);
      } catch (error) {
        console.error("Error uploading files!", error);
      } finally {
        setUploadQueue([]);
      }
    },
    [setAttachments, uploadFile]
  );

  // Create validated file change handler that checks file types
  const validatedFileChangeHandler = useMemo(
    () => createValidatedFileChangeHandler(
      selectedProvider,
      selectedModelId,
      adminConfig || undefined,
      handleFileChange,
      fileInputRef
    ),
    [selectedProvider, selectedModelId, adminConfig, handleFileChange]
  );

  return (
    <div className={cn("relative flex w-full flex-col gap-4", className)}>
      {messages.length === 0 &&
        attachments.length === 0 &&
        uploadQueue.length === 0 && (
          <SuggestedActions
            chatId={chatId}
            selectedVisibilityType={selectedVisibilityType}
            sendMessage={sendMessage}
            selectedModelId={selectedModelId}
            selectedProvider={selectedProvider}
          />
        )}



      <input
        className="-top-4 -left-4 pointer-events-none fixed size-0.5 opacity-0"
        multiple
        onChange={validatedFileChangeHandler}
        ref={fileInputRef}
        tabIndex={-1}
        type="file"
      />

      <PromptInput
        className="rounded-xl border border-border bg-background p-3 shadow-xs transition-all duration-200 focus-within:border-border hover:border-muted-foreground/50"
        onSubmit={(event) => {
          event.preventDefault();
          if (status !== "ready") {
            toast.error("Please wait for the model to finish its response!");
          } else {
            submitForm();
          }
        }}
      >
        {(attachments.length > 0 || uploadQueue.length > 0) && (
          <div
            className="flex flex-row items-end gap-2 overflow-x-scroll"
            data-testid="attachments-preview"
          >
            {attachments.map((attachment) => (
              <PreviewAttachment
                attachment={attachment}
                key={attachment.url}
                onRemove={() => {
                  setAttachments((currentAttachments) =>
                    currentAttachments.filter((a) => a.url !== attachment.url)
                  );
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
              />
            ))}

            {uploadQueue.map((filename) => (
              <PreviewAttachment
                attachment={{
                  url: "",
                  name: filename,
                  contentType: "",
                }}
                isUploading={true}
                key={filename}
              />
            ))}
          </div>
        )}
        <div className="flex flex-row items-start gap-1 sm:gap-2">
          <PromptInputTextarea
            autoFocus
            className="grow resize-none border-0! border-none! bg-transparent p-2 text-sm outline-none ring-0 [-ms-overflow-style:none] [scrollbar-width:none] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 [&::-webkit-scrollbar]:hidden"
            data-testid="multimodal-input"
            disableAutoResize={true}
            maxHeight={200}
            minHeight={44}
            onChange={handleInput}
            placeholder="Send a message..."
            ref={textareaRef}
            rows={1}
            value={input}
          />{" "}
          <Context {...contextProps} />
        </div>

        
        {/* Selected GitHub Context Display */}
        {(selectedRepos.length > 0 || selectedFiles.length > 0 || selectedFolders.length > 0) && (
          <div className="px-3 pb-2 border-t border-border/50">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 mt-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.30.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              <span>GitHub Context ({selectedRepos.length + selectedFiles.length + selectedFolders.length})</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {selectedRepos.map((repo) => (
                <div
                  key={repo.id}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-md text-xs font-medium"
                >
                  <span>{repo.full_name}</span>
                  <button
                    onClick={() => {
                      const newRepos = selectedRepos.filter(r => r.id !== repo.id);
                      handleGitHubRepoChange(newRepos);
                    }}
                    className="text-primary/70 hover:text-primary hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                    title={`Remove ${repo.full_name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {selectedFiles.map((file) => (
                <div
                  key={file.path}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-md text-xs font-medium"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <span>{file.name}</span>
                  <button
                    onClick={() => {
                      const newFiles = selectedFiles.filter(f => f.path !== file.path);
                      handleGitHubFileChange(newFiles);
                    }}
                    className="text-blue-600/70 dark:text-blue-400/70 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-500/20 rounded-full p-0.5 transition-colors"
                    title={`Remove ${file.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {selectedFolders.map((folder) => (
                <div
                  key={folder.path}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-md text-xs font-medium"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                  </svg>
                  <span>{folder.name}</span>
                  <button
                    onClick={() => {
                      const newFolders = selectedFolders.filter(f => f.path !== folder.path);
                      handleGitHubFolderChange(newFolders);
                    }}
                    className="text-amber-600/70 dark:text-amber-400/70 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/20 rounded-full p-0.5 transition-colors"
                    title={`Remove ${folder.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <PromptInputToolbar className="!border-top-0 border-t-0! p-0 shadow-none dark:border-0 dark:border-transparent!">
          <PromptInputTools className="gap-0 sm:gap-0.5">
            <ConditionalFileInput
              selectedProvider={selectedProvider}
              selectedModel={selectedModelId}
              adminConfig={adminConfig || undefined}
              fileInputRef={fileInputRef}
              onFileChange={validatedFileChangeHandler}
              status={status}
            />
            
            {/* GitHub Context Button */}
            {githubPAT && (
              <Button
                type="button"
                className={`aspect-square h-8 rounded-lg p-1 transition-all duration-200 ${
                  (selectedRepos.length > 0 || selectedFiles.length > 0 || selectedFolders.length > 0)
                    ? 'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20'
                    : 'hover:bg-accent'
                }`}
                variant="ghost"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowGitHubModal(!showGitHubModal);
                }}
                title={
                  selectedRepos.length > 0 || selectedFiles.length > 0 || selectedFolders.length > 0
                    ? `${selectedRepos.length + selectedFiles.length + selectedFolders.length} items selected`
                    : 'Select GitHub context'
                }
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.30.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                {(selectedRepos.length > 0 || selectedFiles.length > 0 || selectedFolders.length > 0) && (
                  <div className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-medium">
                    {selectedRepos.length + selectedFiles.length + selectedFolders.length}
                  </div>
                )}
              </Button>
            )}
            
            <ModelSelector
              selectedModel={selectedModelId}
              adminConfig={adminConfig || undefined}
              isLoading={configLoading}
              error={configError}
              onModelChange={onModelChange || (() => {})}
            />
            <ThinkingModeToggle
              selectedModel={selectedModelId}
              adminConfig={adminConfig || undefined}
              thinkingMode={thinkingMode}
              onThinkingModeChange={setThinkingMode}
              className="ml-2"
            />
          </PromptInputTools>

          {status === "submitted" ? (
            <StopButton setMessages={setMessages} stop={stop} />
          ) : (
            <PromptInputSubmit
              className="size-8 rounded-full bg-primary text-primary-foreground transition-colors duration-200 hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground"
              disabled={!input.trim() || uploadQueue.length > 0}
              status={status}
            >
              <ArrowUpIcon size={14} />
            </PromptInputSubmit>
          )}
        </PromptInputToolbar>
      </PromptInput>

      {/* GitHub Repository Modal */}
      {githubPAT && (
        <GitHubRepoModal
          isOpen={showGitHubModal}
          onClose={() => setShowGitHubModal(false)}
          githubPAT={githubPAT}
          selectedRepos={selectedRepos}
          selectedFiles={selectedFiles}
          selectedFolders={selectedFolders}
          onRepoSelectionChange={handleGitHubRepoChange}
          onFileSelectionChange={handleGitHubFileChange}
          onFolderSelectionChange={handleGitHubFolderChange}
        />
      )}
    </div>
  );
}

export const MultimodalInput = memo(
  PureMultimodalInput,
  (prevProps, nextProps) => {
    if (prevProps.input !== nextProps.input) {
      return false;
    }
    if (prevProps.status !== nextProps.status) {
      return false;
    }
    if (!equal(prevProps.attachments, nextProps.attachments)) {
      return false;
    }
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType) {
      return false;
    }
    if (prevProps.selectedModelId !== nextProps.selectedModelId) {
      return false;
    }
    if (prevProps.githubPAT !== nextProps.githubPAT) {
      return false;
    }

    return true;
  }
);





function PureStopButton({
  stop,
  setMessages,
}: {
  stop: () => void;
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
}) {
  return (
    <Button
      type="button"
      className="size-7 rounded-full bg-foreground p-1 text-background transition-colors duration-200 hover:bg-foreground/90 disabled:bg-muted disabled:text-muted-foreground"
      data-testid="stop-button"
      onClick={(event) => {
        event.preventDefault();
        stop();
        setMessages((messages) => messages);
      }}
    >
      <StopIcon size={14} />
    </Button>
  );
}

const StopButton = memo(PureStopButton);
