import "server-only";

import { createGoogleGenerativeAI, google } from "@ai-sdk/google";
import type { User } from "@supabase/supabase-js";
import type { UIMessageStreamWriter } from "ai";
import { streamObject } from "ai";
import { z } from "zod";
import { getDocumentById } from "@/lib/db/queries";
import {
  AgentOperationCategory,
  AgentOperationType,
  AgentType,
  createCorrelationId,
  PerformanceTracker,
} from "@/lib/logging/activity-logger";
import type { ChatMessage } from "@/lib/types";

/**
 * Generate suggestions for a document using AI SDK's streamObject
 * Suggestions are streamed in real-time as they are generated
 */
export async function streamDocumentSuggestions(params: {
  documentId: string;
  instruction: string;
  systemPrompt: string;
  userPromptTemplate: string; // User prompt template from database config
  dataStream: UIMessageStreamWriter<ChatMessage>;
  user?: User | null;
  chatId?: string;
  modelId: string;
  apiKey?: string;
}): Promise<{ documentId: string; suggestionCount: number }> {
  const {
    documentId,
    instruction,
    systemPrompt,
    userPromptTemplate,
    dataStream,
    user,
    chatId,
    modelId,
    apiKey,
  } = params;

  const correlationId = createCorrelationId();
  const performanceTracker = new PerformanceTracker({
    correlation_id: correlationId,
    agent_type: AgentType.DOCUMENT_AGENT,
    operation_type: AgentOperationType.DOCUMENT_GENERATION,
    operation_category: AgentOperationCategory.GENERATION,
    user_id: user?.id,
  });

  console.log("💡 [SUGGESTIONS] Starting suggestion generation");
  console.log("💡 [SUGGESTIONS] Document ID:", documentId);
  console.log("💡 [SUGGESTIONS] Model:", modelId);
  console.log("💡 [SUGGESTIONS] Correlation ID:", correlationId);

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

  console.log("💡 [SUGGESTIONS] Document found:", document.title);
  console.log(
    "💡 [SUGGESTIONS] Content length:",
    document.content?.length || 0
  );

  // Get the Google model instance with proper API key handling
  let model;
  if (apiKey) {
    const googleProvider = createGoogleGenerativeAI({ apiKey });
    model = googleProvider(modelId);
  } else {
    model = google(modelId);
  }

  // Define the suggestion schema
  const suggestionSchema = z.object({
    suggestions: z.array(
      z.object({
        originalText: z
          .string()
          .describe("The exact text from the document that needs improvement"),
        suggestedText: z.string().describe("The improved replacement text"),
        description: z
          .string()
          .describe(
            "Brief explanation of why this suggestion improves the text"
          ),
      })
    ),
  });

  // Build the prompt for suggestion generation using template from config
  const userPrompt = userPromptTemplate
    .replace("{currentContent}", document.content || "")
    .replace("{instruction}", instruction);

  try {
    // Use streamObject to get structured suggestions
    const { partialObjectStream } = streamObject({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      schema: suggestionSchema,
      temperature: 0.7,
    });

    console.log("💡 [SUGGESTIONS] Starting to stream suggestions");

    let suggestionCount = 0;

    // Stream suggestions as they are generated
    for await (const partialObject of partialObjectStream) {
      if (
        partialObject.suggestions &&
        Array.isArray(partialObject.suggestions)
      ) {
        // Check if we have new suggestions to stream
        const currentSuggestionCount = partialObject.suggestions.length;

        if (currentSuggestionCount > suggestionCount) {
          // Stream only the new suggestions
          for (let i = suggestionCount; i < currentSuggestionCount; i++) {
            const suggestion = partialObject.suggestions[i];

            // Only stream if the suggestion exists and is complete
            if (
              suggestion?.originalText &&
              suggestion.suggestedText &&
              suggestion.description
            ) {
              console.log(`💡 [SUGGESTIONS] Streaming suggestion ${i + 1}:`, {
                original: suggestion.originalText.substring(0, 50),
                suggested: suggestion.suggestedText.substring(0, 50),
              });

              // Write suggestion to stream
              dataStream.write({
                type: "data-suggestion",
                data: {
                  id: `${documentId}-suggestion-${Date.now()}-${i}`,
                  documentId,
                  originalText: suggestion.originalText,
                  suggestedText: suggestion.suggestedText,
                  description: suggestion.description,
                  createdAt: new Date(),
                  user_id: user?.id || null,
                  chat_id: chatId || null,
                },
                transient: true,
              });

              suggestionCount++;
            }
          }
        }
      }
    }

    console.log("💡 [SUGGESTIONS] Suggestion generation complete");
    console.log(
      "💡 [SUGGESTIONS] Total suggestions generated:",
      suggestionCount
    );

    // Signal completion
    dataStream.write({
      type: "data-finish",
      data: null,
      transient: true,
    });

    // Log success via PerformanceTracker
    await performanceTracker.end({
      success: true,
      model_id: modelId,
      resource_id: documentId,
      resource_type: "document",
      operation_metadata: {
        operation_type: "suggestions",
        query_length: instruction.length,
        streaming: true,
        tool_name: "streamDocumentSuggestions",
        chat_id: chatId,
        suggestion_count: suggestionCount,
      },
    });

    return {
      documentId,
      suggestionCount,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("❌ [SUGGESTIONS] Generation failed:", errorMessage);

    // Log failure via PerformanceTracker
    await performanceTracker.end({
      success: false,
      error_message: errorMessage,
      error_type: error instanceof Error ? error.name : "UnknownError",
      model_id: modelId,
      resource_id: documentId,
      resource_type: "document",
      operation_metadata: {
        operation_type: "suggestions",
        query_length: instruction.length,
        streaming: true,
        tool_name: "streamDocumentSuggestions",
        chat_id: chatId,
      },
    });

    // Write error to stream
    dataStream.write({
      type: "data-finish",
      data: null,
      transient: true,
    });

    throw new Error(`Failed to generate suggestions: ${errorMessage}`);
  }
}
