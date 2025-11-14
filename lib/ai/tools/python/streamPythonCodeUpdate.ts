import "server-only";

import { createGoogleGenerativeAI, google } from "@ai-sdk/google";
import type { User } from "@supabase/supabase-js";
import type { UIMessageStreamWriter } from "ai";
import { streamObject } from "ai";
import { z } from "zod";
import { getDocumentById, saveDocument } from "@/lib/db/queries";
import type { ChatMessage } from "@/lib/types";

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
 * Stream Python code update in real-time using AI SDK's streamObject
 * Updates existing code based on user instructions
 */
export async function streamPythonCodeUpdate(params: {
  codeId: string;
  updateInstruction: string; // The user's update request
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
    updateInstruction,
    systemPrompt,
    userPromptTemplate,
    dataStream,
    user,
    chatId,
    modelId,
    apiKey,
    metadata = {},
  } = params;

  console.log("🐍 [STREAM-UPDATE] Starting real-time code update");
  console.log("🐍 [STREAM-UPDATE] Code ID:", codeId);
  console.log("🐍 [STREAM-UPDATE] Model:", modelId);

  // Get the current code document
  const currentDocument = await getDocumentById({ id: codeId });
  if (!currentDocument) {
    throw new Error(`Code with id ${codeId} not found`);
  }

  console.log(
    "🐍 [STREAM-UPDATE] Current version:",
    currentDocument.version_number
  );
  console.log(
    "🐍 [STREAM-UPDATE] Current content length:",
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

  console.log("🐍 [STREAM-UPDATE] Metadata written, starting LLM generation");

  // Get the Google model instance with proper API key handling
  let model;
  if (apiKey) {
    const googleProvider = createGoogleGenerativeAI({ apiKey });
    model = googleProvider(modelId);
  } else {
    model = google(modelId); // Fallback to environment variable
  }

  // Build the prompt for code update using template from config
  const prompt = userPromptTemplate
    .replace("{currentContent}", currentDocument.content || "")
    .replace("{updateInstruction}", updateInstruction);

  try {
    // Use streamObject for structured code updates
    const { partialObjectStream } = streamObject({
      model,
      system: systemPrompt,
      prompt,
      schema: z.object({
        code: z
          .string()
          .describe(
            "Updated Python code with proper syntax, error handling, and documentation"
          ),
      }),
    });

    console.log("🐍 [STREAM-UPDATE] LLM streaming started");

    // Accumulate content as it streams
    let updatedContent = "";
    let chunkCount = 0;

    // Stream content in real-time as LLM generates it
    for await (const partialObject of partialObjectStream) {
      if (partialObject.code) {
        updatedContent = partialObject.code;
        chunkCount++;

        // Write each delta immediately to the client
        dataStream.write({
          type: "data-codeDelta",
          data: updatedContent, // Replace entire content
          transient: true,
        });
      }
    }

    console.log("🐍 [STREAM-UPDATE] LLM generation complete");
    console.log(
      "🐍 [STREAM-UPDATE] Updated content length:",
      updatedContent.length
    );
    console.log("🐍 [STREAM-UPDATE] Total chunks streamed:", chunkCount);

    // Validate Python code before saving
    if (!validatePythonCode(updatedContent)) {
      console.warn(
        "⚠️ [STREAM-UPDATE] Updated code may not be valid Python, but continuing anyway"
      );
    }

    // Save updated code as new version
    if (user?.id) {
      console.log("🐍 [STREAM-UPDATE] Saving to database as new version");
      await saveDocument({
        id: codeId,
        title: currentDocument.title || "Untitled Code",
        content: updatedContent,
        kind: "python code",
        userId: user.id,
        chatId,
        parentVersionId: currentDocument.id,
        metadata: {
          ...metadata,
          updateType: metadata.updateType || "update",
          agent: "GooglePythonAgentStreaming",
          updatedAt: new Date().toISOString(),
          modelUsed: modelId,
          previousVersion: currentDocument.version_number,
        },
      });
      console.log("✅ [STREAM-UPDATE] Saved to database");
    } else {
      console.log("⚠️ [STREAM-UPDATE] No user provided, skipping database save");
    }

    // Signal streaming complete
    dataStream.write({
      type: "data-finish",
      data: null,
      transient: true,
    });

    console.log("✅ [STREAM-UPDATE] Code update completed successfully");
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("❌ [STREAM-UPDATE] Update failed:", errorMessage);

    // Write error to stream
    dataStream.write({
      type: "data-finish",
      data: null,
      transient: true,
    });

    throw new Error(`Failed to update Python code: ${errorMessage}`);
  }
}
