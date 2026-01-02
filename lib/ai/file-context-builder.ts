/**
 * File Context Builder
 *
 * Builds file context for LLM from cached files or storage.
 * Retrieves file attachments from chat messages and includes them in context.
 *
 * @module lib/ai/file-context-builder
 */

import type { DBMessage } from "@/lib/db/drizzle-schema";
import { getFileCache, formatFileSize } from "@/lib/cache/file-cache";
import { createAdminClient } from "@/lib/db/supabase-client";
import { extractFileContent } from "@/lib/ai/file-processing";
import { logError, ErrorCategory, ErrorType } from "@/lib/errors/logger";

/**
 * File attachment metadata from database
 */
export interface FileAttachment {
	url: string;
	name: string;
	contentType: string;
	size: number;
	uploadedAt: string;
	storagePath: string;
}

/**
 * File with content (from cache or storage)
 */
export interface FileWithContent {
	name: string;
	contentType: string;
	size: number;
	content: string;
	uploadedAt: string;
	cached: boolean;
}

/**
 * Build file context from all messages in chat
 *
 * Flow:
 * 1. Extract file attachments from all messages
 * 2. For each file:
 *    a. Check cache first
 *    b. If not cached: fetch from storage + cache
 * 3. Build formatted context for LLM
 *
 * @param messages - All messages in chat
 * @param chatId - Chat ID
 * @param userId - User ID
 * @returns Formatted file context string
 */
export async function buildFileContext(
	messages: DBMessage[],
	chatId: string,
	userId: string,
): Promise<string> {
	// 1. Extract all file attachments from messages
	const fileAttachments: FileAttachment[] = [];

	for (const message of messages) {
		if (message.attachments && Array.isArray(message.attachments)) {
			fileAttachments.push(...(message.attachments as FileAttachment[]));
		}
	}

	if (fileAttachments.length === 0) {
		return "";
	}

	// 2. Get file contents (from cache or storage)
	const filesWithContent: FileWithContent[] = [];
	const cache = getFileCache();
	const supabase = createAdminClient();

	for (const attachment of fileAttachments) {
		try {
			// Extract fileId from storagePath
			const fileId = attachment.storagePath.split("/").pop();
			if (!fileId) {
				console.error(
					`[FileContext] Invalid storage path: ${attachment.storagePath}`,
				);
				continue;
			}

			// Check cache first
			const cachedFile = cache.get(userId, chatId, fileId);

			if (cachedFile) {
				// Found in cache
				filesWithContent.push({
					name: cachedFile.fileName,
					contentType: cachedFile.contentType,
					size: cachedFile.size,
					content: cachedFile.content,
					uploadedAt: cachedFile.uploadedAt,
					cached: true,
				});
				continue;
			}

			// Not in cache - fetch from storage
			console.log(
				`[FileContext] File not in cache, fetching: ${attachment.storagePath}`,
			);

			// Generate signed URL
			const { data: signedUrlData, error: signedUrlError } =
				await supabase.storage
					.from(process.env.NEXT_PUBLIC_STORAGE_BUCKET || "chat-attachments")
					.createSignedUrl(attachment.storagePath, 86400); // 24 hours

			if (signedUrlError || !signedUrlData) {
				console.error(
					`[FileContext] Signed URL error for ${attachment.storagePath}:`,
					signedUrlError,
				);

				await logError({
					error_type: ErrorType.SYSTEM,
					error_category: ErrorCategory.SIGNED_URL_GENERATION_FAILED,
					error_message:
						signedUrlError?.message || "Failed to generate signed URL",
					user_id: userId,
					error_details: {
						chatId,
						storagePath: attachment.storagePath,
						error: signedUrlError,
					},
				});

				continue;
			}

			const signedUrl = signedUrlData.signedUrl;

			// Extract content
			let content: string;
			try {
				content = await extractFileContent({
					url: signedUrl,
					name: attachment.name,
					mediaType: attachment.contentType,
				});
			} catch (error) {
				console.error(
					`[FileContext] Content extraction error for ${fileId}:`,
					error,
				);

				await logError({
					error_type: ErrorType.SYSTEM,
					error_category: ErrorCategory.FILE_PROCESSING_FAILED,
					error_message: error instanceof Error ? error.message : "Unknown error",
					user_id: userId,
					error_details: {
						chatId,
						storagePath: attachment.storagePath,
						fileId,
					},
				});

				content = `[Failed to extract content from ${attachment.name}]`;
			}

			// Cache the file
			const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

			cache.set(userId, chatId, fileId, {
				content,
				contentType: attachment.contentType,
				size: attachment.size,
				fileName: attachment.name,
				storagePath: attachment.storagePath,
				signedUrl,
				uploadedAt: attachment.uploadedAt,
				chatId,
				userId,
				cachedAt: Date.now(),
				expiresAt,
			});

			// Add to results
			filesWithContent.push({
				name: attachment.name,
				contentType: attachment.contentType,
				size: attachment.size,
				content,
				uploadedAt: attachment.uploadedAt,
				cached: false,
			});
		} catch (error) {
			console.error(
				`[FileContext] Error processing file ${attachment.name}:`,
				error,
			);
		}
	}

	if (filesWithContent.length === 0) {
		return "";
	}

	// 3. Build formatted context
	return formatFileContext(filesWithContent);
}

