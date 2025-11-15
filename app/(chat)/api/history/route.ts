import type { User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { createAuthErrorResponse, requireAuth } from "@/lib/auth/server";
import { deleteAllChatsByUserId, getChatsByUserId } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import {
  logUserActivity,
  createCorrelationId,
  UserActivityType,
  ActivityCategory,
} from "@/lib/logging";

export async function GET(request: NextRequest) {
  const correlationId = createCorrelationId();
  const { searchParams } = request.nextUrl;

  const limit = Number.parseInt(searchParams.get("limit") || "10", 10);
  const startingAfter = searchParams.get("starting_after");
  const endingBefore = searchParams.get("ending_before");

  if (startingAfter && endingBefore) {
    return new ChatSDKError(
      "bad_request:api",
      "Only one of starting_after or ending_before can be provided."
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

  try {
    const chats = await getChatsByUserId({
      id: user.id,
      limit,
      startingAfter,
      endingBefore,
    });

    // Log successful history access
    await logUserActivity({
      user_id: user.id,
      correlation_id: correlationId,
      activity_type: UserActivityType.HISTORY_ACCESS,
      activity_category: ActivityCategory.HISTORY,
      activity_metadata: {
        limit,
        cursor: startingAfter || endingBefore || null,
        result_count: chats.length,
      },
      request_path: request.url,
      request_method: "GET",
      success: true,
    });

    return Response.json(chats);
  } catch (error) {
    // Log failed history access
    await logUserActivity({
      user_id: user.id,
      correlation_id: correlationId,
      activity_type: UserActivityType.HISTORY_ACCESS,
      activity_category: ActivityCategory.HISTORY,
      success: false,
      error_message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export async function DELETE(request: NextRequest) {
  const correlationId = createCorrelationId();

  // Authenticate user with Supabase
  let user: User;
  try {
    const authResult = await requireAuth();
    user = authResult.user;
  } catch (error) {
    return createAuthErrorResponse(error as Error);
  }

  try {
    const result = await deleteAllChatsByUserId({ userId: user.id });

    // Log successful history deletion (CRITICAL - destructive operation)
    await logUserActivity({
      user_id: user.id,
      correlation_id: correlationId,
      activity_type: UserActivityType.HISTORY_DELETE,
      activity_category: ActivityCategory.HISTORY,
      activity_metadata: {
        chats_deleted: result.length,
      },
      request_path: request.url,
      request_method: "DELETE",
      success: true,
    });

    return Response.json(result, { status: 200 });
  } catch (error) {
    // Log failed history deletion
    await logUserActivity({
      user_id: user.id,
      correlation_id: correlationId,
      activity_type: UserActivityType.HISTORY_DELETE,
      activity_category: ActivityCategory.HISTORY,
      success: false,
      error_message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}
