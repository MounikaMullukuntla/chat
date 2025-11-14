"use server";

import type { Suggestion } from "@/lib/db/drizzle-schema";
import { getSuggestionsByDocumentId } from "@/lib/db/queries";

export async function getSuggestions({
  documentId,
}: {
  documentId: string;
}): Promise<Suggestion[]> {
  const suggestions = await getSuggestionsByDocumentId({ documentId });
  return (suggestions as Suggestion[]) ?? [];
}
