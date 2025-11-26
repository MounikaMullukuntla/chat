import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/db/supabase-client";
import { extractFileContent } from "@/lib/ai/file-processing";
import { getFileCache, type FileCacheEntry } from "@/lib/cache/file-cache";
import { logUserActivity } from "@/lib/logging/activity-logger";
import { logError } from "@/lib/errors/logger";
import {
	UserActivityType,
	ActivityCategory,
} from "@/lib/logging/activity-logger";
import { ErrorCategory } from "@/lib/errors/logger";

// Request validation schema
const RetrieveSchema = z.object({
	chatId: z.string().uuid("Invalid chat ID"),
	storagePaths: z
		.array(z.string())
		.min(1, "At least one file path required")
		.max(50, "Maximum 50 files can be retrieved at once"),
});

/**
 * Retrieve files from cache or Supabase Storage
 *
 * Flow:
 * 1. Check cache for each file
 * 2. If cached and not expired: return cached content
 * 3. If not cached or expired:
 *    - Generate new signed URL
 *    - Fetch content
 *    - Cache it
 *    - Return content
 *
 * @route POST /api/files/retrieve
 */
export async function POST(request: Request) {
	let userId: string;

	// 1. Authenticate user
	try {
		const { user } = await requireAuth();
		userId = user.id;
	} catch (error) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	// 2. Parse request body
	let body: unknown;
	try {
		body = await request.json();
	} catch (error) {
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	// 3. Validate request
	const validatedData = RetrieveSchema.safeParse(body);

	if (!validatedData.success) {
		const errorMessage = validatedData.error.errors
			.map((error) => error.message)
			.join(", ");

		return NextResponse.json({ error: errorMessage }, { status: 400 });
	}

	const { chatId, storagePaths } = validatedData.data;

	// 4. Get file cache instance
	const cache = getFileCache();
	const supabase = createAdminClient();
	const files: FileCacheEntry[] = [];
	const errors: Array<{ storagePath: string; error: string }> = [];

	// 5. Retrieve each file (from cache or storage)
	for (const storagePath of storagePaths) {
		try {
			// Extract fileId from storagePath
			// Path format: userId/chatId/fileId
			const pathParts = storagePath.split("/");
			const fileId = pathParts[pathParts.length - 1];

			// Verify path belongs to this user
			if (!storagePath.startsWith(`${userId}/`)) {
				errors.push({
					storagePath,
					error: "Access denied: File does not belong to user",
				});
				continue;
			}

			// Check cache first
			let file = cache.get(userId, chatId, fileId);

			if (file) {
				// Found in cache
				console.log(`[FileRetrieve] Cache hit: ${fileId}`);
				files.push(file);
				continue;
			}

			// Not in cache - fetch from storage
			console.log(`[FileRetrieve] Cache miss: ${fileId}, fetching from storage`);

			// Generate new signed URL
			const { data: signedUrlData, error: signedUrlError } =
				await supabase.storage
					.from(process.env.NEXT_PUBLIC_STORAGE_BUCKET || "chat-attachments")
					.createSignedUrl(storagePath, 86400); // 24 hours

			if (signedUrlError || !signedUrlData) {
				console.error(
					`[FileRetrieve] Signed URL error for ${storagePath}:`,
					signedUrlError,
				);

				await logError({
					category: ErrorCategory.SIGNED_URL_GENERATION_FAILED,
					message: signedUrlError?.message || "Failed to generate signed URL",
					userId,
					metadata: { chatId, storagePath, error: signedUrlError },
				});

				errors.push({
					storagePath,
					error: "Failed to generate access URL",
				});
				continue;
			}

			const signedUrl = signedUrlData.signedUrl;

			// Get file metadata from storage
			const { data: fileData, error: fileError } = await supabase.storage
				.from(process.env.NEXT_PUBLIC_STORAGE_BUCKET || "chat-attachments")
				.list(pathParts.slice(0, -1).join("/"), {
					search: fileId,
				});

			if (fileError || !fileData || fileData.length === 0) {
				console.error(
					`[FileRetrieve] File metadata error for ${storagePath}:`,
					fileError,
				);

				errors.push({
					storagePath,
					error: "File not found in storage",
				});
				continue;
			}

			const fileMetadata = fileData[0];
			const contentType =
				fileMetadata.metadata?.mimetype || "application/octet-stream";

			// Extract content
			let content: string;
			try {
				content = await extractFileContent({
					url: signedUrl,
					name: fileId,
					mediaType: contentType,
				});
			} catch (error) {
				console.error(
					`[FileRetrieve] Content extraction error for ${fileId}:`,
					error,
				);

				await logError({
					category: ErrorCategory.FILE_PROCESSING_FAILED,
					message: error instanceof Error ? error.message : "Unknown error",
					userId,
					metadata: { chatId, storagePath, fileId },
				});

				content = `[Failed to extract content from ${fileId}]`;
			}

			// Cache the file
			const uploadedAt =
				fileMetadata.created_at || new Date().toISOString();
			const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

			cache.set(userId, chatId, fileId, {
				content,
				contentType,
				size: fileMetadata.metadata?.size || 0,
				fileName: fileId,
				storagePath,
				signedUrl,
				uploadedAt,
				chatId,
				userId,
				cachedAt: Date.now(),
				expiresAt,
			});

			// Get from cache (to ensure consistency)
			file = cache.get(userId, chatId, fileId);

			if (file) {
				files.push(file);
			}
		} catch (error) {
			console.error(
				`[FileRetrieve] Unexpected error for ${storagePath}:`,
				error,
			);

			errors.push({
				storagePath,
				error: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}

	// 6. Log activity
	await logUserActivity({
		user_id: userId,
		activity_type: UserActivityType.FILE_DOWNLOAD,
		activity_category: ActivityCategory.CHAT,
		activity_metadata: {
			chatId,
			filesRequested: storagePaths.length,
			filesRetrieved: files.length,
			filesFailed: errors.length,
		},
		resource_type: "file_attachment",
		resource_id: chatId,
		success: files.length > 0,
	});

	// 7. Return files
	return NextResponse.json({
		files: files.map((f) => ({
			content: f.content,
			contentType: f.contentType,
			size: f.size,
			fileName: f.fileName,
			storagePath: f.storagePath,
			uploadedAt: f.uploadedAt,
			cached: true,
		})),
		errors: errors.length > 0 ? errors : undefined,
		summary: {
			requested: storagePaths.length,
			retrieved: files.length,
			failed: errors.length,
		},
	});
}
