import "server-only";

import {
  and,
  asc,
  desc,
  eq,
  gt,
  max,
} from "drizzle-orm";
import type { ArtifactKind } from "@/components/artifact";
import { ChatSDKError } from "../../errors";
import {
  document,
  suggestion,
  type Suggestion,
} from "../drizzle-schema";
import { db } from "./base";

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
  chatId,
  parentVersionId,
  metadata = {},
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
  chatId?: string;
  parentVersionId?: string;
  metadata?: Record<string, any>;
}) {
  try {
    // Get the next version number for this document
    const versionResult = await db
      .select({ maxVersion: max(document.version_number) })
      .from(document)
      .where(eq(document.id, id));
    
    const nextVersion = (versionResult[0]?.maxVersion || 0) + 1;

    return await db
      .insert(document)
      .values({
        id,
        title,
        kind,
        content,
        user_id: userId,
        chat_id: chatId,
        parent_version_id: parentVersionId,
        version_number: nextVersion,
        metadata,
        createdAt: new Date(),
      })
      .returning();
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save document");
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get documents by id"
    );
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.version_number));

    return selectedDocument;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get document by id"
    );
  }
}

export async function getDocumentVersions({ id }: { id: string }) {
  try {
    const versions = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.version_number));

    return versions;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get document versions"
    );
  }
}

export async function getDocumentsByChat({ chatId }: { chatId: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.chat_id, chatId))
      .orderBy(desc(document.createdAt));

    return documents;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get documents by chat"
    );
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp)
        )
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)))
      .returning();
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete documents by id after timestamp"
    );
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Suggestion[];
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to save suggestions"
    );
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(and(eq(suggestion.documentId, documentId)));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get suggestions by document id"
    );
  }
}