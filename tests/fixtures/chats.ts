/**
 * Test fixtures for chats and messages
 */

export const testChats = {
  simpleChat: {
    id: "660e8400-e29b-41d4-a716-446655440001",
    userId: "550e8400-e29b-41d4-a716-446655440001",
    title: "Simple Test Chat",
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
  },
  chatWithHistory: {
    id: "660e8400-e29b-41d4-a716-446655440002",
    userId: "550e8400-e29b-41d4-a716-446655440001",
    title: "Chat with History",
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-02T00:00:00.000Z"),
  },
};

export const testMessages = {
  userMessage: {
    id: "770e8400-e29b-41d4-a716-446655440001",
    chatId: "660e8400-e29b-41d4-a716-446655440001",
    role: "user" as const,
    content: {
      type: "text",
      text: "Hello, how are you?",
    },
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
  },
  assistantMessage: {
    id: "770e8400-e29b-41d4-a716-446655440002",
    chatId: "660e8400-e29b-41d4-a716-446655440001",
    role: "assistant" as const,
    content: {
      type: "text",
      text: "I am doing well, thank you!",
    },
    createdAt: new Date("2024-01-01T00:01:00.000Z"),
  },
  messageWithAttachment: {
    id: "770e8400-e29b-41d4-a716-446655440003",
    chatId: "660e8400-e29b-41d4-a716-446655440001",
    role: "user" as const,
    content: {
      type: "multimodal",
      parts: [
        { type: "text", text: "Look at this image" },
        { type: "image", image: "https://example.com/image.png" },
      ],
    },
    createdAt: new Date("2024-01-01T00:02:00.000Z"),
  },
};

export const testDocuments = {
  textDocument: {
    id: "880e8400-e29b-41d4-a716-446655440001",
    chatId: "660e8400-e29b-41d4-a716-446655440001",
    userId: "550e8400-e29b-41d4-a716-446655440001",
    title: "Test Document",
    kind: "text" as const,
    content: "# Test Document\n\nThis is a test document.",
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
  },
  pythonCode: {
    id: "880e8400-e29b-41d4-a716-446655440002",
    chatId: "660e8400-e29b-41d4-a716-446655440001",
    userId: "550e8400-e29b-41d4-a716-446655440001",
    title: "Python Script",
    kind: "code" as const,
    content: 'print("Hello, World!")',
    createdAt: new Date("2024-01-01T00:01:00.000Z"),
  },
};
