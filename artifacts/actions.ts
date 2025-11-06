"use server";

import { getSuggestionsByDocumentId } from "@/lib/db/queries";
import type { Suggestion } from "@/lib/db/drizzle-schema";

export async function getSuggestions({ documentId }: { documentId: string }): Promise<Suggestion[]> {
  const suggestions = await getSuggestionsByDocumentId({ documentId });
  return (suggestions as Suggestion[]) ?? [];
}
