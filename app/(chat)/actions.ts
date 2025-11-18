"use server";

import type { UIMessage } from "ai";
import { cookies } from "next/headers";
import type { VisibilityType } from "@/components/visibility-selector";
import { getCurrentUser } from "@/lib/auth/server";
import {
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById,
  updateChatVisiblityById,
} from "@/lib/db/queries";
import {
  ActivityCategory,
  AgentOperationCategory,
  AgentOperationType,
  AgentType,
  createCorrelationId,
  logUserActivity,
  PerformanceTracker,
  UserActivityType,
} from "@/lib/logging/activity-logger";

export async function saveChatModelAsCookie(model: string) {
  const correlationId = createCorrelationId();

  try {
    const user = await getCurrentUser();
    const cookieStore = await cookies();
    const previousModel = cookieStore.get("chat-model")?.value;
    cookieStore.set("chat-model", model);

    // Log model selection activity
    await logUserActivity({
      user_id: user?.id || "anonymous",
      correlation_id: correlationId,
      activity_type: UserActivityType.MODEL_SELECTION,
      activity_category: ActivityCategory.CHAT,
      activity_metadata: {
        model_id: model,
        previous_model: previousModel,
      },
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
  const tracker = new PerformanceTracker({
    correlation_id: correlationId,
    agent_type: AgentType.CHAT_MODEL_AGENT,
    operation_type: AgentOperationType.CODE_GENERATION,
    operation_category: AgentOperationCategory.GENERATION,
  });

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
    await tracker.end({
      operation_metadata: {
        message_id: message.id,
        original_text_length: firstText.length,
        generated_title: title,
        was_truncated: firstText.length > 50,
      },
      success: true,
    });

    return title;
  } catch (error) {
    console.error("Error generating title:", error);
    await tracker.end({
      success: false,
      error_message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const correlationId = createCorrelationId();

  try {
    const user = await getCurrentUser();
    const [message] = await getMessageById({ id });

    await deleteMessagesByChatIdAfterTimestamp({
      chatId: message.chatId,
      timestamp: message.createdAt,
    });

    // Log message deletion activity
    await logUserActivity({
      user_id: user?.id || "anonymous",
      correlation_id: correlationId,
      activity_type: UserActivityType.CHAT_DELETE,
      activity_category: ActivityCategory.CHAT,
      activity_metadata: {
        chat_id: message.chatId,
        message_id: id,
        timestamp: message.createdAt.toISOString(),
      },
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

  try {
    const user = await getCurrentUser();
    await updateChatVisiblityById({ chatId, visibility });

    // Log visibility update activity
    await logUserActivity({
      user_id: user?.id || "anonymous",
      correlation_id: correlationId,
      activity_type: UserActivityType.CHAT_VIEW,
      activity_category: ActivityCategory.CHAT,
      activity_metadata: {
        chat_id: chatId,
        visibility,
      },
    });
  } catch (error) {
    console.error("Error updating chat visibility:", error);
    throw error;
  }
}
