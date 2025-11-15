import "server-only";

import { createGoogleGenerativeAI, google } from "@ai-sdk/google";
import type { User } from "@supabase/supabase-js";
import type { UIMessageStreamWriter } from "ai";
import { streamText } from "ai";
import { saveDocument } from "@/lib/db/queries";
import type { ChatMessage } from "@/lib/types";
import { generateUUID, stripMarkdownCodeFences } from "@/lib/utils";
import {
  logAgentActivity,
  PerformanceTracker,
  createCorrelationId,
  AgentType,
  AgentOperationType,
  AgentOperationCategory,
} from "@/lib/logging/activity-logger";

/**
 * Stream document creation in real-time using AI SDK's streamText
 * Content is generated and streamed to the client as the LLM produces it
 */
export async function streamTextDocument(params: {
  title: string;
  instruction: string; // The user's request/instruction for document creation
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
    title,
    instruction,
    systemPrompt,
    userPromptTemplate,
    dataStream,
    user,
    chatId,
    modelId,
    apiKey,
    metadata = {},
  } = params;
  const documentId = generateUUID();
  const correlationId = createCorrelationId();
  const performanceTracker = new PerformanceTracker({
    correlation_id: correlationId,
    agent_type: AgentType.DOCUMENT_AGENT,
    operation_type: AgentOperationType.DOCUMENT_GENERATION,
    operation_category: AgentOperationCategory.GENERATION,
    user_id: user?.id,
  });

  console.log("📄 [STREAM-CREATE] Starting real-time document creation");
  console.log("📄 [STREAM-CREATE] Document ID:", documentId);
  console.log("📄 [STREAM-CREATE] Title:", title);
  console.log("📄 [STREAM-CREATE] Model:", modelId);
  console.log("📄 [STREAM-CREATE] Correlation ID:", correlationId);

  // Log agent activity start
  logAgentActivity({
    agent_type: AgentType.DOCUMENT_AGENT,
    operation_type: AgentOperationType.DOCUMENT_GENERATION,
    operation_category: AgentOperationCategory.GENERATION,
    user_id: user?.id,
    correlation_id: correlationId,
    status: "started",
    metadata: {
      operation_type: "create",
      resource_id: documentId,
      instruction_length: instruction.length,
      streaming: true,
      tool_name: "streamTextDocument",
      model_id: modelId,
      chat_id: chatId,
    },
  }).catch((err) => console.error("Failed to log agent activity:", err));

  // Write artifact metadata to open side panel
  dataStream.write({
    type: "data-kind",
    data: "text",
    transient: true,
  });

  dataStream.write({
    type: "data-id",
    data: documentId,
    transient: true,
  });

  dataStream.write({
    type: "data-title",
    data: title,
    transient: true,
  });

  dataStream.write({
    type: "data-clear",
    data: null,
    transient: true,
  });

  console.log("📄 [STREAM-CREATE] Metadata written, starting LLM generation");

  // Get the Google model instance with proper API key handling
  let model;
  if (apiKey) {
    const googleProvider = createGoogleGenerativeAI({ apiKey });
    model = googleProvider(modelId);
  } else {
    model = google(modelId); // Fallback to environment variable
  }

  // Build the prompt for document creation using template from config
  const userPrompt = userPromptTemplate
    .replace("{title}", title)
    .replace("{instruction}", instruction);

  try {
    // Use streamText to get real-time generation
    const { fullStream } = streamText({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.7,
    });

    console.log("📄 [STREAM-CREATE] LLM streaming started");

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

    console.log("📄 [STREAM-CREATE] LLM generation complete");
    console.log(
      "📄 [STREAM-CREATE] Total content length:",
      draftContent.length
    );
    console.log("📄 [STREAM-CREATE] Total chunks streamed:", chunkCount);

    // Strip markdown code fences if LLM wrapped the output
    const cleanedContent = stripMarkdownCodeFences(draftContent);
    if (cleanedContent !== draftContent) {
      console.log(
        "⚠️ [STREAM-CREATE] Stripped markdown code fences from output"
      );
      console.log(
        "📄 [STREAM-CREATE] Cleaned content length:",
        cleanedContent.length
      );
    }

    // Save document to database if user is provided
    if (user?.id) {
      console.log("📄 [STREAM-CREATE] Saving to database for user:", user.id);
      await saveDocument({
        id: documentId,
        title,
        content: cleanedContent,
        kind: "text",
        userId: user.id,
        chatId,
        metadata: {
          ...metadata,
          updateType: "create",
          agentInfo: "document-agent-streaming",
          createdAt: new Date().toISOString(),
          modelUsed: modelId,
        },
      });
      console.log("✅ [STREAM-CREATE] Saved to database");
    } else {
      console.log("⚠️ [STREAM-CREATE] No user provided, skipping database save");
    }

    // Signal streaming complete
    dataStream.write({
      type: "data-finish",
      data: null,
      transient: true,
    });

    console.log("✅ [STREAM-CREATE] Document creation completed successfully");

    // Log success
    logAgentActivity({
      agent_type: AgentType.DOCUMENT_AGENT,
      operation_type: AgentOperationType.DOCUMENT_GENERATION,
      operation_category: AgentOperationCategory.GENERATION,
      user_id: user?.id,
      correlation_id: correlationId,
      status: "completed",
      duration_ms: performanceTracker.end(),
      metadata: {
        operation_type: "create",
        resource_id: documentId,
        instruction_length: instruction.length,
        streaming: true,
        tool_name: "streamTextDocument",
        model_id: modelId,
        chat_id: chatId,
        output_length: cleanedContent.length,
        chunk_count: chunkCount,
      },
    }).catch((err) => console.error("Failed to log agent activity:", err));

    return documentId;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("❌ [STREAM-CREATE] Generation failed:", errorMessage);

    // Log failure
    logAgentActivity({
      agent_type: AgentType.DOCUMENT_AGENT,
      operation_type: AgentOperationType.DOCUMENT_GENERATION,
      operation_category: AgentOperationCategory.GENERATION,
      user_id: user?.id,
      correlation_id: correlationId,
      status: "failed",
      duration_ms: performanceTracker.end(),
      error_message: errorMessage,
      metadata: {
        operation_type: "create",
        resource_id: documentId,
        instruction_length: instruction.length,
        streaming: true,
        tool_name: "streamTextDocument",
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

    throw new Error(`Failed to create document: ${errorMessage}`);
  }
}
