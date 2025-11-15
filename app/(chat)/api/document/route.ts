import type { User } from "@supabase/supabase-js";
import type { ArtifactKind } from "@/components/artifact";
import { createAuthErrorResponse, requireAuth } from "@/lib/auth/server";
import {
  deleteDocumentsByIdAfterTimestamp,
  getDocumentsById,
  saveDocument,
} from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import {
  ErrorCategory,
  ErrorSeverity,
  logApiError,
  logPermissionError,
} from "@/lib/errors/logger";
import {
  logUserActivity,
  createCorrelationId,
  UserActivityType,
  ActivityCategory,
} from "@/lib/logging";

export async function GET(request: Request) {
  const correlationId = createCorrelationId();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    await logApiError(
      ErrorCategory.INVALID_REQUEST,
      "Document GET request missing required id parameter",
      {
        request: {
          method: "GET",
          url: request.url,
          headers: Object.fromEntries(request.headers.entries()),
        },
      },
      ErrorSeverity.WARNING
    );

    return await new ChatSDKError(
      "bad_request:api",
      "Parameter id is missing"
    ).toResponse({
      request_path: request.url,
      request_method: "GET",
      user_agent: request.headers.get("user-agent") || undefined,
    });
  }

  // Authenticate user with Supabase
  let user: User;
  try {
    const authResult = await requireAuth();
    user = authResult.user;
  } catch (error) {
    await logApiError(
      ErrorCategory.UNAUTHORIZED_ACCESS,
      `Document GET request authentication failed: ${error instanceof Error ? error.message : "Unknown auth error"}`,
      {
        request: {
          method: "GET",
          url: request.url,
          headers: Object.fromEntries(request.headers.entries()),
        },
      },
      ErrorSeverity.WARNING
    );

    return createAuthErrorResponse(error as Error);
  }

  try {
    const documents = await getDocumentsById({ id });
    const [document] = documents;

    if (!document) {
      await logApiError(
        ErrorCategory.API_REQUEST_FAILED,
        `Document not found: ${id}`,
        {
          request: {
            method: "GET",
            url: request.url,
          },
          user,
        },
        ErrorSeverity.INFO
      );

      return new ChatSDKError("not_found:document").toResponse();
    }

    if (document.user_id !== user.id) {
      await logPermissionError(
        ErrorCategory.PERMISSION_DENIED,
        `User attempted to access document ${id} owned by another user`,
        {
          documentOwnerId: document.user_id,
          requestingUserId: user.id,
          requestUrl: request.url,
        },
        user.id,
        ErrorSeverity.WARNING
      );

      return new ChatSDKError("forbidden:document").toResponse();
    }

    // Log successful document view
    await logUserActivity({
      user_id: user.id,
      correlation_id: correlationId,
      activity_type: UserActivityType.DOCUMENT_VIEW,
      activity_category: ActivityCategory.DOCUMENT,
      activity_metadata: {
        document_kind: document.kind,
        version_count: documents.length,
      },
      resource_id: id,
      resource_type: "document",
      request_path: request.url,
      request_method: "GET",
      success: true,
    });

    return Response.json(documents, { status: 200 });
  } catch (error) {
    await logApiError(
      ErrorCategory.DATABASE_ERROR,
      `Failed to retrieve document ${id} from database: ${error instanceof Error ? error.message : "Unknown database error"}`,
      {
        request: {
          method: "GET",
          url: request.url,
        },
        user,
      },
      ErrorSeverity.ERROR
    );

    // Log failed document view
    await logUserActivity({
      user_id: user.id,
      correlation_id: correlationId,
      activity_type: UserActivityType.DOCUMENT_VIEW,
      activity_category: ActivityCategory.DOCUMENT,
      success: false,
      error_message: error instanceof Error ? error.message : "Unknown error",
    });

    return new ChatSDKError("bad_request:database").toResponse();
  }
}

export async function POST(request: Request) {
  const correlationId = createCorrelationId();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameter id is required."
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
    const {
      content,
      title,
      kind,
    }: { content: string; title: string; kind: ArtifactKind } =
      await request.json();

    const documents = await getDocumentsById({ id });
    const isUpdate = documents.length > 0;

    if (isUpdate) {
      const [doc] = documents;

      if (doc.user_id !== user.id) {
        return new ChatSDKError("forbidden:document").toResponse();
      }
    }

    const document = await saveDocument({
      id,
      content,
      title,
      kind,
      userId: user.id,
    });

    // Log document creation or update
    await logUserActivity({
      user_id: user.id,
      correlation_id: correlationId,
      activity_type: isUpdate ? UserActivityType.DOCUMENT_UPDATE : UserActivityType.DOCUMENT_CREATE,
      activity_category: ActivityCategory.DOCUMENT,
      activity_metadata: {
        document_kind: kind,
        title_length: title.length,
        content_length: content.length,
      },
      resource_id: id,
      resource_type: "document",
      request_path: request.url,
      request_method: "POST",
      success: true,
    });

    return Response.json(document, { status: 200 });
  } catch (error) {
    // Log failed document save
    await logUserActivity({
      user_id: user.id,
      correlation_id: correlationId,
      activity_type: UserActivityType.DOCUMENT_CREATE,
      activity_category: ActivityCategory.DOCUMENT,
      success: false,
      error_message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export async function DELETE(request: Request) {
  const correlationId = createCorrelationId();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const timestamp = searchParams.get("timestamp");

  if (!id) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameter id is required."
    ).toResponse();
  }

  if (!timestamp) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameter timestamp is required."
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
    const documents = await getDocumentsById({ id });

    const [document] = documents;

    if (document.user_id !== user.id) {
      return new ChatSDKError("forbidden:document").toResponse();
    }

    const documentsDeleted = await deleteDocumentsByIdAfterTimestamp({
      id,
      timestamp: new Date(timestamp),
    });

    // Log successful document deletion
    await logUserActivity({
      user_id: user.id,
      correlation_id: correlationId,
      activity_type: UserActivityType.DOCUMENT_DELETE,
      activity_category: ActivityCategory.DOCUMENT,
      activity_metadata: {
        document_kind: document.kind,
        timestamp_filter: timestamp,
        versions_deleted: documentsDeleted.length,
      },
      resource_id: id,
      resource_type: "document",
      request_path: request.url,
      request_method: "DELETE",
      success: true,
    });

    return Response.json(documentsDeleted, { status: 200 });
  } catch (error) {
    // Log failed document deletion
    await logUserActivity({
      user_id: user.id,
      correlation_id: correlationId,
      activity_type: UserActivityType.DOCUMENT_DELETE,
      activity_category: ActivityCategory.DOCUMENT,
      success: false,
      error_message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}
