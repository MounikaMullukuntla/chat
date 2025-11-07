import type { UIMessageStreamWriter } from "ai";
import type { User } from "@supabase/supabase-js";
import { getDocumentById, saveDocument } from "@/lib/db/queries";
import type { ChatMessage } from "@/lib/types";

export async function updateSheetDocument(params: {
  sheetId: string;
  csvData: string;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  user?: User | null;
  chatId?: string;
  metadata?: Record<string, any>;
}): Promise<string> {
  const { sheetId, csvData, dataStream, user, chatId, metadata = {} } = params;
  
  // Fetch the existing document from database
  const document = await getDocumentById({ id: sheetId });
  
  if (!document) {
    throw new Error(`Sheet with ID ${sheetId} not found`);
  }

  if (document.kind !== 'sheet') {
    throw new Error(`Document ${sheetId} is not a sheet document (kind: ${document.kind})`);
  }

  // Clear the artifact panel for update
  dataStream.write({
    type: "data-clear",
    data: null,
    transient: true,
  });

  // Stream the updated CSV data to the artifact panel
  dataStream.write({
    type: "data-sheetDelta",
    data: csvData,
    transient: true,
  });

  // Save updated document to database if user is provided
  if (user?.id) {
    await saveDocument({
      id: sheetId,
      title: document.title,
      content: csvData,
      kind: "sheet",
      userId: user.id,
      chatId: chatId || document.chat_id || undefined,
      parentVersionId: `${document.id}`, // Link to previous version
      metadata: {
        ...metadata,
        updateType: 'update',
        agentInfo: 'document-agent',
        previousVersion: document.version_number,
        updatedAt: new Date().toISOString(),
      },
    });
  }

  dataStream.write({ 
    type: "data-finish", 
    data: null, 
    transient: true 
  });

  return sheetId;
}