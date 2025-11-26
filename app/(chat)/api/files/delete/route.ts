import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/db/supabase-client";
import { getFileCache } from "@/lib/cache/file-cache";
import { logUserActivity } from "@/lib/logging/activity-logger";
import { logError } from "@/lib/errors/logger";
import {
	UserActivityType,
	ActivityCategory,
} from "@/lib/logging/activity-logger";
import { ErrorCategory } from "@/lib/errors/logger";

// Request validation schema
const DeleteSchema = z.object({
	storagePath: z.string().min(1, "Storage path required"),
	chatId: z.string().uuid("Invalid chat ID"),
});

/**
 * Delete file from Supabase Storage and clear from cache
 *
 * Flow:
 * 1. Validate user is authenticated
 * 2. Verify file belongs to user
 * 3. Delete from Supabase Storage
 * 4. Clear from cache
 * 5. Return success
 *
 * @route DELETE /api/files/delete
 */
export async function DELETE(request: Request) {
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
	const validatedData = DeleteSchema.safeParse(body);

	if (!validatedData.success) {
		const errorMessage = validatedData.error.errors
			.map((error) => error.message)
			.join(", ");

		return NextResponse.json({ error: errorMessage }, { status: 400 });
	}

	const { storagePath, chatId } = validatedData.data;

	// 4. Verify file belongs to user
	if (!storagePath.startsWith(`${userId}/`)) {
		await logError({
			category: ErrorCategory.STORAGE_ACCESS_DENIED,
			message: "Attempted to delete file not owned by user",
			userId,
			metadata: { storagePath, chatId },
		});

		return NextResponse.json(
			{ error: "Access denied: File does not belong to user" },
			{ status: 403 },
		);
	}

	// 5. Delete from Supabase Storage
	const supabase = createAdminClient();

	try {
		const { error: deleteError } = await supabase.storage
			.from(process.env.NEXT_PUBLIC_STORAGE_BUCKET || "chat-attachments")
			.remove([storagePath]);

		if (deleteError) {
			console.error("[FileDelete] Delete error:", deleteError);

			await logError({
				category: ErrorCategory.FILE_SYSTEM_ERROR,
				message: deleteError.message,
				userId,
				metadata: { storagePath, chatId, error: deleteError },
			});

			return NextResponse.json(
				{ error: "Failed to delete file" },
				{ status: 500 },
			);
		}

		// 6. Clear from cache
		const cache = getFileCache();
		const fileId = storagePath.split("/").pop();

		if (fileId) {
			cache.delete(userId, chatId, fileId);
			console.log(`[FileDelete] Cleared from cache: ${fileId}`);
		}

		// 7. Log activity
		await logUserActivity({
			user_id: userId,
			activity_type: UserActivityType.FILE_DELETE,
			activity_category: ActivityCategory.FILE,
			activity_metadata: {
				storagePath,
				chatId,
			},
			resource_type: "file_attachment",
			resource_id: storagePath,
			success: true,
		});

		// 8. Return success
		return NextResponse.json({
			success: true,
			message: "File deleted successfully",
			storagePath,
		});
	} catch (error) {
		console.error("[FileDelete] Unexpected error:", error);

		await logError({
			category: ErrorCategory.FILE_SYSTEM_ERROR,
			message: error instanceof Error ? error.message : "Unknown error",
			userId,
			metadata: { storagePath, chatId },
		});

		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
