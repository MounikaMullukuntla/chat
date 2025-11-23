import "server-only";

import { createGoogleGenerativeAI, google } from "@ai-sdk/google";
import type { User } from "@supabase/supabase-js";
import type { UIMessageStreamWriter } from "ai";
import { streamText } from "ai";
import { getDocumentById, saveDocument } from "@/lib/db/queries";
import {
  AgentOperationCategory,
  AgentOperationType,
  AgentType,
  createCorrelationId,
  PerformanceTracker,
} from "@/lib/logging/activity-logger";
import type { ChatMessage } from "@/lib/types";
import { stripMarkdownCodeFences } from "@/lib/utils";

/**
 * Stream document update in real-time using AI SDK's streamText
 * Content is generated and streamed to the client as the LLM produces it
 */
export async function streamTextDocumentUpdate(params: {
  documentId: string;
  updateInstruction: string;
  systemPrompt: string; // System prompt from database config
  userPromptTemplate: string; // User prompt template from database config
  dataStream: UIMessageStreamWriter<ChatMessage>;
  user?: User | null;
  chatId?: string;
  modelId: string;
  apiKey?: string;
  metadata?: Record<string, any>;
}): Promise<string> {
  const {
    documentId,
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

  const correlationId = createCorrelationId();
  const performanceTracker = new PerformanceTracker({
    correlation_id: correlationId,
    agent_type: AgentType.DOCUMENT_AGENT,
    operation_type: AgentOperationType.DOCUMENT_GENERATION,
    operation_category: AgentOperationCategory.GENERATION,
    user_id: user?.id,
  });

  console.log("📝 [STREAM-UPDATE] Starting real-time document update");
  console.log("📝 [STREAM-UPDATE] Document ID:", documentId);
  console.log("📝 [STREAM-UPDATE] Model:", modelId);
  console.log(
    "📝 [STREAM-UPDATE] Instruction:",
    updateInstruction.substring(0, 100)
  );
  console.log("📝 [STREAM-UPDATE] Correlation ID:", correlationId);

  // Fetch the existing document from database
  const document = await getDocumentById({ id: documentId });

  if (!document) {
    throw new Error(`Document with ID ${documentId} not found`);
  }

  if (document.kind !== "text") {
    throw new Error(
      `Document ${documentId} is not a text document (kind: ${document.kind})`
    );
  }

  console.log("📝 [STREAM-UPDATE] Existing document found:", document.title);
  console.log(
    "📝 [STREAM-UPDATE] Current content length:",
    document.content?.length || 0
  );

  // Write artifact metadata to inform UI which document is being updated
  dataStream.write({
    type: "data-kind",
    data: document.kind,
    transient: true,
  });

  dataStream.write({
    type: "data-id",
    data: documentId,
    transient: true,
  });

  dataStream.write({
    type: "data-title",
    data: document.title,
    transient: true,
  });

  // Clear the artifact panel for update
  dataStream.write({
    type: "data-clear",
    data: null,
    transient: true,
  });

  console.log(
    "📝 [STREAM-UPDATE] Metadata written, cleared artifact panel, starting LLM generation"
  );

  // Get the Google model instance with proper API key handling
  let model;
  if (apiKey) {
    const googleProvider = createGoogleGenerativeAI({ apiKey });
    model = googleProvider(modelId);
  } else {
    model = google(modelId); // Fallback to environment variable
  }

  // Build the prompt for document update using template from config
  const userPrompt = userPromptTemplate
    .replace("{currentContent}", document.content || "")
    .replace("{updateInstruction}", updateInstruction);

  try {
    // Use streamText to get real-time generation
    const { fullStream } = streamText({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.7,
    });

    console.log("📝 [STREAM-UPDATE] LLM streaming started");

    // Accumulate content as it streams
    let draftContent = "";
    let chunkCount = 0;

    // Stream content in real-time as LLM generates it
    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === "text-delta") {
        // In AI SDK v5, text-delta events have a 'textDelta' property
        const text = (delta as any).textDelta || (delta as any).text || "";
        draftContent += text;
        chunkCount++;

        // Write each delta immediately to the client
        dataStream.write({
          type: "data-textDelta",
          data: text,
          transient: true,
        });
      }
    }

    console.log("📝 [STREAM-UPDATE] LLM generation complete");
    console.log(
      "📝 [STREAM-UPDATE] Updated content length:",
      draftContent.length
    );
    console.log("📝 [STREAM-UPDATE] Total chunks streamed:", chunkCount);

    // Strip markdown code fences if LLM wrapped the output
    const cleanedContent = stripMarkdownCodeFences(draftContent);
    if (cleanedContent !== draftContent) {
      console.log(
        "⚠️ [STREAM-UPDATE] Stripped markdown code fences from output"
      );
      console.log(
        "📝 [STREAM-UPDATE] Cleaned content length:",
        cleanedContent.length
      );
    }

    // Save updated document to database if user is provided
    if (user?.id) {
      console.log("📝 [STREAM-UPDATE] Saving to database for user:", user.id);
      await saveDocument({
        id: documentId,
        title: document.title,
        content: cleanedContent,
        kind: "text",
        userId: user.id,
        chatId: chatId || document.chat_id || undefined,
        parentVersionId: `${document.id}`, // Link to previous version
        metadata: {
          ...metadata,
          updateType: "update",
          agentInfo: "document-agent-streaming",
          previousVersion: document.version_number,
          updatedAt: new Date().toISOString(),
          modelUsed: modelId,
          updateInstruction,
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

    console.log("✅ [STREAM-UPDATE] Document update completed successfully");

    // Log success via PerformanceTracker
    await performanceTracker.end({
      success: true,
      model_id: modelId,
      resource_id: documentId,
      resource_type: "document",
      operation_metadata: {
        operation_type: "update",
        instruction_length: updateInstruction.length,
        streaming: true,
        tool_name: "streamTextDocumentUpdate",
        chat_id: chatId,
        output_length: cleanedContent.length,
        chunk_count: chunkCount,
      },
    });

    return documentId;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("❌ [STREAM-UPDATE] Update failed:", errorMessage);

    // Log failure via PerformanceTracker
    await performanceTracker.end({
      success: false,
      error_message: errorMessage,
      error_type: error instanceof Error ? error.name : "UnknownError",
      model_id: modelId,
      resource_id: documentId,
      resource_type: "document",
      operation_metadata: {
        operation_type: "update",
        instruction_length: updateInstruction.length,
        streaming: true,
        tool_name: "streamTextDocumentUpdate",
        chat_id: chatId,
      },
    });

    // Write error to stream
    dataStream.write({
      type: "data-finish",
      data: null,
      transient: true,
    });

    throw new Error(`Failed to update document: ${errorMessage}`);
  }
}
