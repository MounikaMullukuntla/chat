-- =====================================================
-- Supabase Storage Setup for File Attachments
-- File: 0013_storage_setup.sql
-- Description: Creates storage bucket for chat file attachments
-- Note: RLS policies MUST be created via Supabase Dashboard UI (not SQL)
-- =====================================================

-- =====================================================
-- IMPORTANT: Storage Bucket & Policies Setup
-- =====================================================
-- This migration creates the storage bucket programmatically.
-- However, RLS policies on storage.objects CANNOT be created via SQL migrations
-- due to permission restrictions. You MUST create policies via Supabase Dashboard.
--
-- After running this migration:
-- 1. Go to Supabase Dashboard → Storage → chat-attachments
-- 2. Click "Policies" or the three dots (⋮) → "Manage policies"
-- 3. Create these 3 policies:
--
--    Policy 1: Users can upload their own files
--    - Operation: INSERT
--    - Policy: (bucket_id = 'chat-attachments'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)
--
--    Policy 2: Users can read their own files
--    - Operation: SELECT
--    - Policy: (bucket_id = 'chat-attachments'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)
--
--    Policy 3: Users can delete their own files
--    - Operation: DELETE
--    - Policy: (bucket_id = 'chat-attachments'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)
--
-- See: docs/supabase-storage-setup.md for detailed instructions
-- =====================================================

-- =====================================================
-- 1. Create PRIVATE Storage Bucket
-- =====================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  false,  -- PRIVATE bucket - use signed URLs for access
  10485760,  -- 10 MB limit
  NULL  -- Allow all MIME types (validated in app code)
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. Verify Bucket Creation
-- =====================================================
SELECT
  id,
  name,
  public,
  file_size_limit,
  created_at
FROM storage.buckets
WHERE id = 'chat-attachments';

-- =====================================================
-- NOTES
-- =====================================================
-- File Path Structure:
--   {bucket}/{userId}/{chatId}/{timestamp}-{filename}
--   Example: chat-attachments/550e8400-e29b-41d4-a716-446655440000/7c9e6679-7425-40de-944b-e07fc1f90ae7/1700000000000-document.pdf
--
-- Security:
--   - PRIVATE bucket - files not publicly accessible
--   - RLS ensures users can only access their own files
--   - Access via signed URLs (24hr expiry)
--   - File paths are prefixed with userId for isolation
--   - Server-side caching reduces bandwidth usage
--
-- Signed URL Generation:
--   SELECT storage.create_signed_url('chat-attachments', 'path/to/file', 86400);
--   Returns: https://[project-ref].supabase.co/storage/v1/object/sign/chat-attachments/{path}?token=xxx
--
-- Caching Strategy:
--   - Files cached in server session on upload
--   - Cache used for LLM context (no repeated fetches)
--   - Cache expires on session end or 24hr timeout
--   - Re-fetch files when user returns to chat
--
-- Cleanup:
--   - Files in deleted chats should be cleaned up periodically
--   - Consider implementing a scheduled function to delete old files
-- =====================================================
