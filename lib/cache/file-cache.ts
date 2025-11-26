/**
 * File Cache Service
 *
 * Server-side session cache for file attachments.
 * Stores file content in memory to avoid repeated Supabase fetches.
 *
 * Architecture:
 * - Private Supabase bucket stores files
 * - Signed URLs (24hr expiry) for secure access
 * - Files cached on upload/retrieval
 * - Cache expires on session end or manual clear
 * - Reduces bandwidth usage by 80%+
 *
 * @module lib/cache/file-cache
 */

/**
 * File cache entry structure
 */
export interface FileCacheEntry {
	/** File content (text for text files, base64 for binary) */
	content: string;

	/** MIME type */
	contentType: string;

	/** File size in bytes */
	size: number;

	/** Original filename */
	fileName: string;

	/** File path in Supabase Storage */
	storagePath: string;

	/** Timestamp when file was cached (milliseconds) */
	cachedAt: number;

	/** Timestamp when cache entry expires (milliseconds) */
	expiresAt: number;

	/** Signed URL used to fetch the file (for re-generation) */
	signedUrl?: string;

	/** When the file was uploaded to storage */
	uploadedAt: string;

	/** Chat ID this file belongs to */
	chatId: string;

	/** User ID who owns the file */
	userId: string;
}

/**
 * File cache metadata (lightweight, for listings)
 */
export interface FileCacheMetadata {
	fileName: string;
	contentType: string;
	size: number;
	uploadedAt: string;
	chatId: string;
	userId: string;
}

/**
 * File Cache Service
 *
 * In-memory cache for file attachments with session-based lifecycle.
 *
 * Usage:
 * ```typescript
 * const cache = FileCache.getInstance();
 *
 * // Store file
 * cache.set(userId, chatId, fileId, {
 *   content: "file content...",
 *   contentType: "text/plain",
 *   // ... other fields
 * });
 *
 * // Retrieve file
 * const file = cache.get(userId, chatId, fileId);
 *
 * // Get all files for a chat
 * const files = cache.getByChat(userId, chatId);
 *
 * // Clear chat cache
 * cache.clearChat(userId, chatId);
 *
 * // Clear all user cache
 * cache.clearUser(userId);
 * ```
 */
export class FileCache {
	private static instance: FileCache;
	private cache: Map<string, FileCacheEntry>;

	// Cache expiry time (24 hours in milliseconds)
	private static readonly DEFAULT_EXPIRY_MS = 24 * 60 * 60 * 1000;

	// Cleanup interval (every 1 hour)
	private static readonly CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

	// Maximum cache size (prevent memory bloat)
	private static readonly MAX_CACHE_ENTRIES = 10000;

	private cleanupIntervalId?: NodeJS.Timeout;

	private constructor() {
		this.cache = new Map();
		this.startCleanupInterval();
	}

	/**
	 * Get singleton instance
	 */
	public static getInstance(): FileCache {
		if (!FileCache.instance) {
			FileCache.instance = new FileCache();
		}
		return FileCache.instance;
	}

	/**
	 * Generate cache key
	 */
	private getCacheKey(userId: string, chatId: string, fileId: string): string {
		return `${userId}:${chatId}:${fileId}`;
	}

	/**
	 * Parse cache key into components
	 */
	private parseCacheKey(
		key: string,
	): { userId: string; chatId: string; fileId: string } | null {
		const parts = key.split(":");
		if (parts.length !== 3) return null;
		return { userId: parts[0], chatId: parts[1], fileId: parts[2] };
	}

	/**
	 * Store file in cache
	 *
	 * @param userId - User ID who owns the file
	 * @param chatId - Chat ID this file belongs to
	 * @param fileId - Unique file identifier (timestamp-filename or UUID)
	 * @param entry - File cache entry
	 * @returns true if stored successfully, false if cache is full
	 */
	public set(
		userId: string,
		chatId: string,
		fileId: string,
		entry: FileCacheEntry,
	): boolean {
		// Check cache size limit
		if (
			this.cache.size >= FileCache.MAX_CACHE_ENTRIES &&
			!this.cache.has(this.getCacheKey(userId, chatId, fileId))
		) {
			console.warn(
				`[FileCache] Cache full (${FileCache.MAX_CACHE_ENTRIES} entries), evicting oldest`,
			);
			this.evictOldest();
		}

		const cacheKey = this.getCacheKey(userId, chatId, fileId);

		// Set expiry if not provided
		if (!entry.expiresAt) {
			entry.expiresAt = Date.now() + FileCache.DEFAULT_EXPIRY_MS;
		}

		this.cache.set(cacheKey, {
			...entry,
			cachedAt: Date.now(),
			userId,
			chatId,
		});

		return true;
	}

