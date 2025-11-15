import type { User } from "@supabase/supabase-js";
import { createAuthErrorResponse, requireAuth } from "@/lib/auth/server";
import { getChatById, getVotesByChatId, voteMessage } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import {
  logUserActivity,
  createCorrelationId,
  UserActivityType,
  ActivityCategory,
} from "@/lib/logging";

export async function GET(request: Request) {
  const correlationId = createCorrelationId();
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get("chatId");

  if (!chatId) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameter chatId is required."
    ).toResponse();
  }

  // Authenticate user with Supabase
  let user: User;
  try {
    const authResult = await requireAuth();
    user = authResult.user;
  } catch (error) {
    return createAuthErrorResponse(error as Error);
  }

  const chat = await getChatById({ id: chatId });

  if (!chat) {
    return new ChatSDKError("not_found:chat").toResponse();
  }

  if (chat.user_id !== user.id) {
    return new ChatSDKError("forbidden:vote").toResponse();
  }

  try {
    const votes = await getVotesByChatId({ id: chatId });

    // Log successful vote retrieval
    await logUserActivity({
      user_id: user.id,
      correlation_id: correlationId,
      activity_type: UserActivityType.VOTE_MESSAGE,
      activity_category: ActivityCategory.VOTE,
      activity_metadata: {
        chat_id: chatId,
        vote_count: votes.length,
        action: "retrieve",
      },
      resource_id: chatId,
      resource_type: "chat",
      request_path: request.url,
      request_method: "GET",
      success: true,
    });

    return Response.json(votes, { status: 200 });
  } catch (error) {
    // Log failed vote retrieval
    await logUserActivity({
      user_id: user.id,
      correlation_id: correlationId,
      activity_type: UserActivityType.VOTE_MESSAGE,
      activity_category: ActivityCategory.VOTE,
      success: false,
      error_message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export async function PATCH(request: Request) {
  const correlationId = createCorrelationId();
  const {
    chatId,
    messageId,
    type,
  }: { chatId: string; messageId: string; type: "up" | "down" } =
    await request.json();

  if (!chatId || !messageId || !type) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameters chatId, messageId, and type are required."
    ).toResponse();
  }

  // Authenticate user with Supabase
  let user: User;
  try {
    const authResult = await requireAuth();
    user = authResult.user;
  } catch (error) {
    return createAuthErrorResponse(error as Error);
  }

  const chat = await getChatById({ id: chatId });

  if (!chat) {
    return new ChatSDKError("not_found:vote").toResponse();
  }

  if (chat.user_id !== user.id) {
    return new ChatSDKError("forbidden:vote").toResponse();
  }

  try {
    await voteMessage({
      chatId,
      messageId,
      type,
    });

    // Log successful vote
    await logUserActivity({
      user_id: user.id,
      correlation_id: correlationId,
      activity_type: UserActivityType.VOTE_MESSAGE,
      activity_category: ActivityCategory.VOTE,
      activity_metadata: {
        message_id: messageId,
        vote_type: type,
        chat_id: chatId,
      },
      resource_id: messageId,
      resource_type: "message",
      request_path: request.url,
      request_method: "PATCH",
      success: true,
    });

    return new Response("Message voted", { status: 200 });
  } catch (error) {
    // Log failed vote
    await logUserActivity({
      user_id: user.id,
      correlation_id: correlationId,
      activity_type: UserActivityType.VOTE_MESSAGE,
      activity_category: ActivityCategory.VOTE,
      success: false,
      error_message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}
