import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  extractFileContent,
  type FileAttachment,
  validateFileAttachment,
} from "@/lib/ai/file-processing";

// Mock the activity logger to avoid database calls during tests
vi.mock("@/lib/logging/activity-logger", () => ({
  logAgentActivity: vi.fn().mockResolvedValue(undefined),
  PerformanceTracker: class {
    end = vi.fn().mockResolvedValue(undefined);
    getDuration = vi.fn().mockReturnValue(100);
  },
  createCorrelationId: vi.fn().mockReturnValue("test-correlation-id"),
  AgentType: {
    CHAT_MODEL_AGENT: "chat_model",
  },
  AgentOperationType: {
    TOOL_INVOCATION: "tool_invocation",
  },
  AgentOperationCategory: {
    TOOL_USE: "tool_use",
  },
}));

describe("File Processing - validateFileAttachment", () => {
  describe("Image File Validation", () => {
    it("should validate PNG image files", () => {
      const attachment: FileAttachment = {
        name: "test.png",
        url: "https://example.com/test.png",
        mediaType: "image/png",
        size: 1024 * 500, // 500KB
      };

      const result = validateFileAttachment(attachment);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should validate JPG/JPEG image files", () => {
      const attachment: FileAttachment = {
        name: "photo.jpg",
        url: "https://example.com/photo.jpg",
        mediaType: "image/jpeg",
        size: 1024 * 800, // 800KB
      };

      const result = validateFileAttachment(attachment);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should validate WebP image files", () => {
      const attachment: FileAttachment = {
        name: "image.webp",
        url: "https://example.com/image.webp",
        mediaType: "image/webp",
        size: 1024 * 300, // 300KB
      };

      const result = validateFileAttachment(attachment);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should validate GIF image files", () => {
      const attachment: FileAttachment = {
        name: "animation.gif",
        url: "https://example.com/animation.gif",
        mediaType: "image/gif",
        size: 1024 * 1024 * 2, // 2MB
      };

      const result = validateFileAttachment(attachment);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe("PDF File Validation", () => {
    it("should validate PDF files", () => {
      const attachment: FileAttachment = {
        name: "document.pdf",
        url: "https://example.com/document.pdf",
        mediaType: "application/pdf",
        size: 1024 * 1024 * 5, // 5MB
      };

      const result = validateFileAttachment(attachment);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should validate PDF files without size information", () => {
      const attachment: FileAttachment = {
        name: "document.pdf",
        url: "https://example.com/document.pdf",
        mediaType: "application/pdf",
      };

      const result = validateFileAttachment(attachment);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe("Code File Validation", () => {
    it("should validate Python code files", () => {
      const attachment: FileAttachment = {
        name: "script.py",
        url: "https://example.com/script.py",
        mediaType: "text/x-python",
        size: 1024 * 50, // 50KB
      };

      const result = validateFileAttachment(attachment);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should validate JavaScript code files", () => {
      const attachment: FileAttachment = {
        name: "app.js",
        url: "https://example.com/app.js",
        mediaType: "text/javascript",
        size: 1024 * 100, // 100KB
      };

      const result = validateFileAttachment(attachment);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should validate TypeScript code files", () => {
      const attachment: FileAttachment = {
        name: "component.ts",
        url: "https://example.com/component.ts",
        mediaType: "text/typescript",
        size: 1024 * 75, // 75KB
      };

      const result = validateFileAttachment(attachment);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should validate plain text code files", () => {
      const attachment: FileAttachment = {
        name: "config.txt",
        url: "https://example.com/config.txt",
        mediaType: "text/plain",
        size: 1024 * 10, // 10KB
      };

      const result = validateFileAttachment(attachment);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should validate JSON files", () => {
      const attachment: FileAttachment = {
        name: "data.json",
        url: "https://example.com/data.json",
        mediaType: "application/json",
        size: 1024 * 25, // 25KB
      };

      const result = validateFileAttachment(attachment);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe("File Size Validation", () => {
    it("should reject files larger than 10MB", () => {
      const attachment: FileAttachment = {
        name: "large-file.pdf",
        url: "https://example.com/large-file.pdf",
        mediaType: "application/pdf",
        size: 1024 * 1024 * 11, // 11MB (exceeds limit)
      };

      const result = validateFileAttachment(attachment);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("File size exceeds 10MB limit");
    });

    it("should accept files exactly at 10MB limit", () => {
      const attachment: FileAttachment = {
        name: "max-size.pdf",
        url: "https://example.com/max-size.pdf",
        mediaType: "application/pdf",
        size: 1024 * 1024 * 10, // Exactly 10MB
      };

      const result = validateFileAttachment(attachment);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept files just under 10MB limit", () => {
      const attachment: FileAttachment = {
        name: "under-limit.pdf",
        url: "https://example.com/under-limit.pdf",
        mediaType: "application/pdf",
        size: 1024 * 1024 * 10 - 1, // 10MB - 1 byte
      };

      const result = validateFileAttachment(attachment);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should reject very large files (50MB)", () => {
      const attachment: FileAttachment = {
        name: "huge-file.pdf",
        url: "https://example.com/huge-file.pdf",
        mediaType: "application/pdf",
        size: 1024 * 1024 * 50, // 50MB
      };

      const result = validateFileAttachment(attachment);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("File size exceeds 10MB limit");
    });
  });

  describe("File Type Rejection", () => {
    it("should reject unsupported video files", () => {
      const attachment: FileAttachment = {
        name: "video.mp4",
        url: "https://example.com/video.mp4",
        mediaType: "video/mp4",
        size: 1024 * 1024 * 5, // 5MB
      };

      const result = validateFileAttachment(attachment);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Unsupported file type: video/mp4");
    });

    it("should reject unsupported audio files", () => {
      const attachment: FileAttachment = {
        name: "audio.mp3",
        url: "https://example.com/audio.mp3",
        mediaType: "audio/mpeg",
        size: 1024 * 1024 * 3, // 3MB
      };

      const result = validateFileAttachment(attachment);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Unsupported file type: audio/mpeg");
    });

    it("should reject unsupported archive files", () => {
      const attachment: FileAttachment = {
        name: "archive.zip",
        url: "https://example.com/archive.zip",
        mediaType: "application/zip",
        size: 1024 * 1024 * 2, // 2MB
      };

      const result = validateFileAttachment(attachment);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Unsupported file type: application/zip");
    });

    it("should reject unsupported executable files", () => {
      const attachment: FileAttachment = {
        name: "program.exe",
        url: "https://example.com/program.exe",
        mediaType: "application/x-msdownload",
        size: 1024 * 1024 * 1, // 1MB
      };

      const result = validateFileAttachment(attachment);

      expect(result.valid).toBe(false);
      expect(result.error).toBe(
        "Unsupported file type: application/x-msdownload"
      );
    });

    it("should reject unsupported binary files", () => {
      const attachment: FileAttachment = {
        name: "data.bin",
        url: "https://example.com/data.bin",
        mediaType: "application/octet-stream",
        size: 1024 * 100, // 100KB
      };

      const result = validateFileAttachment(attachment);

      expect(result.valid).toBe(false);
      expect(result.error).toBe(
        "Unsupported file type: application/octet-stream"
      );
    });
  });

  describe("Required Properties Validation", () => {
    it("should reject files without name", () => {
      const attachment: FileAttachment = {
        name: "",
        url: "https://example.com/file.pdf",
        mediaType: "application/pdf",
        size: 1024 * 100,
      };

      const result = validateFileAttachment(attachment);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Missing required file properties");
    });

    it("should reject files without URL", () => {
      const attachment: FileAttachment = {
        name: "file.pdf",
        url: "",
        mediaType: "application/pdf",
        size: 1024 * 100,
      };

      const result = validateFileAttachment(attachment);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Missing required file properties");
    });

    it("should reject files without mediaType", () => {
      const attachment: FileAttachment = {
        name: "file.pdf",
        url: "https://example.com/file.pdf",
        mediaType: "",
        size: 1024 * 100,
      };

      const result = validateFileAttachment(attachment);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Missing required file properties");
    });
  });
});

describe("File Processing - extractFileContent", () => {
  // Mock global fetch
  global.fetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Image File Content Extraction", () => {
    it("should extract content from PNG images", async () => {
      const imageBuffer = new ArrayBuffer(1024 * 500); // 500KB
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(imageBuffer),
      });

      const attachment: FileAttachment = {
        name: "test.png",
        url: "https://example.com/test.png",
        mediaType: "image/png",
      };

      const content = await extractFileContent(attachment);

      expect(content).toContain("Image file: test.png");
      expect(content).toContain("Type: image/png");
      expect(content).toContain("Size: 500KB");
      expect(content).toContain("[Image content cannot be extracted as text");
      expect(global.fetch).toHaveBeenCalledWith(attachment.url);
    });

    it("should extract content from JPEG images", async () => {
      const imageBuffer = new ArrayBuffer(1024 * 800); // 800KB
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(imageBuffer),
      });

      const attachment: FileAttachment = {
        name: "photo.jpg",
        url: "https://example.com/photo.jpg",
        mediaType: "image/jpeg",
      };

      const content = await extractFileContent(attachment);

      expect(content).toContain("Image file: photo.jpg");
      expect(content).toContain("Type: image/jpeg");
      expect(content).toContain("Size: 800KB");
    });

    it("should extract content from WebP images", async () => {
      const imageBuffer = new ArrayBuffer(1024 * 300); // 300KB
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(imageBuffer),
      });

      const attachment: FileAttachment = {
        name: "modern.webp",
        url: "https://example.com/modern.webp",
        mediaType: "image/webp",
      };

      const content = await extractFileContent(attachment);

      expect(content).toContain("Image file: modern.webp");
      expect(content).toContain("Type: image/webp");
      expect(content).toContain("Size: 300KB");
    });
  });

  describe("PDF File Content Extraction", () => {
    it("should handle PDF file extraction", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
        text: () => Promise.resolve(""),
      });

      const attachment: FileAttachment = {
        name: "document.pdf",
        url: "https://example.com/document.pdf",
        mediaType: "application/pdf",
      };

      const content = await extractFileContent(attachment);

      expect(content).toContain("PDF file: document.pdf");
      expect(content).toContain("[PDF text extraction not implemented yet");
    });
  });

  describe("Code File Content Extraction", () => {
    it("should extract content from Python files", async () => {
      const pythonCode = 'def hello():\n    print("Hello, World!")';
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(pythonCode),
      });

      const attachment: FileAttachment = {
        name: "script.py",
        url: "https://example.com/script.py",
        mediaType: "application/x-python",
      };

      const content = await extractFileContent(attachment);

      expect(content).toContain("Code file (py): script.py");
      expect(content).toContain("```py");
      expect(content).toContain(pythonCode);
      expect(content).toContain("```");
    });

    it("should extract content from JavaScript files", async () => {
      const jsCode = 'function hello() {\n  console.log("Hello!");\n}';
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(jsCode),
      });

      const attachment: FileAttachment = {
        name: "app.js",
        url: "https://example.com/app.js",
        mediaType: "application/javascript",
      };

      const content = await extractFileContent(attachment);

      expect(content).toContain("Code file (js): app.js");
      expect(content).toContain("```js");
      expect(content).toContain(jsCode);
    });

    it("should extract content from TypeScript files", async () => {
      const tsCode = "interface User {\n  name: string;\n  age: number;\n}";
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(tsCode),
      });

      const attachment: FileAttachment = {
        name: "types.ts",
        url: "https://example.com/types.ts",
        mediaType: "application/typescript",
      };

      const content = await extractFileContent(attachment);

      expect(content).toContain("Code file (ts): types.ts");
      expect(content).toContain("```ts");
      expect(content).toContain(tsCode);
    });

    it("should extract content from text files", async () => {
      const textContent = "This is plain text content.";
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(textContent),
      });

      const attachment: FileAttachment = {
        name: "readme.txt",
        url: "https://example.com/readme.txt",
        mediaType: "text/plain",
      };

      const content = await extractFileContent(attachment);

      expect(content).toBe(textContent);
    });

    it("should extract and format JSON files", async () => {
      const jsonData = { name: "Test", value: 123 };
      const jsonString = JSON.stringify(jsonData);
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(jsonString),
      });

      const attachment: FileAttachment = {
        name: "data.json",
        url: "https://example.com/data.json",
        mediaType: "application/json",
      };

      const content = await extractFileContent(attachment);

      expect(content).toContain('"name": "Test"');
      expect(content).toContain('"value": 123');
      // Verify it's formatted (pretty-printed)
      expect(content).toContain("\n");
    });

    it("should handle malformed JSON gracefully", async () => {
      const malformedJson = '{ name: "Test", invalid }';
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(malformedJson),
      });

      const attachment: FileAttachment = {
        name: "bad.json",
        url: "https://example.com/bad.json",
        mediaType: "application/json",
      };

      const content = await extractFileContent(attachment);

      // Should return as text if JSON parsing fails
      expect(content).toBe(malformedJson);
    });
  });

  describe("Base64 Encoding Support", () => {
    it("should handle binary data correctly for images", async () => {
      const imageBuffer = new ArrayBuffer(1024);
      const uint8Array = new Uint8Array(imageBuffer);
      // Fill with some binary data
      for (let i = 0; i < uint8Array.length; i++) {
        uint8Array[i] = i % 256;
      }

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(imageBuffer),
      });

      const attachment: FileAttachment = {
        name: "binary.png",
        url: "https://example.com/binary.png",
        mediaType: "image/png",
        size: 1024,
      };

      const content = await extractFileContent(attachment);

      // Verify the function handles binary data (doesn't crash)
      expect(content).toBeDefined();
      expect(content).toContain("Image file: binary.png");
      expect(content).toContain("Size: 1KB");
    });

    it("should calculate correct file size from buffer", async () => {
      const sizeInBytes = 1024 * 250; // 250KB
      const imageBuffer = new ArrayBuffer(sizeInBytes);

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(imageBuffer),
      });

      const attachment: FileAttachment = {
        name: "sized.jpg",
        url: "https://example.com/sized.jpg",
        mediaType: "image/jpeg",
      };

      const content = await extractFileContent(attachment);

      expect(content).toContain("Size: 250KB");
    });
  });

  describe("Error Handling", () => {
    it("should throw error when fetch fails", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: "Not Found",
      });

      const attachment: FileAttachment = {
        name: "missing.pdf",
        url: "https://example.com/missing.pdf",
        mediaType: "application/pdf",
      };

      await expect(extractFileContent(attachment)).rejects.toThrow(
        "Failed to process file missing.pdf"
      );
    });

    it("should throw error when network request fails", async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

      const attachment: FileAttachment = {
        name: "file.pdf",
        url: "https://example.com/file.pdf",
        mediaType: "application/pdf",
      };

      await expect(extractFileContent(attachment)).rejects.toThrow(
        "Failed to process file file.pdf"
      );
    });

    it("should handle fetch timeout gracefully", async () => {
      (global.fetch as any).mockImplementationOnce(() =>
        Promise.reject(new Error("Request timeout"))
      );

      const attachment: FileAttachment = {
        name: "slow.pdf",
        url: "https://example.com/slow.pdf",
        mediaType: "application/pdf",
      };

      await expect(extractFileContent(attachment)).rejects.toThrow(
        "Failed to process file slow.pdf"
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty text files", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(""),
      });

      const attachment: FileAttachment = {
        name: "empty.txt",
        url: "https://example.com/empty.txt",
        mediaType: "text/plain",
      };

      const content = await extractFileContent(attachment);

      expect(content).toBe("");
    });

    it("should handle very large code files", async () => {
      const largeCode = 'console.log("test");\n'.repeat(10_000);
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(largeCode),
      });

      const attachment: FileAttachment = {
        name: "large.js",
        url: "https://example.com/large.js",
        mediaType: "application/javascript",
      };

      const content = await extractFileContent(attachment);

      expect(content).toContain("Code file (js): large.js");
      expect(content).toContain(largeCode);
    });

    it("should handle files with special characters in names", async () => {
      const textContent = "Special file content";
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(textContent),
      });

      const attachment: FileAttachment = {
        name: "file-with-dashes_and_underscores (1).txt",
        url: "https://example.com/special.txt",
        mediaType: "text/plain",
      };

      const content = await extractFileContent(attachment);

      expect(content).toBe(textContent);
    });

    it("should handle code files with uppercase extensions", async () => {
      const code = "class MyClass {}";
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(code),
      });

      const attachment: FileAttachment = {
        name: "Component.JS",
        url: "https://example.com/Component.JS",
        mediaType: "application/javascript",
      };

      const content = await extractFileContent(attachment);

      // Extension should be normalized to lowercase
      expect(content).toContain("Code file (js): Component.JS");
      expect(content).toContain("```js");
    });

    it("should handle files without extensions", async () => {
      const textContent = "No extension file";
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(textContent),
      });

      const attachment: FileAttachment = {
        name: "README",
        url: "https://example.com/README",
        mediaType: "text/plain",
      };

      const content = await extractFileContent(attachment);

      expect(content).toBe(textContent);
    });
  });
});
