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

export async function GET(request: Request) {
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

    return new ChatSDKError("bad_request:database").toResponse();
  }
}

export async function POST(request: Request) {
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

  const {
    content,
    title,
    kind,
  }: { content: string; title: string; kind: ArtifactKind } =
    await request.json();

  const documents = await getDocumentsById({ id });

  if (documents.length > 0) {
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

  return Response.json(document, { status: 200 });
}

export async function DELETE(request: Request) {
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

  const documents = await getDocumentsById({ id });

  const [document] = documents;

  if (document.user_id !== user.id) {
    return new ChatSDKError("forbidden:document").toResponse();
  }

  const documentsDeleted = await deleteDocumentsByIdAfterTimestamp({
    id,
    timestamp: new Date(timestamp),
  });

  return Response.json(documentsDeleted, { status: 200 });
}