/**
 * Format files into context string for LLM
 *
 * @param files - Files with content
 * @returns Formatted context string
 */
function formatFileContext(files: FileWithContent[]): string {
	if (files.length === 0) {
		return "";
	}

	let context = "\n\n## Uploaded Files in This Conversation\n\n";
	context +=
		"The following files have been uploaded in this conversation and are available for reference:\n\n";

	for (const [index, file] of files.entries()) {
		context += `### ${index + 1}. ${file.name}\n`;
		context += `- **Type**: ${file.contentType}\n`;
		context += `- **Size**: ${formatFileSize(file.size)}\n`;
		context += `- **Uploaded**: ${new Date(file.uploadedAt).toLocaleString()}\n`;

		// Include content based on file type
		if (
			file.contentType.startsWith("text/") ||
			file.contentType.includes("json") ||
			file.contentType.includes("javascript") ||
			file.contentType.includes("typescript") ||
			file.contentType.includes("python") ||
			file.contentType.includes("xml") ||
			file.contentType.includes("html") ||
			file.contentType.includes("css") ||
			file.contentType.includes("sql")
		) {
			// Full content for text-based files
			const extension = getFileExtension(file.name, file.contentType);
			context += `- **Content**:\n\`\`\`${extension}\n${file.content}\n\`\`\`\n\n`;
		} else if (file.contentType.startsWith("image/")) {
			// Image description
			context += "- **Type**: Image file (visual analysis available)\n";
			context += `- **Note**: Image content has been processed for analysis\n\n`;
		} else if (file.contentType === "application/pdf") {
			// PDF preview
			const preview =
				file.content.length > 1000
					? `${file.content.slice(0, 1000)}...\n\n[Content truncated - full PDF available]`
					: file.content;
			context += `- **Content** (extracted from PDF):\n\`\`\`\n${preview}\n\`\`\`\n\n`;
		} else {
			// Other files - show preview
			const preview =
				file.content.length > 500
					? `${file.content.slice(0, 500)}...`
					: file.content;
			context += `- **Preview**:\n\`\`\`\n${preview}\n\`\`\`\n\n`;
		}
	}

	context +=
		"---\n\n**Instructions**: You can reference these files in your responses. Analyze the content, answer questions about them, or use them as context for your answers.\n\n";

	return context;
}

/**
 * Get file extension for syntax highlighting
 *
 * @param fileName - File name
 * @param contentType - MIME type
 * @returns File extension for syntax highlighting
 */
function getFileExtension(fileName: string, contentType: string): string {
	// Try to get from filename
	const match = fileName.match(/\.([a-z0-9]+)$/i);
	if (match) {
		return match[1];
	}

	// Fall back to content type mapping
	const typeMap: Record<string, string> = {
		"text/x-python": "python",
		"application/x-python-code": "python",
		"application/javascript": "javascript",
		"text/javascript": "javascript",
		"application/typescript": "typescript",
		"text/typescript": "typescript",
		"text/html": "html",
		"text/css": "css",
		"application/json": "json",
		"application/xml": "xml",
		"text/xml": "xml",
		"application/sql": "sql",
		"text/x-sql": "sql",
		"text/markdown": "markdown",
		"text/x-yaml": "yaml",
		"text/csv": "csv",
		"text/plain": "text",
	};

	return typeMap[contentType] || "text";
}

/**
 * Get summary of files in context (for logging)
 *
 * @param messages - All messages in chat
 * @returns File count and total size
 */
export function getFileContextSummary(messages: DBMessage[]): {
	fileCount: number;
	totalSize: number;
} {
	let fileCount = 0;
	let totalSize = 0;

	for (const message of messages) {
		if (message.attachments && Array.isArray(message.attachments)) {
			const attachments = message.attachments as FileAttachment[];
			fileCount += attachments.length;
			totalSize += attachments.reduce((sum, att) => sum + att.size, 0);
		}
	}

	return { fileCount, totalSize };
}
