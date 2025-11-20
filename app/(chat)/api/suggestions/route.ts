import type { User } from "@supabase/supabase-js";
import { createAuthErrorResponse, requireAuth } from "@/lib/auth/server";
import { getSuggestionsByDocumentId } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import {
  ActivityCategory,
  createCorrelationId,
  logUserActivity,
  UserActivityType,
} from "@/lib/logging";

export async function GET(request: Request) {
  const correlationId = createCorrelationId();
  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get("documentId");

  if (!documentId) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameter documentId is required."
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
    const suggestions = await getSuggestionsByDocumentId({
      documentId,
    });

    const [suggestion] = suggestions;

    if (!suggestion) {
      // Log successful suggestion view (no suggestions found)
      await logUserActivity({
        user_id: user.id,
        correlation_id: correlationId,
        activity_type: UserActivityType.SUGGESTION_VIEW,
        activity_category: ActivityCategory.DOCUMENT,
        activity_metadata: {
          document_id: documentId,
          suggestion_count: 0,
        },
        resource_id: documentId,
        resource_type: "document",
        request_path: request.url,
        request_method: "GET",
        success: true,
      });

      return Response.json([], { status: 200 });
    }

    if (suggestion.user_id !== user.id) {
      return new ChatSDKError("forbidden:api").toResponse();
    }

    // Log successful suggestion view
    await logUserActivity({
      user_id: user.id,
      correlation_id: correlationId,
      activity_type: UserActivityType.SUGGESTION_VIEW,
      activity_category: ActivityCategory.DOCUMENT,
      activity_metadata: {
        document_id: documentId,
        suggestion_count: suggestions.length,
      },
      resource_id: documentId,
      resource_type: "document",
      request_path: request.url,
      request_method: "GET",
      success: true,
    });

    return Response.json(suggestions, { status: 200 });
  } catch (error) {
    // Log failed suggestion view
    await logUserActivity({
      user_id: user.id,
      correlation_id: correlationId,
      activity_type: UserActivityType.SUGGESTION_VIEW,
      activity_category: ActivityCategory.DOCUMENT,
      success: false,
      error_message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}
