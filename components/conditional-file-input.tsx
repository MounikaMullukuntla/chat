"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { type ChangeEvent, memo } from "react";
import { toast } from "sonner";
import type { AdminConfigSummary, ChatMessage } from "@/lib/types";
import { PaperclipIcon } from "./icons";
import { Button } from "./ui/button";

type ConditionalFileInputProps = {
  selectedProvider: string;
  selectedModel: string;
  adminConfig?: AdminConfigSummary;
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  status: UseChatHelpers<ChatMessage>["status"];
};

function PureConditionalFileInput({
  selectedProvider,
  selectedModel,
  adminConfig,
  fileInputRef,
  onFileChange,
  status,
}: ConditionalFileInputProps) {
  // Check if file input should be visible based on provider configuration
  const shouldShowFileInput = () => {
    if (!adminConfig?.providers) {
      // Fallback: show file input for non-reasoning models (existing behavior)
      return selectedModel !== "chat-model-reasoning";
    }

    const providerConfig = adminConfig.providers[selectedProvider];
    if (!providerConfig) {
      // Provider not configured, fallback to existing behavior
      return selectedModel !== "chat-model-reasoning";
    }

    // Check if provider has file input enabled
    return providerConfig.enabled && providerConfig.fileInputEnabled;
  };

  // Don't render anything if file input should not be shown
  if (!shouldShowFileInput()) {
    return null;
  }

  return (
    <Button
      className="aspect-square h-8 rounded-lg p-1 transition-colors hover:bg-accent"
      data-testid="attachments-button"
      disabled={status !== "ready"}
      onClick={(event) => {
        event.preventDefault();
        fileInputRef.current?.click();
      }}
      type="button"
      variant="ghost"
    >
      <PaperclipIcon size={14} style={{ width: 14, height: 14 }} />
    </Button>
  );
}

export const ConditionalFileInput = memo(PureConditionalFileInput);

// Utility function to create validated file change handler
export function createValidatedFileChangeHandler(
  selectedProvider: string,
  _selectedModel: string,
  adminConfig: AdminConfigSummary | undefined,
  originalHandler: (event: ChangeEvent<HTMLInputElement>) => void,
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>
) {
  return (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return originalHandler(event);
    }

    // Get allowed file types
    const getAllowedFileTypes = (): string[] => {
      if (!adminConfig?.providers) {
        return []; // No restrictions if no config
      }

      const providerConfig = adminConfig.providers[selectedProvider];
      if (!providerConfig) {
        return []; // No restrictions if provider not configured
      }

      // Use provider-level allowed file types
      return providerConfig.allowedFileTypes || [];
    };

    const allowedTypes = getAllowedFileTypes();

    // If no restrictions are configured, allow all files
    if (allowedTypes.length === 0) {
      return originalHandler(event);
    }

    const valid: File[] = [];
    const invalid: File[] = [];

    Array.from(files).forEach((file) => {
      const fileExtension = file.name.split(".").pop()?.toLowerCase();
      const mimeType = file.type.toLowerCase();

      // Check if file is allowed by extension or MIME type
      const isAllowed = allowedTypes.some((allowedType) => {
        const normalizedType = allowedType.toLowerCase();

        // Check by extension (e.g., "pdf", "jpg")
        if (fileExtension === normalizedType) {
          return true;
        }

        // Check by MIME type (e.g., "image/*", "application/pdf")
        if (normalizedType.includes("/")) {
          if (normalizedType.endsWith("/*")) {
            const baseType = normalizedType.split("/")[0];
            return mimeType.startsWith(`${baseType}/`);
          }
          return mimeType === normalizedType;
        }

        return false;
      });

      if (isAllowed) {
        valid.push(file);
      } else {
        invalid.push(file);
      }
    });

    // Show error for invalid files
    if (invalid.length > 0) {
      const invalidFileNames = invalid.map((f) => f.name).join(", ");
      toast.error(
        `Invalid file type(s): ${invalidFileNames}. Allowed types: ${allowedTypes.join(", ")}`
      );
    }

    // If we have valid files, create a new event with only those files
    if (valid.length > 0) {
      // Create a new FileList with only valid files
      const dataTransfer = new DataTransfer();
      valid.forEach((file) => dataTransfer.items.add(file));

      // Create a new event with the filtered files
      const newEvent = {
        ...event,
        target: {
          ...event.target,
          files: dataTransfer.files,
        },
      } as ChangeEvent<HTMLInputElement>;

      originalHandler(newEvent);
    } else if (invalid.length > 0) {
      // Clear the input if all files were invalid
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };
}
