import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/db/supabase-client";
import { extractFileContent } from "@/lib/ai/file-processing";
import { getFileCache } from "@/lib/cache/file-cache";
import { logUserActivity } from "@/lib/logging/activity-logger";
import { logError } from "@/lib/errors/logger";
import {
	UserActivityType,
	ActivityCategory,
} from "@/lib/logging/activity-logger";
import { ErrorCategory, ErrorType } from "@/lib/errors/logger";

// Get max file size from env or default to 10MB
const MAX_FILE_SIZE =
	Number.parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE || "10485760", 10);

// Allowed MIME types (from admin config)
const ALLOWED_FILE_TYPES = [
	// Code files
	"text/x-python",
	"application/x-python-code",
	"text/x-python-script",
	"application/javascript",
	"text/javascript",
	"application/x-javascript",
	"application/typescript",
	"text/typescript",
	"text/html",
	"text/css",
	"application/json",
	"application/xml",
	"text/xml",
	"application/sql",
	"text/x-sql",
	// Text files
	"text/plain",
	"text/markdown",
	"text/x-yaml",
	"application/x-yaml",
	"text/yaml",
	"text/csv",
	"text/tab-separated-values",
	// Documents
	"application/pdf",
	// Images
	"image/png",
	"image/jpeg",
	"image/gif",
	"image/webp",
];

// File validation schema
const FileSchema = z.object({
	file: z
		.instanceof(Blob)
		.refine((file) => file.size > 0, {
			message: "File is empty",
		})
		.refine((file) => file.size <= MAX_FILE_SIZE, {
			message: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`,
		})
		.refine((file) => ALLOWED_FILE_TYPES.includes(file.type), {
			message: "File type not supported",
		}),
	chatId: z.string().uuid("Invalid chat ID"),
});

/**
 * Upload file to Supabase Storage (private bucket)
 * with signed URL generation and session caching
 *
 * Flow:
 * 1. Validate file (size, type)
 * 2. Upload to Supabase Storage (private bucket)
 * 3. Generate signed URL (24hr expiry)
 * 4. Extract file content
 * 5. Cache content in session
 * 6. Return metadata + signed URL
 *
 * @route POST /api/files/upload
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

	// 2. Parse form data
	if (request.body === null) {
		return NextResponse.json(
			{ error: "Request body is empty" },
			{ status: 400 },
		);
	}

	let formData: FormData;
	try {
		formData = await request.formData();
	} catch (error) {
		return NextResponse.json(
			{ error: "Invalid form data" },
			{ status: 400 },
		);
	}

	const file = formData.get("file") as Blob;
	const chatId = formData.get("chatId") as string;

	if (!file) {
		return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
	}

	if (!chatId) {
		return NextResponse.json({ error: "Chat ID required" }, { status: 400 });
	}

	// 3. Validate file
	const validatedData = FileSchema.safeParse({ file, chatId });

	if (!validatedData.success) {
		const errorMessage = validatedData.error.errors
			.map((error) => error.message)
			.join(", ");

		await logError({
			error_type: ErrorType.USER,
			error_category: ErrorCategory.FILE_TYPE_NOT_SUPPORTED,
			error_message: errorMessage,
			user_id: userId,
			error_details: { chatId, fileType: file.type, fileSize: file.size },
		});

		return NextResponse.json({ error: errorMessage }, { status: 400 });
	}

	// Get filename from formData
	const filename = (formData.get("file") as File).name || "unnamed";
	const timestamp = Date.now();
	const fileId = `${timestamp}-${filename}`;
	const storagePath = `${userId}/${chatId}/${fileId}`;

	// 4. Upload to Supabase Storage (private bucket)
	const supabase = createAdminClient();

	try {
		const { data: uploadData, error: uploadError } = await supabase.storage
			.from(process.env.NEXT_PUBLIC_STORAGE_BUCKET || "chat-attachments")
			.upload(storagePath, file, {
				contentType: file.type,
				upsert: false,
			});

		if (uploadError) {
			console.error("[FileUpload] Upload error:", uploadError);

			await logError({
				error_type: ErrorType.SYSTEM,
				error_category: ErrorCategory.FILE_UPLOAD_FAILED,
				error_message: uploadError.message,
				user_id: userId,
				error_details: { chatId, storagePath, error: uploadError },
			});

			return NextResponse.json(
				{ error: "Failed to upload file" },
				{ status: 500 },
			);
		}

		// 5. Generate signed URL (24hr expiry)
		const { data: signedUrlData, error: signedUrlError } =
			await supabase.storage
				.from(process.env.NEXT_PUBLIC_STORAGE_BUCKET || "chat-attachments")
				.createSignedUrl(storagePath, 86400); // 24 hours

		if (signedUrlError || !signedUrlData) {
			console.error("[FileUpload] Signed URL error:", signedUrlError);

			await logError({
				error_type: ErrorType.SYSTEM,
				error_category: ErrorCategory.SIGNED_URL_GENERATION_FAILED,
				error_message: signedUrlError?.message || "Failed to generate signed URL",
				user_id: userId,
				error_details: { chatId, storagePath, error: signedUrlError },
			});

			return NextResponse.json(
				{ error: "Failed to generate access URL" },
				{ status: 500 },
			);
		}

		const signedUrl = signedUrlData.signedUrl;

		// 6. Extract file content
		let content: string;
		try {
			content = await extractFileContent({
				url: signedUrl,
				name: filename,
				mediaType: file.type,
			});
		} catch (error) {
			console.error("[FileUpload] Content extraction error:", error);

			await logError({
				error_type: ErrorType.SYSTEM,
				error_category: ErrorCategory.FILE_PROCESSING_FAILED,
				error_message: error instanceof Error ? error.message : "Unknown error",
				user_id: userId,
				error_details: { chatId, storagePath, filename },
			});

			// Don't fail upload if extraction fails
			content = `[Failed to extract content from ${filename}]`;
		}

		// 7. Cache file content in session
		const cache = getFileCache();
		const uploadedAt = new Date().toISOString();
		const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

		cache.set(userId, chatId, fileId, {
			content,
			contentType: file.type,
			size: file.size,
			fileName: filename,
			storagePath,
			signedUrl,
			uploadedAt,
			chatId,
			userId,
			cachedAt: Date.now(),
			expiresAt,
		});

		// 8. Log activity
		await logUserActivity({
			user_id: userId,
			activity_type: UserActivityType.FILE_UPLOAD,
			activity_category: ActivityCategory.CHAT,
			activity_metadata: {
				filename,
				fileType: file.type,
				fileSize: file.size,
				chatId,
				storagePath,
			},
			resource_type: "file_attachment",
			resource_id: storagePath,
			success: true,
		});

		// 9. Return metadata
		return NextResponse.json({
			url: signedUrl,
			name: filename,
			contentType: file.type,
			size: file.size,
			uploadedAt,
			expiresAt: new Date(expiresAt).toISOString(),
			storagePath,
			fileId,
		});
	} catch (error) {
		console.error("[FileUpload] Unexpected error:", error);

		await logError({
			error_type: ErrorType.SYSTEM,
			error_category: ErrorCategory.FILE_UPLOAD_FAILED,
			error_message: error instanceof Error ? error.message : "Unknown error",
			user_id: userId,
			error_details: { chatId, filename },
		});

		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
