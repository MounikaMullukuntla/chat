import "server-only";

import { createGoogleGenerativeAI, google } from "@ai-sdk/google";
import type { User } from "@supabase/supabase-js";
import type { UIMessageStreamWriter } from "ai";
import { streamObject } from "ai";
import { z } from "zod";
import { saveDocument } from "@/lib/db/queries";
import {
  AgentOperationCategory,
  AgentOperationType,
  AgentType,
  createCorrelationId,
  PerformanceTracker,
} from "@/lib/logging/activity-logger";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";

/**
 * Validate Mermaid syntax (basic validation)
 */
function validateMermaidSyntax(diagram: string): boolean {
  const trimmed = diagram.trim();

  // Check for common Mermaid diagram types
  const validTypes = [
    "graph",
    "flowchart",
    "sequenceDiagram",
    "classDiagram",
    "stateDiagram",
    "erDiagram",
    "journey",
    "gantt",
    "pie",
    "gitgraph",
    "mindmap",
    "timeline",
    "sankey",
  ];

  const firstLine = trimmed.split("\n")[0].toLowerCase();
  const hasValidType = validTypes.some((type) =>
    firstLine.includes(type.toLowerCase())
  );

  // Basic syntax checks
  const hasContent = trimmed.length > 0;
  const notEmpty = trimmed !== "";

  return hasValidType && hasContent && notEmpty;
}

/**
 * Stream Mermaid diagram creation in real-time using AI SDK's streamObject
 * Content is generated and streamed to the client as the LLM produces it
 */
export async function streamMermaidDiagram(params: {
  title: string;
  instruction: string; // The user's request/instruction for diagram creation
  systemPrompt: string; // System prompt from database config
  dataStream: UIMessageStreamWriter<ChatMessage>;
  user?: User | null;
  chatId?: string;
  modelId: string;
  apiKey?: string;
  metadata?: Record<string, any>;
  streamToUI?: boolean; // If false, accumulate without streaming (for generate mode)
}): Promise<{ documentId: string; content: string }> {
  const {
    title,
    instruction,
    systemPrompt,
    dataStream,
    user,
    chatId,
    modelId,
    apiKey,
    metadata = {},
    streamToUI = true,
  } = params;
  const documentId = generateUUID();
  const correlationId = createCorrelationId();
  const performanceTracker = new PerformanceTracker({
    correlation_id: correlationId,
    agent_type: AgentType.MERMAID_AGENT,
    operation_type: AgentOperationType.DIAGRAM_GENERATION,
    operation_category: AgentOperationCategory.GENERATION,
    user_id: user?.id,
  });

  console.log("🎨 [STREAM-CREATE] Starting real-time diagram creation");
  console.log("🎨 [STREAM-CREATE] Document ID:", documentId);
  console.log("🎨 [STREAM-CREATE] Title:", title);
  console.log("🎨 [STREAM-CREATE] Model:", modelId);
  console.log("🎨 [STREAM-CREATE] Stream to UI:", streamToUI);
  console.log("🎨 [STREAM-CREATE] Correlation ID:", correlationId);

  // Write artifact metadata only if streaming to UI
  if (streamToUI) {
    dataStream.write({
      type: "data-kind",
      data: "mermaid code",
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

    console.log("🎨 [STREAM-CREATE] Metadata written, starting LLM generation");
  }

  // Get the Google model instance with proper API key handling
  let model;
  if (apiKey) {
    const googleProvider = createGoogleGenerativeAI({ apiKey });
    model = googleProvider(modelId);
  } else {
    model = google(modelId); // Fallback to environment variable
  }

  try {
    // Use streamObject for structured Mermaid diagram generation
    const { partialObjectStream } = streamObject({
      model,
      system: systemPrompt,
      prompt: instruction,
      schema: z.object({
        diagram: z
          .string()
          .describe(
            "Complete Mermaid diagram with valid syntax and proper formatting"
          ),
      }),
    });

    console.log("🎨 [STREAM-CREATE] LLM streaming started");

    // Accumulate content as it streams
    let generatedDiagram = "";
    let chunkCount = 0;

    // Stream content in real-time as LLM generates it
    for await (const partialObject of partialObjectStream) {
      if (partialObject.diagram) {
        generatedDiagram = partialObject.diagram;
        chunkCount++;

        // Write each delta immediately to the client (only if streaming to UI)
        if (streamToUI) {
          dataStream.write({
            type: "data-codeDelta",
            data: generatedDiagram, // Replace entire content
            transient: true,
          });
        }
      }
    }

    console.log("🎨 [STREAM-CREATE] LLM generation complete");
    console.log(
      "🎨 [STREAM-CREATE] Total content length:",
      generatedDiagram.length
    );
    console.log("🎨 [STREAM-CREATE] Total chunks streamed:", chunkCount);

    // Validate Mermaid syntax before saving
    if (!validateMermaidSyntax(generatedDiagram)) {
      throw new Error(
        "Generated diagram does not contain valid Mermaid syntax"
      );
    }

    // Save document to database if user is provided and streaming to UI
    if (user?.id && streamToUI) {
      console.log("🎨 [STREAM-CREATE] Saving to database for user:", user.id);
      await saveDocument({
        id: documentId,
        title,
        content: generatedDiagram,
        kind: "mermaid code",
        userId: user.id,
        chatId,
        metadata: {
          ...metadata,
          updateType: "create",
          agent: "GoogleMermaidAgentStreaming",
          createdAt: new Date().toISOString(),
          modelUsed: modelId,
        },
      });
      console.log("✅ [STREAM-CREATE] Saved to database");
    } else if (streamToUI) {
      console.log("⚠️ [STREAM-CREATE] No user provided, skipping database save");
    } else {
      console.log("ℹ️ [STREAM-CREATE] Generate mode - skipping database save");
    }

    // Signal streaming complete (only if streaming to UI)
    if (streamToUI) {
      dataStream.write({
        type: "data-finish",
        data: null,
        transient: true,
      });
    }

    console.log("✅ [STREAM-CREATE] Diagram creation completed successfully");

    // Log success
    await performanceTracker.end({
      success: true,
      model_id: modelId,
      resource_id: documentId,
      resource_type: "diagram",
      operation_metadata: {
        operation_type: "create",
        instruction_length: instruction.length,
        streaming: true,
        tool_name: "streamMermaidDiagram",
        chat_id: chatId,
        stream_to_ui: streamToUI,
        output_length: generatedDiagram.length,
        chunk_count: chunkCount,
      },
    });

    return { documentId, content: generatedDiagram };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("❌ [STREAM-CREATE] Generation failed:", errorMessage);

    // Log failure
    await performanceTracker.end({
      success: false,
      error_message: errorMessage,
      error_type: error instanceof Error ? error.name : "UnknownError",
      model_id: modelId,
      resource_id: documentId,
      resource_type: "diagram",
      operation_metadata: {
        operation_type: "create",
        instruction_length: instruction.length,
        streaming: true,
        tool_name: "streamMermaidDiagram",
        chat_id: chatId,
        stream_to_ui: streamToUI,
      },
    });

    // Write error to stream
    if (streamToUI) {
      dataStream.write({
        type: "data-finish",
        data: null,
        transient: true,
      });
    }

    throw new Error(`Failed to create diagram: ${errorMessage}`);
  }
}
