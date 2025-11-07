import type { UIMessageStreamWriter } from "ai";
import type { User } from "@supabase/supabase-js";
import { saveDocument } from "@/lib/db/queries";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";

export async function createSheetDocument(params: {
  title: string;
  csvData: string;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  user?: User | null;
  chatId?: string;
  metadata?: Record<string, any>;
}): Promise<string> {
  const { title, csvData, dataStream, user, chatId, metadata = {} } = params;
  const sheetId = generateUUID();
  
  // Write artifact metadata to stream to open side panel
  dataStream.write({
    type: "data-kind",
    data: "sheet",
    transient: true,
  });

  dataStream.write({
    type: "data-id",
    data: sheetId,
    transient: true,
  });

  dataStream.write({
    type: "data-title",
    data: title,
    transient: true,
  });

  dataStream.write({
    type: "data-clear",
    data: null,
    transient: true,
  });

  // Stream the CSV data to the artifact panel
  dataStream.write({
    type: "data-sheetDelta",
    data: csvData,
    transient: true,
  });

  // Save document to database if user is provided
  if (user?.id) {
    await saveDocument({
      id: sheetId,
      title,
      content: csvData,
      kind: "sheet",
      userId: user.id,
      chatId,
      metadata: {
        ...metadata,
        updateType: 'create',
        agentInfo: 'document-agent',
        createdAt: new Date().toISOString(),
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