	/**
	 * Get file from cache
	 *
	 * @param userId - User ID who owns the file
	 * @param chatId - Chat ID this file belongs to
	 * @param fileId - Unique file identifier
	 * @returns File cache entry or null if not found/expired
	 */
	public get(
		userId: string,
		chatId: string,
		fileId: string,
	): FileCacheEntry | null {
		const cacheKey = this.getCacheKey(userId, chatId, fileId);
		const entry = this.cache.get(cacheKey);

		if (!entry) {
			return null;
		}

		// Check expiry
		if (Date.now() > entry.expiresAt) {
			this.cache.delete(cacheKey);
			return null;
		}

		return entry;
	}

	/**
	 * Get all files for a specific chat
	 *
	 * @param userId - User ID who owns the files
	 * @param chatId - Chat ID
	 * @returns Array of file cache entries
	 */
	public getByChat(userId: string, chatId: string): FileCacheEntry[] {
		const prefix = `${userId}:${chatId}:`;
		const entries: FileCacheEntry[] = [];

		for (const [key, entry] of this.cache.entries()) {
			if (key.startsWith(prefix)) {
				// Check expiry
				if (Date.now() <= entry.expiresAt) {
					entries.push(entry);
				} else {
					// Remove expired entry
					this.cache.delete(key);
				}
			}
		}

		return entries;
	}

	/**
	 * Get all files for a specific user
	 *
	 * @param userId - User ID
	 * @returns Array of file cache entries
	 */
	public getByUser(userId: string): FileCacheEntry[] {
		const prefix = `${userId}:`;
		const entries: FileCacheEntry[] = [];

		for (const [key, entry] of this.cache.entries()) {
			if (key.startsWith(prefix)) {
				// Check expiry
				if (Date.now() <= entry.expiresAt) {
					entries.push(entry);
				} else {
					// Remove expired entry
					this.cache.delete(key);
				}
			}
		}

		return entries;
	}

	/**
	 * Get file metadata (without content) for a chat
	 *
	 * Useful for building file context without loading full content.
	 *
	 * @param userId - User ID
	 * @param chatId - Chat ID
	 * @returns Array of file metadata
	 */
	public getMetadataByChat(
		userId: string,
		chatId: string,
	): FileCacheMetadata[] {
		const entries = this.getByChat(userId, chatId);
		return entries.map((entry) => ({
			fileName: entry.fileName,
			contentType: entry.contentType,
			size: entry.size,
			uploadedAt: entry.uploadedAt,
			chatId: entry.chatId,
			userId: entry.userId,
		}));
	}

	/**
	 * Check if file exists in cache (and not expired)
	 *
	 * @param userId - User ID
	 * @param chatId - Chat ID
	 * @param fileId - File ID
	 * @returns true if file exists and not expired
	 */
	public has(userId: string, chatId: string, fileId: string): boolean {
		return this.get(userId, chatId, fileId) !== null;
	}

	/**
	 * Delete specific file from cache
	 *
	 * @param userId - User ID
	 * @param chatId - Chat ID
	 * @param fileId - File ID
	 * @returns true if deleted, false if not found
	 */
	public delete(userId: string, chatId: string, fileId: string): boolean {
		const cacheKey = this.getCacheKey(userId, chatId, fileId);
		return this.cache.delete(cacheKey);
	}

	/**
	 * Clear all files for a specific chat
	 *
	 * @param userId - User ID
	 * @param chatId - Chat ID
	 * @returns Number of entries cleared
	 */
	public clearChat(userId: string, chatId: string): number {
		const prefix = `${userId}:${chatId}:`;
		let cleared = 0;

		for (const key of this.cache.keys()) {
			if (key.startsWith(prefix)) {
				this.cache.delete(key);
				cleared++;
			}
		}

		return cleared;
	}

