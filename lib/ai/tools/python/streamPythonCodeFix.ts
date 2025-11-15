import "server-only";

import { createGoogleGenerativeAI, google } from "@ai-sdk/google";
import type { User } from "@supabase/supabase-js";
import type { UIMessageStreamWriter } from "ai";
import { streamObject } from "ai";
import { z } from "zod";
import { getDocumentById, saveDocument } from "@/lib/db/queries";
import type { ChatMessage } from "@/lib/types";
import {
  logAgentActivity,
  PerformanceTracker,
  createCorrelationId,
  AgentType,
  AgentOperationType,
  AgentOperationCategory,
} from "@/lib/logging/activity-logger";

/**
 * Validate Python code (basic validation)
 */
function validatePythonCode(code: string): boolean {
  const trimmed = code.trim();

  // Basic checks
  const hasContent = trimmed.length > 0;
  const notEmpty = trimmed !== "";

  // Check for common Python patterns
  const hasPythonPatterns =
    /import\s+\w+/.test(trimmed) ||
    /from\s+\w+/.test(trimmed) ||
    /def\s+\w+/.test(trimmed) ||
    /class\s+\w+/.test(trimmed) ||
    /print\s*\(/.test(trimmed) ||
    /if\s+__name__\s*==/.test(trimmed) ||
    trimmed.includes("=") ||
    trimmed.includes("#");

  return hasContent && notEmpty && hasPythonPatterns;
}

/**
 * Stream Python code fix in real-time using AI SDK's streamObject
 * Fixes errors in existing code
 */
export async function streamPythonCodeFix(params: {
  codeId: string;
  errorInfo: string; // Error information from execution or syntax checking
  systemPrompt: string; // System prompt from database config
  userPromptTemplate: string; // User prompt template from database config
  dataStream: UIMessageStreamWriter<ChatMessage>;
  user?: User | null;
  chatId?: string;
  modelId: string;
  apiKey?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  const {
    codeId,
    errorInfo,
    systemPrompt,
    userPromptTemplate,
    dataStream,
    user,
    chatId,
    modelId,
    apiKey,
    metadata = {},
  } = params;

  const correlationId = createCorrelationId();
  const performanceTracker = new PerformanceTracker({
    correlation_id: correlationId,
    agent_type: AgentType.PYTHON_AGENT,
    operation_type: AgentOperationType.CODE_GENERATION,
    operation_category: AgentOperationCategory.GENERATION,
    user_id: user?.id,
  });

  console.log("🐍 [STREAM-FIX] Starting real-time code fix");
  console.log("🐍 [STREAM-FIX] Code ID:", codeId);
  console.log("🐍 [STREAM-FIX] Model:", modelId);
  console.log("🐍 [STREAM-FIX] Correlation ID:", correlationId);

  // Log agent activity start
  logAgentActivity({
    agent_type: AgentType.PYTHON_AGENT,
    operation_type: AgentOperationType.CODE_GENERATION,
    operation_category: AgentOperationCategory.GENERATION,
    user_id: user?.id,
    correlation_id: correlationId,
    status: "started",
    metadata: {
      operation_type: "fix",
      resource_id: codeId,
      instruction_length: errorInfo.length,
      streaming: true,
      tool_name: "streamPythonCodeFix",
      model_id: modelId,
      chat_id: chatId,
    },
  }).catch((err) => console.error("Failed to log agent activity:", err));

  // Get the current code document
  const currentDocument = await getDocumentById({ id: codeId });
  if (!currentDocument) {
    throw new Error(`Code with id ${codeId} not found`);
  }

  console.log(
    "🐍 [STREAM-FIX] Current version:",
    currentDocument.version_number
  );
  console.log(
    "🐍 [STREAM-FIX] Current content length:",
    currentDocument.content?.length || 0
  );

  // Write artifact metadata to inform UI
  dataStream.write({
    type: "data-kind",
    data: "python code",
    transient: true,
  });

  dataStream.write({
    type: "data-id",
    data: codeId,
    transient: true,
  });

  dataStream.write({
    type: "data-title",
    data: currentDocument.title || "Untitled Code",
    transient: true,
  });

  dataStream.write({
    type: "data-clear",
    data: null,
    transient: true,
  });

  console.log("🐍 [STREAM-FIX] Metadata written, starting LLM generation");

  // Get the Google model instance with proper API key handling
  let model;
  if (apiKey) {
    const googleProvider = createGoogleGenerativeAI({ apiKey });
    model = googleProvider(modelId);
  } else {
    model = google(modelId); // Fallback to environment variable
  }

  // Build the prompt for code fix using template from config
  const prompt = userPromptTemplate
    .replace("{currentContent}", currentDocument.content || "")
    .replace("{errorInfo}", errorInfo);

  try {
    // Use streamObject for structured code fixes
    const { partialObjectStream } = streamObject({
      model,
      system: systemPrompt,
      prompt,
      schema: z.object({
        code: z
          .string()
          .describe(
            "Fixed Python code with proper syntax, error handling, and documentation"
          ),
      }),
    });

    console.log("🐍 [STREAM-FIX] LLM streaming started");

    // Accumulate content as it streams
    let fixedContent = "";
    let chunkCount = 0;

    // Stream content in real-time as LLM generates it
    for await (const partialObject of partialObjectStream) {
      if (partialObject.code) {
        fixedContent = partialObject.code;
        chunkCount++;

        // Write each delta immediately to the client
        dataStream.write({
          type: "data-codeDelta",
          data: fixedContent, // Replace entire content
          transient: true,
        });
      }
    }

    console.log("🐍 [STREAM-FIX] LLM generation complete");
    console.log("🐍 [STREAM-FIX] Fixed content length:", fixedContent.length);
    console.log("🐍 [STREAM-FIX] Total chunks streamed:", chunkCount);

    // Validate Python code before saving
    if (!validatePythonCode(fixedContent)) {
      console.warn(
        "⚠️ [STREAM-FIX] Fixed code may not be valid Python, but continuing anyway"
      );
    }

    // Save fixed code as new version
    if (user?.id) {
      console.log("🐍 [STREAM-FIX] Saving to database as new version");
      await saveDocument({
        id: codeId,
        title: currentDocument.title || "Untitled Code",
        content: fixedContent,
        kind: "python code",
        userId: user.id,
        chatId,
        parentVersionId: currentDocument.id,
        metadata: {
          ...metadata,
          updateType: "fix",
          agent: "GooglePythonAgentStreaming",
          fixedAt: new Date().toISOString(),
          modelUsed: modelId,
          previousVersion: currentDocument.version_number,
          errorFixed: errorInfo,
        },
      });
      console.log("✅ [STREAM-FIX] Saved to database");
    } else {
      console.log("⚠️ [STREAM-FIX] No user provided, skipping database save");
    }

    // Signal streaming complete
    dataStream.write({
      type: "data-finish",
      data: null,
      transient: true,
    });

    console.log("✅ [STREAM-FIX] Code fix completed successfully");

    // Log success
    logAgentActivity({
      agent_type: AgentType.PYTHON_AGENT,
      operation_type: AgentOperationType.CODE_GENERATION,
      operation_category: AgentOperationCategory.GENERATION,
      user_id: user?.id,
      correlation_id: correlationId,
      status: "completed",
      duration_ms: performanceTracker.end(),
      metadata: {
        operation_type: "fix",
        resource_id: codeId,
        instruction_length: errorInfo.length,
        streaming: true,
        tool_name: "streamPythonCodeFix",
        model_id: modelId,
        chat_id: chatId,
        output_length: fixedContent.length,
        chunk_count: chunkCount,
      },
    }).catch((err) => console.error("Failed to log agent activity:", err));
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("❌ [STREAM-FIX] Fix failed:", errorMessage);

    // Log failure
    logAgentActivity({
      agent_type: AgentType.PYTHON_AGENT,
      operation_type: AgentOperationType.CODE_GENERATION,
      operation_category: AgentOperationCategory.GENERATION,
      user_id: user?.id,
      correlation_id: correlationId,
      status: "failed",
      duration_ms: performanceTracker.end(),
      error_message: errorMessage,
      metadata: {
        operation_type: "fix",
        resource_id: codeId,
        instruction_length: errorInfo.length,
        streaming: true,
        tool_name: "streamPythonCodeFix",
        model_id: modelId,
        chat_id: chatId,
      },
    }).catch((err) => console.error("Failed to log agent activity:", err));

    // Write error to stream
    dataStream.write({
      type: "data-finish",
      data: null,
      transient: true,
    });

    throw new Error(`Failed to fix Python code: ${errorMessage}`);
  }
}
