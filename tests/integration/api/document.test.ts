/**
 * Integration tests for Document API endpoints
 * Tests the complete request/response flow for document operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET, POST, DELETE } from '@/app/(chat)/api/document/route';
import type { User } from '@supabase/supabase-js';
import type { ArtifactKind } from '@/components/artifact';

// Mock server-only module
vi.mock('server-only', () => ({}));

// Mock the auth module
vi.mock('@/lib/auth/server', () => ({
  requireAuth: vi.fn(),
  createAuthErrorResponse: vi.fn((error: Error) => {
    return new Response(
      JSON.stringify({
        error: {
          code: 'unauthorized',
          message: error.message,
        },
      }),
      { status: 401 }
    );
  }),
}));

// Mock the logging module
vi.mock('@/lib/errors/logger', () => ({
  logApiError: vi.fn(),
  logPermissionError: vi.fn(),
  ErrorCategory: {
    INVALID_REQUEST: 'invalid_request',
    UNAUTHORIZED_ACCESS: 'unauthorized_access',
    PERMISSION_DENIED: 'permission_denied',
    API_REQUEST_FAILED: 'api_request_failed',
    DATABASE_ERROR: 'database_error',
  },
  ErrorSeverity: {
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error',
  },
}));

// Mock the activity logging module
vi.mock('@/lib/logging', () => ({
  logUserActivity: vi.fn(),
  createCorrelationId: vi.fn(() => 'test-correlation-id'),
  UserActivityType: {
    DOCUMENT_VIEW: 'document_view',
    DOCUMENT_CREATE: 'document_create',
    DOCUMENT_UPDATE: 'document_update',
    DOCUMENT_DELETE: 'document_delete',
  },
  ActivityCategory: {
    DOCUMENT: 'document',
  },
}));

// Mock the database queries
vi.mock('@/lib/db/queries', () => ({
  getDocumentsById: vi.fn(),
  saveDocument: vi.fn(),
  deleteDocumentsByIdAfterTimestamp: vi.fn(),
}));

// Import after mocking
import { requireAuth } from '@/lib/auth/server';
import {
  getDocumentsById,
  saveDocument,
  deleteDocumentsByIdAfterTimestamp,
} from '@/lib/db/queries';

describe('Document API Integration Tests', () => {
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockOtherUserId = '123e4567-e89b-12d3-a456-426614174999';
  const mockDocumentId = 'doc-123';

  const mockUser: User = {
    id: mockUserId,
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  };

  const mockDocument = {
    id: mockDocumentId,
    title: 'Test Document',
    kind: 'text' as ArtifactKind,
    content: 'Test content',
    user_id: mockUserId,
    chat_id: 'chat-123',
    version_number: 1,
    metadata: {},
    createdAt: new Date(),
    parent_version_id: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: auth succeeds with mockUser
    (requireAuth as any).mockResolvedValue({ user: mockUser });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/document - Retrieve Document', () => {
    it('should retrieve document with valid id and auth', async () => {
      const documents = [mockDocument];
      (getDocumentsById as any).mockResolvedValue(documents);

      const request = new Request(
        `http://localhost:3000/api/document?id=${mockDocumentId}`
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      // Date is serialized as string in JSON response
      expect(data).toHaveLength(1);
      expect(data[0].id).toBe(mockDocumentId);
      expect(data[0].title).toBe('Test Document');
      expect(getDocumentsById).toHaveBeenCalledWith({ id: mockDocumentId });
    });

    it('should return 400 when id parameter is missing', async () => {
      const request = new Request('http://localhost:3000/api/document');
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      // ChatSDKError format
      expect(data).toBeDefined();
      expect(data.error || data.message).toBeDefined();
    });

    it('should return 401 when authentication fails', async () => {
      (requireAuth as any).mockRejectedValue(new Error('Not authenticated'));

      const request = new Request(
        `http://localhost:3000/api/document?id=${mockDocumentId}`
      );
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should return 404 when document does not exist', async () => {
      (getDocumentsById as any).mockResolvedValue([]);

      const request = new Request(
        `http://localhost:3000/api/document?id=non-existent`
      );
      const response = await GET(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      // ChatSDKError returns error with code
      expect(data).toBeDefined();
      expect(data.error?.code || data.code).toBeDefined();
    });

    it('should return 403 when user tries to access document owned by another user', async () => {
      const otherUserDocument = {
        ...mockDocument,
        user_id: mockOtherUserId,
      };
      (getDocumentsById as any).mockResolvedValue([otherUserDocument]);

      const request = new Request(
        `http://localhost:3000/api/document?id=${mockDocumentId}`
      );
      const response = await GET(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      // ChatSDKError returns error with code
      expect(data).toBeDefined();
      expect(data.error?.code || data.code).toBeDefined();
    });

    it('should return all versions of a document', async () => {
      const documents = [
        { ...mockDocument, version_number: 1 },
        { ...mockDocument, version_number: 2 },
        { ...mockDocument, version_number: 3 },
      ];
      (getDocumentsById as any).mockResolvedValue(documents);

      const request = new Request(
        `http://localhost:3000/api/document?id=${mockDocumentId}`
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveLength(3);
      expect(data[0].version_number).toBe(1);
      expect(data[1].version_number).toBe(2);
      expect(data[2].version_number).toBe(3);
    });

    it('should handle database errors gracefully', async () => {
      (getDocumentsById as any).mockRejectedValue(new Error('Database error'));

      const request = new Request(
        `http://localhost:3000/api/document?id=${mockDocumentId}`
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      // ChatSDKError returns error with code
      expect(data).toBeDefined();
      expect(data.error?.code || data.code).toBeDefined();
    });
  });

  describe('POST /api/document - Create/Update Document', () => {
    const createPayload = {
      content: 'New document content',
      title: 'New Document',
      kind: 'text' as ArtifactKind,
    };

    it('should create a new document when id does not exist', async () => {
      (getDocumentsById as any).mockResolvedValue([]);
      (saveDocument as any).mockResolvedValue([mockDocument]);

      const request = new Request(
        `http://localhost:3000/api/document?id=${mockDocumentId}`,
        {
          method: 'POST',
          body: JSON.stringify(createPayload),
        }
      );
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveLength(1);
      expect(data[0].id).toBe(mockDocumentId);
      expect(saveDocument).toHaveBeenCalledWith({
        id: mockDocumentId,
        content: createPayload.content,
        title: createPayload.title,
        kind: createPayload.kind,
        userId: mockUserId,
      });
    });

    it('should update existing document when id exists', async () => {
      const existingDocument = { ...mockDocument };
      const updatedDocument = {
        ...mockDocument,
        version_number: 2,
        content: 'Updated content',
      };

      (getDocumentsById as any).mockResolvedValue([existingDocument]);
      (saveDocument as any).mockResolvedValue([updatedDocument]);

      const updatePayload = {
        content: 'Updated content',
        title: 'Updated Document',
        kind: 'text' as ArtifactKind,
      };

      const request = new Request(
        `http://localhost:3000/api/document?id=${mockDocumentId}`,
        {
          method: 'POST',
          body: JSON.stringify(updatePayload),
        }
      );
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveLength(1);
      expect(data[0].version_number).toBe(2);
      expect(saveDocument).toHaveBeenCalledWith({
        id: mockDocumentId,
        content: updatePayload.content,
        title: updatePayload.title,
        kind: updatePayload.kind,
        userId: mockUserId,
      });
    });

    it('should return 400 when id parameter is missing', async () => {
      const request = new Request('http://localhost:3000/api/document', {
        method: 'POST',
        body: JSON.stringify(createPayload),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      // ChatSDKError format
      expect(data).toBeDefined();
      expect(data.error || data.message).toBeDefined();
    });

    it('should return 401 when authentication fails', async () => {
      (requireAuth as any).mockRejectedValue(new Error('Not authenticated'));

      const request = new Request(
        `http://localhost:3000/api/document?id=${mockDocumentId}`,
        {
          method: 'POST',
          body: JSON.stringify(createPayload),
        }
      );
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('should return 403 when user tries to update document owned by another user', async () => {
      const otherUserDocument = {
        ...mockDocument,
        user_id: mockOtherUserId,
      };
      (getDocumentsById as any).mockResolvedValue([otherUserDocument]);

      const request = new Request(
        `http://localhost:3000/api/document?id=${mockDocumentId}`,
        {
          method: 'POST',
          body: JSON.stringify(createPayload),
        }
      );
      const response = await POST(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      // ChatSDKError format
      expect(data).toBeDefined();
      expect(data.error?.code || data.code).toBeDefined();
    });

    it('should handle different document kinds (text, code, mermaid)', async () => {
      const kinds: ArtifactKind[] = ['text', 'code', 'python', 'mermaid'];

      for (const kind of kinds) {
        (getDocumentsById as any).mockResolvedValue([]);
        (saveDocument as any).mockResolvedValue([
          { ...mockDocument, kind },
        ]);

        const payload = {
          content: `${kind} content`,
          title: `${kind} document`,
          kind,
        };

        const request = new Request(
          `http://localhost:3000/api/document?id=${mockDocumentId}-${kind}`,
          {
            method: 'POST',
            body: JSON.stringify(payload),
          }
        );
        const response = await POST(request);

        expect(response.status).toBe(200);
        expect(saveDocument).toHaveBeenCalledWith(
          expect.objectContaining({
            kind,
          })
        );

        vi.clearAllMocks();
        (requireAuth as any).mockResolvedValue({ user: mockUser });
      }
    });
  });

  describe('DELETE /api/document - Delete Document', () => {
    const timestamp = '2024-01-01T00:00:00.000Z';

    it('should delete document versions after timestamp', async () => {
      const deletedDocuments = [
        { ...mockDocument, version_number: 2 },
        { ...mockDocument, version_number: 3 },
      ];

      (getDocumentsById as any).mockResolvedValue([mockDocument]);
      (deleteDocumentsByIdAfterTimestamp as any).mockResolvedValue(
        deletedDocuments
      );

      const request = new Request(
        `http://localhost:3000/api/document?id=${mockDocumentId}&timestamp=${timestamp}`
      );
      const response = await DELETE(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveLength(2);
      expect(data[0].version_number).toBe(2);
      expect(data[1].version_number).toBe(3);
      expect(deleteDocumentsByIdAfterTimestamp).toHaveBeenCalledWith({
        id: mockDocumentId,
        timestamp: new Date(timestamp),
      });
    });

    it('should return 400 when id parameter is missing', async () => {
      const request = new Request(
        `http://localhost:3000/api/document?timestamp=${timestamp}`
      );
      const response = await DELETE(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      // ChatSDKError format
      expect(data).toBeDefined();
      expect(data.error || data.message).toBeDefined();
    });

    it('should return 400 when timestamp parameter is missing', async () => {
      const request = new Request(
        `http://localhost:3000/api/document?id=${mockDocumentId}`
      );
      const response = await DELETE(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      // ChatSDKError format
      expect(data).toBeDefined();
      expect(data.error || data.message).toBeDefined();
    });

    it('should return 401 when authentication fails', async () => {
      (requireAuth as any).mockRejectedValue(new Error('Not authenticated'));

      const request = new Request(
        `http://localhost:3000/api/document?id=${mockDocumentId}&timestamp=${timestamp}`
      );
      const response = await DELETE(request);

      expect(response.status).toBe(401);
    });

    it('should return 403 when user tries to delete document owned by another user', async () => {
      const otherUserDocument = {
        ...mockDocument,
        user_id: mockOtherUserId,
      };
      (getDocumentsById as any).mockResolvedValue([otherUserDocument]);

      const request = new Request(
        `http://localhost:3000/api/document?id=${mockDocumentId}&timestamp=${timestamp}`
      );
      const response = await DELETE(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      // ChatSDKError format
      expect(data).toBeDefined();
      expect(data.error?.code || data.code).toBeDefined();
    });

    it('should handle deletion of all versions after specific timestamp', async () => {
      const documents = [
        { ...mockDocument, version_number: 1, createdAt: new Date('2023-12-31') },
        { ...mockDocument, version_number: 2, createdAt: new Date('2024-01-01') },
        { ...mockDocument, version_number: 3, createdAt: new Date('2024-01-02') },
      ];

      const deletedVersions = documents.filter(
        (doc) => doc.createdAt >= new Date(timestamp)
      );

      (getDocumentsById as any).mockResolvedValue(documents);
      (deleteDocumentsByIdAfterTimestamp as any).mockResolvedValue(
        deletedVersions
      );

      const request = new Request(
        `http://localhost:3000/api/document?id=${mockDocumentId}&timestamp=${timestamp}`
      );
      const response = await DELETE(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveLength(2); // versions 2 and 3
    });

    it('should return empty array when no versions match timestamp criteria', async () => {
      (getDocumentsById as any).mockResolvedValue([mockDocument]);
      (deleteDocumentsByIdAfterTimestamp as any).mockResolvedValue([]);

      const futureTimestamp = '2099-12-31T00:00:00.000Z';
      const request = new Request(
        `http://localhost:3000/api/document?id=${mockDocumentId}&timestamp=${futureTimestamp}`
      );
      const response = await DELETE(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveLength(0);
    });
  });

  describe('Document API - Edge Cases', () => {
    it('should handle malformed JSON in POST request', async () => {
      const request = new Request(
        `http://localhost:3000/api/document?id=${mockDocumentId}`,
        {
          method: 'POST',
          body: 'invalid json',
        }
      );

      await expect(POST(request)).rejects.toThrow();
    });

    it('should handle very long document content', async () => {
      const longContent = 'a'.repeat(1000000); // 1MB of text
      const payload = {
        content: longContent,
        title: 'Long Document',
        kind: 'text' as ArtifactKind,
      };

      (getDocumentsById as any).mockResolvedValue([]);
      (saveDocument as any).mockResolvedValue([
        { ...mockDocument, content: longContent },
      ]);

      const request = new Request(
        `http://localhost:3000/api/document?id=${mockDocumentId}`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(saveDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          content: longContent,
        })
      );
    });

    it('should handle special characters in document ID', async () => {
      const specialId = 'doc-with-special-chars-!@#$%^&*()';
      const documents = [{ ...mockDocument, id: specialId }];
      (getDocumentsById as any).mockResolvedValue(documents);

      const request = new Request(
        `http://localhost:3000/api/document?id=${encodeURIComponent(specialId)}`
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(getDocumentsById).toHaveBeenCalledWith({ id: specialId });
    });

    it('should handle invalid timestamp format in DELETE', async () => {
      (getDocumentsById as any).mockResolvedValue([mockDocument]);
      (deleteDocumentsByIdAfterTimestamp as any).mockResolvedValue([]);

      const invalidTimestamp = 'not-a-date';
      const request = new Request(
        `http://localhost:3000/api/document?id=${mockDocumentId}&timestamp=${invalidTimestamp}`
      );
      const response = await DELETE(request);

      // Should still attempt to process with invalid date
      expect(response.status).toBe(200);
    });
  });
});