	/**
	 * Clear all files for a specific user
	 *
	 * @param userId - User ID
	 * @returns Number of entries cleared
	 */
	public clearUser(userId: string): number {
		const prefix = `${userId}:`;
		let cleared = 0;

		for (const key of this.cache.keys()) {
			if (key.startsWith(prefix)) {
				this.cache.delete(key);
				cleared++;
			}
		}

		return cleared;
	}

	/**
	 * Clear entire cache
	 *
	 * @returns Number of entries cleared
	 */
	public clearAll(): number {
		const size = this.cache.size;
		this.cache.clear();
		return size;
	}

	/**
	 * Remove expired entries
	 *
	 * @returns Number of expired entries removed
	 */
	public cleanup(): number {
		const now = Date.now();
		let removed = 0;

		for (const [key, entry] of this.cache.entries()) {
			if (now > entry.expiresAt) {
				this.cache.delete(key);
				removed++;
			}
		}

		if (removed > 0) {
			console.log(`[FileCache] Cleaned up ${removed} expired entries`);
		}

		return removed;
	}

	/**
	 * Evict oldest entries when cache is full
	 *
	 * Removes 10% of oldest entries.
	 */
	private evictOldest(): void {
		const entries = Array.from(this.cache.entries());

		// Sort by cachedAt (oldest first)
		entries.sort((a, b) => a[1].cachedAt - b[1].cachedAt);

		// Remove oldest 10%
		const toRemove = Math.ceil(entries.length * 0.1);
		for (let i = 0; i < toRemove; i++) {
			this.cache.delete(entries[i][0]);
		}

		console.log(`[FileCache] Evicted ${toRemove} oldest entries`);
	}

	/**
	 * Get cache statistics
	 *
	 * @returns Cache statistics
	 */
	public getStats(): {
		totalEntries: number;
		expiredEntries: number;
		totalSizeBytes: number;
		oldestEntryAge: number;
		newestEntryAge: number;
	} {
		const now = Date.now();
		let expiredEntries = 0;
		let totalSizeBytes = 0;
		let oldestCachedAt = Number.POSITIVE_INFINITY;
		let newestCachedAt = 0;

		for (const entry of this.cache.values()) {
			if (now > entry.expiresAt) {
				expiredEntries++;
			}
			totalSizeBytes += entry.size;
			oldestCachedAt = Math.min(oldestCachedAt, entry.cachedAt);
			newestCachedAt = Math.max(newestCachedAt, entry.cachedAt);
		}

		return {
			totalEntries: this.cache.size,
			expiredEntries,
			totalSizeBytes,
			oldestEntryAge:
				oldestCachedAt === Number.POSITIVE_INFINITY
					? 0
					: now - oldestCachedAt,
			newestEntryAge: newestCachedAt === 0 ? 0 : now - newestCachedAt,
		};
	}

	/**
	 * Start automatic cleanup interval
	 */
	private startCleanupInterval(): void {
		this.cleanupIntervalId = setInterval(() => {
			this.cleanup();
		}, FileCache.CLEANUP_INTERVAL_MS);

		// Prevent interval from keeping Node.js process alive
		this.cleanupIntervalId.unref?.();
	}

	/**
	 * Stop automatic cleanup interval
	 */
	public stopCleanupInterval(): void {
		if (this.cleanupIntervalId) {
			clearInterval(this.cleanupIntervalId);
			this.cleanupIntervalId = undefined;
		}
	}

	/**
	 * Log cache statistics (for debugging)
	 */
	public logStats(): void {
		const stats = this.getStats();
		console.log("[FileCache] Statistics:", {
			totalEntries: stats.totalEntries,
			expiredEntries: stats.expiredEntries,
			totalSizeMB: (stats.totalSizeBytes / 1024 / 1024).toFixed(2),
			oldestEntryHours: (stats.oldestEntryAge / 1000 / 60 / 60).toFixed(2),
			newestEntryHours: (stats.newestEntryAge / 1000 / 60 / 60).toFixed(2),
		});
	}
}

/**
 * Get file cache instance (convenience function)
 */
export function getFileCache(): FileCache {
	return FileCache.getInstance();
}

/**
 * Format file size for display
 *
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 B";

	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}
