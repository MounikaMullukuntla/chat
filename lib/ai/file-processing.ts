// File processing system for extracting content from various file types
// Implements requirement 2.1, 2.2, 2.3, 2.4, 2.5

import {
  logAgentActivity,
  PerformanceTracker,
  createCorrelationId,
  AgentType,
  AgentOperationType,
  AgentOperationCategory,
} from "@/lib/logging/activity-logger";

export type FileAttachment = {
  name: string;
  url: string;
  mediaType: string;
  size?: number;
};

export async function extractFileContent(
  attachment: FileAttachment
): Promise<string> {
  const correlationId = createCorrelationId();
  const tracker = new PerformanceTracker();

  try {
    const response = await fetch(attachment.url);

    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    const { mediaType, name } = attachment;
    let content: string;
    let actualSize = attachment.size;

    // Handle different file types based on media type
    if (mediaType.startsWith("text/")) {
      // Text files - direct content extraction
      content = await response.text();
      actualSize = actualSize || content.length;
    } else if (mediaType === "application/json") {
      // JSON files - structured data parsing
      const rawContent = await response.text();
      actualSize = actualSize || rawContent.length;
      try {
        const parsed = JSON.parse(rawContent);
        content = JSON.stringify(parsed, null, 2);
      } catch {
        // If JSON parsing fails, return as text
        content = rawContent;
      }
    } else if (mediaType.startsWith("image/")) {
      // Images - return metadata and description
      const buffer = await response.arrayBuffer();
      const sizeKB = Math.round(buffer.byteLength / 1024);
      actualSize = actualSize || buffer.byteLength;
      content = `Image file: ${name}\nType: ${mediaType}\nSize: ${sizeKB}KB\n[Image content cannot be extracted as text, but can be processed by vision models]`;
    } else if (mediaType === "application/pdf") {
      // PDF files - placeholder for text extraction
      // In a real implementation, you would use a PDF parsing library
      content = `PDF file: ${name}\n[PDF text extraction not implemented yet - will be added in future updates]`;
    } else {
      // Code files based on file extension
      const extension = name.split(".").pop()?.toLowerCase();
      const codeExtensions = [
        "js",
        "ts",
        "jsx",
        "tsx",
        "py",
        "java",
        "cpp",
        "c",
        "cs",
        "php",
        "rb",
        "go",
        "rs",
        "swift",
        "kt",
      ];

      if (extension && codeExtensions.includes(extension)) {
        // Code files - syntax-aware processing
        const rawContent = await response.text();
        actualSize = actualSize || rawContent.length;
        content = `Code file (${extension}): ${name}\n\`\`\`${extension}\n${rawContent}\n\`\`\``;
      } else {
        // Default: try to read as text
        content = await response.text();
        actualSize = actualSize || content.length;
      }
    }

    // Log successful file processing
    await logAgentActivity({
      agentType: AgentType.CHAT_MODEL_AGENT,
      operationType: AgentOperationType.TOOL_INVOCATION,
      operationCategory: AgentOperationCategory.TOOL_USE,
      status: "success",
      duration: tracker.end(),
      metadata: {
        file_name: name,
        media_type: mediaType,
        file_size: actualSize,
        processing_result: "success",
      },
      correlationId,
    });

    return content;
  } catch (error) {
    // Log failed file processing
    await logAgentActivity({
      agentType: AgentType.CHAT_MODEL_AGENT,
      operationType: AgentOperationType.TOOL_INVOCATION,
      operationCategory: AgentOperationCategory.TOOL_USE,
      status: "error",
      duration: tracker.end(),
      metadata: {
        file_name: attachment.name,
        media_type: attachment.mediaType,
        file_size: attachment.size,
        processing_result: "error",
        error_message:
          error instanceof Error ? error.message : "Unknown error",
      },
      correlationId,
    });

    console.error(`Error processing file ${attachment.name}:`, error);
    throw new Error(
      `Failed to process file ${attachment.name}: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export function validateFileAttachment(attachment: FileAttachment): {
  valid: boolean;
  error?: string;
} {
  const correlationId = createCorrelationId();
  const tracker = new PerformanceTracker();

  let validationResult: { valid: boolean; error?: string };

  // Basic validation
  if (!attachment.name || !attachment.url || !attachment.mediaType) {
    validationResult = { valid: false, error: "Missing required file properties" };
  } else {
    // Size validation (if provided)
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB limit
    if (attachment.size && attachment.size > maxSizeBytes) {
      validationResult = { valid: false, error: "File size exceeds 10MB limit" };
    } else {
      // Supported file types
      const supportedTypes = [
        "text/",
        "application/json",
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
      ];

      const isSupported = supportedTypes.some((type) =>
        attachment.mediaType.startsWith(type)
      );
      if (!isSupported) {
        validationResult = {
          valid: false,
          error: `Unsupported file type: ${attachment.mediaType}`,
        };
      } else {
        validationResult = { valid: true };
      }
    }
  }

  // Log validation activity (fire-and-forget)
  logAgentActivity({
    agentType: AgentType.CHAT_MODEL_AGENT,
    operationType: AgentOperationType.TOOL_INVOCATION,
    operationCategory: AgentOperationCategory.TOOL_USE,
    status: validationResult.valid ? "success" : "error",
    duration: tracker.end(),
    metadata: {
      file_name: attachment.name || "unknown",
      media_type: attachment.mediaType || "unknown",
      file_size: attachment.size,
      validation_result: validationResult.valid ? "valid" : "invalid",
      validation_error: validationResult.error,
    },
    correlationId,
  }).catch((err) => {
    // Silent fail for logging - don't interrupt validation flow
    console.error("Failed to log validation activity:", err);
  });

  return validationResult;
}
