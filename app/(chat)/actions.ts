"use server";

import type { UIMessage } from "ai";
import { cookies } from "next/headers";
import type { VisibilityType } from "@/components/visibility-selector";
import {
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById,
  updateChatVisiblityById,
} from "@/lib/db/queries";
import {
  logUserActivity,
  logAgentActivity,
  PerformanceTracker,
  createCorrelationId,
  UserActivityType,
  ActivityCategory,
  AgentType,
  AgentOperationType,
  AgentOperationCategory,
} from "@/lib/logging/activity-logger";
import { getCurrentUser } from "@/lib/auth/server";

export async function saveChatModelAsCookie(model: string) {
  const correlationId = createCorrelationId();
  const tracker = new PerformanceTracker();

  try {
    const user = await getCurrentUser();
    const cookieStore = await cookies();
    cookieStore.set("chat-model", model);

    // Log model selection activity
    await logUserActivity({
      userId: user?.id || "anonymous",
      type: UserActivityType.MODEL_SELECTION,
      category: ActivityCategory.SYSTEM,
      description: `Model selected: ${model}`,
      metadata: {
        model_id: model,
        previous_model: cookieStore.get("chat-model")?.value,
      },
      correlationId,
      duration: tracker.end(),
    });
  } catch (error) {
    console.error("Error saving chat model:", error);
    throw error;
  }
}

export async function generateTitleFromUserMessage({
  message,
}: {
  message: UIMessage;
}) {
  const correlationId = createCorrelationId();
  const tracker = new PerformanceTracker();

  try {
    await Promise.resolve(); // Server actions must be async

    // Simple title generation - use first few characters of user input
    const textParts = message.parts.filter((part) => part.type === "text");
    const firstText = textParts[0]?.text || "New Chat";

    // Take first 50 characters and clean up
    let title = firstText.substring(0, 50).trim();

    // Remove quotes and colons as requested
    title = title.replace(/[":]/g, "");

    // Add ellipsis if truncated
    if (firstText.length > 50) {
      title += "...";
    }

    // Fallback if empty
    title = title || "New Chat";

    // Log agent activity for title generation
    await logAgentActivity({
      userId: "system",
      agentType: AgentType.TITLE_GENERATOR,
      operationType: AgentOperationType.GENERATE,
      category: AgentOperationCategory.CONTENT_GENERATION,
      description: "Generated chat title from user message",
      metadata: {
        message_id: message.id,
        original_text_length: firstText.length,
        generated_title: title,
        was_truncated: firstText.length > 50,
      },
      correlationId,
      duration: tracker.end(),
    });

    return title;
  } catch (error) {
    console.error("Error generating title:", error);
    throw error;
  }
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const correlationId = createCorrelationId();
  const tracker = new PerformanceTracker();

  try {
    const user = await getCurrentUser();
    const [message] = await getMessageById({ id });

    await deleteMessagesByChatIdAfterTimestamp({
      chatId: message.chatId,
      timestamp: message.createdAt,
    });

    // Log message deletion activity
    await logUserActivity({
      userId: user?.id || "anonymous",
      type: UserActivityType.MESSAGE_DELETE,
      category: ActivityCategory.CHAT,
      description: "Deleted trailing messages in chat",
      metadata: {
        chat_id: message.chatId,
        message_id: id,
        timestamp: message.createdAt.toISOString(),
      },
      correlationId,
      duration: tracker.end(),
    });
  } catch (error) {
    console.error("Error deleting trailing messages:", error);
    throw error;
  }
}

export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  const correlationId = createCorrelationId();
  const tracker = new PerformanceTracker();

  try {
    const user = await getCurrentUser();
    await updateChatVisiblityById({ chatId, visibility });

    // Log visibility update activity
    await logUserActivity({
      userId: user?.id || "anonymous",
      type: UserActivityType.CHAT_UPDATE,
      category: ActivityCategory.CHAT,
      description: `Updated chat visibility to ${visibility}`,
      metadata: {
        chat_id: chatId,
        visibility,
      },
      correlationId,
      duration: tracker.end(),
    });
  } catch (error) {
    console.error("Error updating chat visibility:", error);
    throw error;
  }
}
