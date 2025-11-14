"use server";

import type { UIMessage } from "ai";
import { cookies } from "next/headers";
import type { VisibilityType } from "@/components/visibility-selector";
import {
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById,
  updateChatVisiblityById,
} from "@/lib/db/queries";

export async function saveChatModelAsCookie(model: string) {
  const cookieStore = await cookies();
  cookieStore.set("chat-model", model);
}

export async function generateTitleFromUserMessage({
  message,
}: {
  message: UIMessage;
}) {
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
  return title || "New Chat";
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const [message] = await getMessageById({ id });

  await deleteMessagesByChatIdAfterTimestamp({
    chatId: message.chatId,
    timestamp: message.createdAt,
  });
}

export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  await updateChatVisiblityById({ chatId, visibility });
}
