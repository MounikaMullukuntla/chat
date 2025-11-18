/**
 * Integration Tests: Document Lifecycle
 *
 * Tests complete document workflows including:
 * - Document creation
 * - Version updates and history
 * - Version comparison and revert
 * - Suggestion management
 * - Concurrent edit handling
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  deleteDocumentsByIdAfterTimestamp,
  getDocumentById,
  getDocumentByIdAndVersion,
  getDocumentsByChat,
  getDocumentVersions,
  getLatestDocumentVersionsByChat,
  getSuggestionsByDocumentId,
  saveDocument,
  saveSuggestions,
} from "@/lib/db/queries/document";
import {
  cleanupTable,
  createTestChat,
  createTestUser,
  deleteTestUser,
} from "@/tests/helpers/db-helpers";

describe("Document Lifecycle Integration Tests", () => {
  let testUserId: string;
  let testChatId: string;
  const testDocumentId = `test-doc-${Date.now()}`;

  beforeEach(async () => {
    // Create test user
    const testUser = await createTestUser(
      `test-${Date.now()}@example.com`,
      "test-password-123"
    );
    testUserId = testUser.id;

    // Create test chat
    const testChat = await createTestChat(
      testUserId,
      "Document Lifecycle Test Chat"
    );
    testChatId = testChat.id;
  });

  afterEach(async () => {
    // Cleanup test data
    await cleanupTable("Document");
    await cleanupTable("Suggestion");
    await cleanupTable("Chat");
    await deleteTestUser(testUserId);
  });

  describe("Document Creation Flow", () => {
    it("should create a new document with version 1", async () => {
      // Arrange
      const documentData = {
        id: testDocumentId,
        title: "My First Document",
        kind: "text" as const,
        content: "# Welcome\n\nThis is the initial content.",
        userId: testUserId,
        chatId: testChatId,
        metadata: { created_by: "test" },
      };

      // Act
      const result = await saveDocument(documentData);

      // Assert
      expect(result).toBeDefined();
      expect(result[0]).toBeDefined();
      expect(result[0].id).toBe(testDocumentId);
      expect(result[0].title).toBe("My First Document");
      expect(result[0].version_number).toBe(1);
      expect(result[0].content).toBe(
        "# Welcome\n\nThis is the initial content."
      );
      expect(result[0].kind).toBe("text");
      expect(result[0].user_id).toBe(testUserId);
      expect(result[0].chat_id).toBe(testChatId);
      expect(result[0].parent_version_id).toBeNull();
    });

    it("should create a Python code document", async () => {
      // Arrange
      const pythonDoc = {
        id: `${testDocumentId}-python`,
        title: "Hello World Script",
        kind: "python" as const,
        content: 'print("Hello, World!")',
        userId: testUserId,
        chatId: testChatId,
      };

      // Act
      const result = await saveDocument(pythonDoc);

      // Assert
      expect(result[0].kind).toBe("python");
      expect(result[0].content).toBe('print("Hello, World!")');
      expect(result[0].version_number).toBe(1);
    });

    it("should create a Mermaid diagram document", async () => {
      // Arrange
      const mermaidDoc = {
        id: `${testDocumentId}-mermaid`,
        title: "System Architecture",
        kind: "mermaid" as const,
        content: "graph TD\n  A[Client] --> B[Server]\n  B --> C[Database]",
        userId: testUserId,
        chatId: testChatId,
      };

      // Act
      const result = await saveDocument(mermaidDoc);

      // Assert
      expect(result[0].kind).toBe("mermaid");
      expect(result[0].version_number).toBe(1);
    });
  });

  describe("Document Update Flow with Versioning", () => {
    beforeEach(async () => {
      // Create initial document
      await saveDocument({
        id: testDocumentId,
        title: "Versioned Document",
        kind: "text" as const,
        content: "Version 1 content",
        userId: testUserId,
        chatId: testChatId,
      });
    });

    it("should create version 2 when updating document", async () => {
      // Arrange
      const version1 = await getDocumentById({ id: testDocumentId });

      // Act - Create version 2
      const result = await saveDocument({
        id: testDocumentId,
        title: "Versioned Document",
        kind: "text" as const,
        content: "Version 2 content - Updated!",
        userId: testUserId,
        chatId: testChatId,
        parentVersionId: version1.id,
      });

      // Assert
      expect(result[0].version_number).toBe(2);
      expect(result[0].content).toBe("Version 2 content - Updated!");
      expect(result[0].parent_version_id).toBe(version1.id);
    });

    it("should create multiple versions sequentially", async () => {
      // Act - Create versions 2, 3, 4
      await saveDocument({
        id: testDocumentId,
        title: "Versioned Document",
        kind: "text" as const,
        content: "Version 2",
        userId: testUserId,
        chatId: testChatId,
      });

      await saveDocument({
        id: testDocumentId,
        title: "Versioned Document",
        kind: "text" as const,
        content: "Version 3",
        userId: testUserId,
        chatId: testChatId,
      });

      const result = await saveDocument({
        id: testDocumentId,
        title: "Versioned Document",
        kind: "text" as const,
        content: "Version 4",
        userId: testUserId,
        chatId: testChatId,
      });

      // Assert
      expect(result[0].version_number).toBe(4);

      // Verify all versions exist
      const versions = await getDocumentVersions({ id: testDocumentId });
      expect(versions).toHaveLength(4);
      expect(versions.map((v) => v.version_number).sort()).toEqual([
        1, 2, 3, 4,
      ]);
    });

    it("should preserve all previous versions", async () => {
      // Act - Create version 2
      await saveDocument({
        id: testDocumentId,
        title: "Versioned Document",
        kind: "text" as const,
        content: "Version 2 content",
        userId: testUserId,
        chatId: testChatId,
      });

      // Get all versions
      const versions = await getDocumentVersions({ id: testDocumentId });

      // Assert
      expect(versions).toHaveLength(2);
      expect(versions[0].version_number).toBe(2); // Newest first (DESC order)
      expect(versions[0].content).toBe("Version 2 content");
      expect(versions[1].version_number).toBe(1);
      expect(versions[1].content).toBe("Version 1 content");
    });
  });

  describe("Version Comparison Flow", () => {
    beforeEach(async () => {
      // Create document with 3 versions
      await saveDocument({
        id: testDocumentId,
        title: "Compare Test",
        kind: "text" as const,
        content: "Original content",
        userId: testUserId,
        chatId: testChatId,
      });

      await saveDocument({
        id: testDocumentId,
        title: "Compare Test",
        kind: "text" as const,
        content: "Modified content - added text",
        userId: testUserId,
        chatId: testChatId,
      });

      await saveDocument({
        id: testDocumentId,
        title: "Compare Test",
        kind: "text" as const,
        content: "Final content - more changes",
        userId: testUserId,
        chatId: testChatId,
      });
    });

    it("should retrieve specific version by version number", async () => {
      // Act
      const version1 = await getDocumentByIdAndVersion({
        id: testDocumentId,
        version: 1,
      });
      const version2 = await getDocumentByIdAndVersion({
        id: testDocumentId,
        version: 2,
      });
      const version3 = await getDocumentByIdAndVersion({
        id: testDocumentId,
        version: 3,
      });

      // Assert
      expect(version1.content).toBe("Original content");
      expect(version2.content).toBe("Modified content - added text");
      expect(version3.content).toBe("Final content - more changes");
    });

    it("should get latest version with getDocumentById", async () => {
      // Act
      const latest = await getDocumentById({ id: testDocumentId });

      // Assert
      expect(latest.version_number).toBe(3);
      expect(latest.content).toBe("Final content - more changes");
    });

    it("should retrieve all versions in descending order", async () => {
      // Act
      const versions = await getDocumentVersions({ id: testDocumentId });

      // Assert
      expect(versions).toHaveLength(3);
      expect(versions[0].version_number).toBe(3);
      expect(versions[1].version_number).toBe(2);
      expect(versions[2].version_number).toBe(1);
    });

    it("should compare content between different versions", async () => {
      // Act
      const version1 = await getDocumentByIdAndVersion({
        id: testDocumentId,
        version: 1,
      });
      const version3 = await getDocumentByIdAndVersion({
        id: testDocumentId,
        version: 3,
      });

      // Assert - Simulate diff comparison
      expect(version1.content).not.toBe(version3.content);
      expect(version1.version_number).toBe(1);
      expect(version3.version_number).toBe(3);

      // Content evolution validation
      expect(version1.content).toBe("Original content");
      expect(version3.content).toBe("Final content - more changes");
    });
  });

  describe("Version Revert Flow", () => {
    beforeEach(async () => {
      // Create document with multiple versions
      await saveDocument({
        id: testDocumentId,
        title: "Revert Test",
        kind: "text" as const,
        content: "Version 1 - original",
        userId: testUserId,
        chatId: testChatId,
      });

      await saveDocument({
        id: testDocumentId,
        title: "Revert Test",
        kind: "text" as const,
        content: "Version 2 - mistake",
        userId: testUserId,
        chatId: testChatId,
      });

      await saveDocument({
        id: testDocumentId,
        title: "Revert Test",
        kind: "text" as const,
        content: "Version 3 - another mistake",
        userId: testUserId,
        chatId: testChatId,
      });
    });

    it("should revert to previous version by creating new version with old content", async () => {
      // Arrange - Get version 1 content
      const version1 = await getDocumentByIdAndVersion({
        id: testDocumentId,
        version: 1,
      });

      // Act - Revert by creating version 4 with version 1 content
      const revertResult = await saveDocument({
        id: testDocumentId,
        title: "Revert Test",
        kind: "text" as const,
        content: version1.content,
        userId: testUserId,
        chatId: testChatId,
        metadata: { reverted_from: 1 },
      });

      // Assert
      expect(revertResult[0].version_number).toBe(4);
      expect(revertResult[0].content).toBe("Version 1 - original");
      expect(revertResult[0].metadata).toEqual({ reverted_from: 1 });

      // Verify all versions still exist (non-destructive revert)
      const versions = await getDocumentVersions({ id: testDocumentId });
      expect(versions).toHaveLength(4);
    });

    it("should maintain version history after revert", async () => {
      // Arrange - Get version 2
      const version2 = await getDocumentByIdAndVersion({
        id: testDocumentId,
        version: 2,
      });

      // Act - Revert to version 2
      await saveDocument({
        id: testDocumentId,
        title: "Revert Test",
        kind: "text" as const,
        content: version2.content,
        userId: testUserId,
        chatId: testChatId,
      });

      // Assert - All versions preserved
      const versions = await getDocumentVersions({ id: testDocumentId });
      expect(versions).toHaveLength(4);
      expect(versions[0].version_number).toBe(4); // New version with reverted content
      expect(versions[0].content).toBe("Version 2 - mistake");
      expect(versions[1].version_number).toBe(3);
      expect(versions[2].version_number).toBe(2);
      expect(versions[3].version_number).toBe(1);
    });

    it("should delete versions after timestamp", async () => {
      // Arrange - Get version 1 timestamp
      const version1 = await getDocumentByIdAndVersion({
        id: testDocumentId,
        version: 1,
      });

      // Act - Delete all versions after version 1
      await deleteDocumentsByIdAfterTimestamp({
        id: testDocumentId,
        timestamp: version1.createdAt,
      });

      // Assert - Only version 1 should remain
      const remainingVersions = await getDocumentVersions({
        id: testDocumentId,
      });
      expect(remainingVersions).toHaveLength(1);
      expect(remainingVersions[0].version_number).toBe(1);
    });
  });

  describe("Suggestion Generation and Acceptance", () => {
    let documentCreatedAt: Date;

    beforeEach(async () => {
      // Create document
      const result = await saveDocument({
        id: testDocumentId,
        title: "Suggestion Test",
        kind: "text" as const,
        content: "The quick brown fox jumps over the lazy dog.",
        userId: testUserId,
        chatId: testChatId,
      });
      documentCreatedAt = result[0].createdAt;
    });

    it("should save suggestions for a document", async () => {
      // Arrange
      const suggestions = [
        {
          documentId: testDocumentId,
          documentCreatedAt,
          originalText: "quick brown fox",
          suggestedText: "swift red fox",
          description: "More vivid description",
          user_id: testUserId,
        },
        {
          documentId: testDocumentId,
          documentCreatedAt,
          originalText: "lazy dog",
          suggestedText: "sleeping hound",
          description: "Better imagery",
          user_id: testUserId,
        },
      ];

      // Act
      await saveSuggestions({ suggestions });
      const savedSuggestions = await getSuggestionsByDocumentId({
        documentId: testDocumentId,
      });

      // Assert
      expect(savedSuggestions).toHaveLength(2);
      expect(savedSuggestions[0].originalText).toBe("quick brown fox");
      expect(savedSuggestions[0].suggestedText).toBe("swift red fox");
      expect(savedSuggestions[0].isResolved).toBe(false);
      expect(savedSuggestions[1].originalText).toBe("lazy dog");
    });

    it("should accept suggestion by creating new version", async () => {
      // Arrange - Create suggestion
      const suggestions = [
        {
          documentId: testDocumentId,
          documentCreatedAt,
          originalText: "quick brown fox",
          suggestedText: "swift red fox",
          description: "Better description",
          user_id: testUserId,
        },
      ];
      await saveSuggestions({ suggestions });

      const currentDoc = await getDocumentById({ id: testDocumentId });

      // Act - Accept suggestion by creating new version with suggested content
      const updatedContent = currentDoc.content.replace(
        "quick brown fox",
        "swift red fox"
      );
      await saveDocument({
        id: testDocumentId,
        title: "Suggestion Test",
        kind: "text" as const,
        content: updatedContent,
        userId: testUserId,
        chatId: testChatId,
        metadata: { suggestion_applied: true },
      });

      // Assert
      const newVersion = await getDocumentById({ id: testDocumentId });
      expect(newVersion.version_number).toBe(2);
      expect(newVersion.content).toBe(
        "The swift red fox jumps over the lazy dog."
      );
      expect(newVersion.metadata).toEqual({ suggestion_applied: true });
    });

    it("should handle multiple suggestions independently", async () => {
      // Arrange
      const suggestions = [
        {
          documentId: testDocumentId,
          documentCreatedAt,
          originalText: "quick",
          suggestedText: "fast",
          description: "Synonym",
          user_id: testUserId,
        },
        {
          documentId: testDocumentId,
          documentCreatedAt,
          originalText: "lazy",
          suggestedText: "sleepy",
          description: "Better word",
          user_id: testUserId,
        },
      ];

      // Act
      await saveSuggestions({ suggestions });
      const allSuggestions = await getSuggestionsByDocumentId({
        documentId: testDocumentId,
      });

      // Assert
      expect(allSuggestions).toHaveLength(2);
      expect(allSuggestions.every((s) => s.isResolved === false)).toBe(true);
    });
  });

  describe("Concurrent Edits Handling", () => {
    beforeEach(async () => {
      // Create initial document
      await saveDocument({
        id: testDocumentId,
        title: "Concurrent Edit Test",
        kind: "text" as const,
        content: "Initial content",
        userId: testUserId,
        chatId: testChatId,
      });
    });

    it("should handle rapid sequential updates", async () => {
      // Act - Create multiple updates in rapid succession
      const updates = [];
      for (let i = 2; i <= 5; i++) {
        updates.push(
          saveDocument({
            id: testDocumentId,
            title: "Concurrent Edit Test",
            kind: "text" as const,
            content: `Update ${i}`,
            userId: testUserId,
            chatId: testChatId,
          })
        );
      }

      await Promise.all(updates);

      // Assert
      const versions = await getDocumentVersions({ id: testDocumentId });
      expect(versions.length).toBeGreaterThanOrEqual(5); // At least 5 versions

      // Verify version numbers are unique and sequential
      const versionNumbers = versions.map((v) => v.version_number);
      const uniqueVersions = new Set(versionNumbers);
      expect(uniqueVersions.size).toBe(versions.length);
    });

    it("should maintain data integrity with concurrent edits", async () => {
      // Act - Simulate two users editing simultaneously
      const user1Update = saveDocument({
        id: testDocumentId,
        title: "Concurrent Edit Test",
        kind: "text" as const,
        content: "User 1 changes",
        userId: testUserId,
        chatId: testChatId,
      });

      const user2Update = saveDocument({
        id: testDocumentId,
        title: "Concurrent Edit Test",
        kind: "text" as const,
        content: "User 2 changes",
        userId: testUserId,
        chatId: testChatId,
      });

      await Promise.all([user1Update, user2Update]);

      // Assert - Both edits should be saved as separate versions
      const versions = await getDocumentVersions({ id: testDocumentId });
      expect(versions).toHaveLength(3); // v1 + 2 concurrent updates

      // Check that both changes are preserved
      const contents = versions.map((v) => v.content);
      expect(contents).toContain("User 1 changes");
      expect(contents).toContain("User 2 changes");
    });
  });

  describe("Document Retrieval and Filtering", () => {
    beforeEach(async () => {
      // Create multiple documents in the chat
      await saveDocument({
        id: `${testDocumentId}-1`,
        title: "Document 1",
        kind: "text" as const,
        content: "Content 1",
        userId: testUserId,
        chatId: testChatId,
      });

      await saveDocument({
        id: `${testDocumentId}-2`,
        title: "Document 2",
        kind: "python" as const,
        content: 'print("test")',
        userId: testUserId,
        chatId: testChatId,
      });

      // Add version 2 to document 1
      await saveDocument({
        id: `${testDocumentId}-1`,
        title: "Document 1",
        kind: "text" as const,
        content: "Content 1 - Updated",
        userId: testUserId,
        chatId: testChatId,
      });
    });

    it("should get all documents in a chat", async () => {
      // Act
      const documents = await getDocumentsByChat({ chatId: testChatId });

      // Assert
      expect(documents.length).toBeGreaterThanOrEqual(3); // 2 docs + 1 version
    });

    it("should get only latest versions of documents in chat", async () => {
      // Act
      const latestVersions = await getLatestDocumentVersionsByChat({
        chatId: testChatId,
      });

      // Assert
      expect(latestVersions).toHaveLength(2); // Only 2 unique documents

      // Document 1 should have version 2 (latest)
      const doc1 = latestVersions.find((d) => d.id === `${testDocumentId}-1`);
      expect(doc1?.version_number).toBe(2);

      // Document 2 should have version 1 (only version)
      const doc2 = latestVersions.find((d) => d.id === `${testDocumentId}-2`);
      expect(doc2?.version_number).toBe(1);
    });

    it("should retrieve documents by different kinds", async () => {
      // Act
      const allDocuments = await getDocumentsByChat({ chatId: testChatId });

      // Assert
      const textDocs = allDocuments.filter((d) => d.kind === "text");
      const pythonDocs = allDocuments.filter((d) => d.kind === "python");

      expect(textDocs.length).toBeGreaterThanOrEqual(2); // Doc 1 v1 and v2
      expect(pythonDocs).toHaveLength(1); // Doc 2
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid document ID gracefully", async () => {
      // Act & Assert
      const result = await getDocumentById({ id: "non-existent-id" });
      expect(result).toBeUndefined();
    });

    it("should handle invalid version number", async () => {
      // Arrange - Create document
      await saveDocument({
        id: testDocumentId,
        title: "Error Test",
        kind: "text" as const,
        content: "Content",
        userId: testUserId,
        chatId: testChatId,
      });

      // Act & Assert
      const result = await getDocumentByIdAndVersion({
        id: testDocumentId,
        version: 999,
      });
      expect(result).toBeUndefined();
    });

    it("should handle empty chat ID", async () => {
      // Act
      const documents = await getDocumentsByChat({
        chatId: "non-existent-chat",
      });

      // Assert
      expect(documents).toEqual([]);
    });
  });

  describe("Complete Document Lifecycle Journey", () => {
    it("should complete full lifecycle: create → edit → suggest → accept → revert", async () => {
      // Step 1: Create document
      const createResult = await saveDocument({
        id: testDocumentId,
        title: "Complete Journey",
        kind: "text" as const,
        content: "Hello World",
        userId: testUserId,
        chatId: testChatId,
      });
      expect(createResult[0].version_number).toBe(1);

      // Step 2: Edit document (version 2)
      await saveDocument({
        id: testDocumentId,
        title: "Complete Journey",
        kind: "text" as const,
        content: "Hello Beautiful World",
        userId: testUserId,
        chatId: testChatId,
      });
      let currentDoc = await getDocumentById({ id: testDocumentId });
      expect(currentDoc.version_number).toBe(2);

      // Step 3: Generate suggestions
      const suggestions = [
        {
          documentId: testDocumentId,
          documentCreatedAt: currentDoc.createdAt,
          originalText: "Beautiful",
          suggestedText: "Amazing",
          description: "More impactful",
          user_id: testUserId,
        },
      ];
      await saveSuggestions({ suggestions });
      const savedSuggestions = await getSuggestionsByDocumentId({
        documentId: testDocumentId,
      });
      expect(savedSuggestions).toHaveLength(1);

      // Step 4: Accept suggestion (version 3)
      await saveDocument({
        id: testDocumentId,
        title: "Complete Journey",
        kind: "text" as const,
        content: "Hello Amazing World",
        userId: testUserId,
        chatId: testChatId,
        metadata: { suggestion_applied: true },
      });
      currentDoc = await getDocumentById({ id: testDocumentId });
      expect(currentDoc.version_number).toBe(3);
      expect(currentDoc.content).toBe("Hello Amazing World");

      // Step 5: Revert to version 1 (version 4)
      const version1 = await getDocumentByIdAndVersion({
        id: testDocumentId,
        version: 1,
      });
      await saveDocument({
        id: testDocumentId,
        title: "Complete Journey",
        kind: "text" as const,
        content: version1.content,
        userId: testUserId,
        chatId: testChatId,
        metadata: { reverted_from: 1 },
      });

      // Final verification
      const finalDoc = await getDocumentById({ id: testDocumentId });
      expect(finalDoc.version_number).toBe(4);
      expect(finalDoc.content).toBe("Hello World"); // Back to original

      // Verify complete history
      const allVersions = await getDocumentVersions({ id: testDocumentId });
      expect(allVersions).toHaveLength(4);
    });
  });
});
