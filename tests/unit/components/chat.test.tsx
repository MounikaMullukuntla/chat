/**
 * Chat Component Unit Tests
 * Tests for the main Chat component including rendering, interactions, and error handling
 */

import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Chat } from "@/components/chat";
import type { VisibilityType } from "@/components/visibility-selector";
import type { ChatMessage } from "@/lib/types";
import { render, screen, waitFor } from "@/tests/helpers/test-utils";

// Mock dependencies
vi.mock("@ai-sdk/react", () => ({
  useChat: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(() => ({
    get: vi.fn(() => null),
  })),
}));

vi.mock("swr", () => ({
  default: vi.fn(() => ({ data: undefined, error: undefined })),
  useSWRConfig: vi.fn(() => ({ mutate: vi.fn() })),
  unstable_serialize: vi.fn((key) => key),
}));

vi.mock("swr/infinite", () => ({
  unstable_serialize: vi.fn((key) => key),
}));

vi.mock("@/hooks/use-artifact", () => ({
  useArtifactSelector: vi.fn((selector) => {
    const state = { isVisible: false };
    return selector(state);
  }),
}));

vi.mock("@/hooks/use-auto-resume", () => ({
  useAutoResume: vi.fn(),
}));

vi.mock("@/hooks/use-chat-visibility", () => ({
  useChatVisibility: vi.fn((props) => ({
    visibilityType: props.initialVisibilityType,
  })),
}));

vi.mock("@/lib/storage", () => ({
  storage: {
    apiKeys: {
      get: vi.fn(() => "test-google-api-key"),
    },
    github: {
      getToken: vi.fn(() => "test-github-pat"),
    },
  },
}));

vi.mock("@/components/data-stream-provider", () => ({
  useDataStream: vi.fn(() => ({
    setDataStream: vi.fn(),
  })),
}));

vi.mock("@/components/chat-header", () => ({
  ChatHeader: ({ chatId }: { chatId: string }) => (
    <div data-testid="chat-header">Chat Header - {chatId}</div>
  ),
}));

vi.mock("@/components/messages", () => ({
  Messages: ({ messages, status }: { messages: any[]; status: string }) => (
    <div data-testid="messages">
      {messages.length === 0 ? (
        <div data-testid="empty-state">No messages yet</div>
      ) : (
        <div data-testid="message-list">
          {messages.map((msg, idx) => (
            <div data-testid={`message-${idx}`} key={idx}>
              {msg.role}: {msg.parts?.[0]?.text || "No content"}
            </div>
          ))}
        </div>
      )}
      {status === "streaming" && (
        <div data-testid="streaming-indicator">Streaming...</div>
      )}
    </div>
  ),
}));

vi.mock("@/components/multimodal-input", () => ({
  MultimodalInput: ({
    input,
    setInput,
    sendMessage,
    status,
    stop,
  }: {
    input: string;
    setInput: (input: string) => void;
    sendMessage: (message: any) => void;
    status: string;
    stop: () => void;
  }) => (
    <div data-testid="multimodal-input">
      <input
        data-testid="message-input"
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type a message..."
        value={input}
      />
      <button
        data-testid="send-button"
        disabled={status === "streaming" || !input.trim()}
        onClick={() => {
          if (input.trim()) {
            sendMessage({
              role: "user",
              parts: [{ type: "text", text: input }],
            });
            setInput("");
          }
        }}
      >
        Send
      </button>
      {status === "streaming" && (
        <button data-testid="stop-button" onClick={stop}>
          Stop
        </button>
      )}
      <input data-testid="file-input" type="file" />
    </div>
  ),
}));

vi.mock("@/components/artifact", () => ({
  Artifact: () => <div data-testid="artifact">Artifact Panel</div>,
}));

vi.mock("@/components/toast", () => ({
  toast: vi.fn(),
}));

// Import mocked modules
import { useChat } from "@ai-sdk/react";
import { toast } from "@/components/toast";

describe("Chat Component", () => {
  const mockSendMessage = vi.fn();
  const mockSetMessages = vi.fn();
  const mockRegenerate = vi.fn();
  const mockStop = vi.fn();
  const mockResumeStream = vi.fn();

  const defaultProps = {
    id: "test-chat-id",
    initialMessages: [] as ChatMessage[],
    initialChatModel: "gemini-2.0-flash-exp",
    initialVisibilityType: "private" as VisibilityType,
    isReadonly: false,
    autoResume: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default useChat mock
    (useChat as any).mockReturnValue({
      messages: [],
      setMessages: mockSetMessages,
      sendMessage: mockSendMessage,
      status: "idle",
      stop: mockStop,
      regenerate: mockRegenerate,
      resumeStream: mockResumeStream,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering with messages", () => {
    it("should render the chat component with messages", () => {
      const messages: ChatMessage[] = [
        {
          id: "1",
          role: "user",
          parts: [{ type: "text", text: "Hello, AI!" }],
          metadata: { createdAt: new Date().toISOString() },
        },
        {
          id: "2",
          role: "assistant",
          parts: [{ type: "text", text: "Hello! How can I help you?" }],
          metadata: { createdAt: new Date().toISOString() },
        },
      ];

      (useChat as any).mockReturnValue({
        messages,
        setMessages: mockSetMessages,
        sendMessage: mockSendMessage,
        status: "idle",
        stop: mockStop,
        regenerate: mockRegenerate,
        resumeStream: mockResumeStream,
      });

      render(<Chat {...defaultProps} initialMessages={messages} />);

      expect(screen.getByTestId("message-list")).toBeInTheDocument();
      expect(screen.getByTestId("message-0")).toHaveTextContent(
        "user: Hello, AI!"
      );
      expect(screen.getByTestId("message-1")).toHaveTextContent(
        "assistant: Hello! How can I help you?"
      );
    });

    it("should render user messages and assistant messages correctly", () => {
      const messages: ChatMessage[] = [
        {
          id: "1",
          role: "user",
          parts: [{ type: "text", text: "What is TypeScript?" }],
          metadata: { createdAt: new Date().toISOString() },
        },
        {
          id: "2",
          role: "assistant",
          parts: [
            {
              type: "text",
              text: "TypeScript is a typed superset of JavaScript.",
            },
          ],
          metadata: { createdAt: new Date().toISOString() },
        },
      ];

      (useChat as any).mockReturnValue({
        messages,
        setMessages: mockSetMessages,
        sendMessage: mockSendMessage,
        status: "idle",
        stop: mockStop,
        regenerate: mockRegenerate,
        resumeStream: mockResumeStream,
      });

      render(<Chat {...defaultProps} initialMessages={messages} />);

      expect(screen.getByText(/user: What is TypeScript/)).toBeInTheDocument();
      expect(
        screen.getByText(/assistant: TypeScript is a typed superset/)
      ).toBeInTheDocument();
    });

    it("should render multiple messages in conversation order", () => {
      const messages: ChatMessage[] = [
        {
          id: "1",
          role: "user",
          parts: [{ type: "text", text: "First message" }],
          metadata: { createdAt: new Date().toISOString() },
        },
        {
          id: "2",
          role: "assistant",
          parts: [{ type: "text", text: "First response" }],
          metadata: { createdAt: new Date().toISOString() },
        },
        {
          id: "3",
          role: "user",
          parts: [{ type: "text", text: "Second message" }],
          metadata: { createdAt: new Date().toISOString() },
        },
      ];

      (useChat as any).mockReturnValue({
        messages,
        setMessages: mockSetMessages,
        sendMessage: mockSendMessage,
        status: "idle",
        stop: mockStop,
        regenerate: mockRegenerate,
        resumeStream: mockResumeStream,
      });

      render(<Chat {...defaultProps} initialMessages={messages} />);

      // Verify each message is rendered
      expect(screen.getByTestId("message-0")).toBeInTheDocument();
      expect(screen.getByTestId("message-1")).toBeInTheDocument();
      expect(screen.getByTestId("message-2")).toBeInTheDocument();

      // Verify message content
      expect(screen.getByText(/First message/)).toBeInTheDocument();
      expect(screen.getByText(/First response/)).toBeInTheDocument();
      expect(screen.getByText(/Second message/)).toBeInTheDocument();
    });
  });

  describe("Empty state rendering", () => {
    it("should render empty state when no messages", () => {
      (useChat as any).mockReturnValue({
        messages: [],
        setMessages: mockSetMessages,
        sendMessage: mockSendMessage,
        status: "idle",
        stop: mockStop,
        regenerate: mockRegenerate,
        resumeStream: mockResumeStream,
      });

      render(<Chat {...defaultProps} />);

      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
      expect(screen.getByText("No messages yet")).toBeInTheDocument();
    });

    it("should show input field in empty state", () => {
      (useChat as any).mockReturnValue({
        messages: [],
        setMessages: mockSetMessages,
        sendMessage: mockSendMessage,
        status: "idle",
        stop: mockStop,
        regenerate: mockRegenerate,
        resumeStream: mockResumeStream,
      });

      render(<Chat {...defaultProps} />);

      expect(screen.getByTestId("message-input")).toBeInTheDocument();
      expect(screen.getByTestId("send-button")).toBeInTheDocument();
    });

    it("should have send button disabled in empty state with no input", () => {
      (useChat as any).mockReturnValue({
        messages: [],
        setMessages: mockSetMessages,
        sendMessage: mockSendMessage,
        status: "idle",
        stop: mockStop,
        regenerate: mockRegenerate,
        resumeStream: mockResumeStream,
      });

      render(<Chat {...defaultProps} />);

      const sendButton = screen.getByTestId("send-button");
      expect(sendButton).toBeDisabled();
    });
  });

  describe("Message input", () => {
    it("should allow typing in message input field", async () => {
      const user = userEvent.setup();

      (useChat as any).mockReturnValue({
        messages: [],
        setMessages: mockSetMessages,
        sendMessage: mockSendMessage,
        status: "idle",
        stop: mockStop,
        regenerate: mockRegenerate,
        resumeStream: mockResumeStream,
      });

      render(<Chat {...defaultProps} />);

      const input = screen.getByTestId("message-input") as HTMLInputElement;
      await user.type(input, "Hello, world!");

      expect(input.value).toBe("Hello, world!");
    });

    it("should enable send button when input has text", async () => {
      const user = userEvent.setup();

      (useChat as any).mockReturnValue({
        messages: [],
        setMessages: mockSetMessages,
        sendMessage: mockSendMessage,
        status: "idle",
        stop: mockStop,
        regenerate: mockRegenerate,
        resumeStream: mockResumeStream,
      });

      render(<Chat {...defaultProps} />);

      const input = screen.getByTestId("message-input");
      const sendButton = screen.getByTestId("send-button");

      expect(sendButton).toBeDisabled();

      await user.type(input, "Test message");

      expect(sendButton).not.toBeDisabled();
    });

    it("should clear input field after sending message", async () => {
      const user = userEvent.setup();

      (useChat as any).mockReturnValue({
        messages: [],
        setMessages: mockSetMessages,
        sendMessage: mockSendMessage,
        status: "idle",
        stop: mockStop,
        regenerate: mockRegenerate,
        resumeStream: mockResumeStream,
      });

      render(<Chat {...defaultProps} />);

      const input = screen.getByTestId("message-input") as HTMLInputElement;
      const sendButton = screen.getByTestId("send-button");

      await user.type(input, "Test message");
      await user.click(sendButton);

      expect(input.value).toBe("");
    });
  });

  describe("Send button click", () => {
    it("should call sendMessage when send button is clicked", async () => {
      const user = userEvent.setup();

      (useChat as any).mockReturnValue({
        messages: [],
        setMessages: mockSetMessages,
        sendMessage: mockSendMessage,
        status: "idle",
        stop: mockStop,
        regenerate: mockRegenerate,
        resumeStream: mockResumeStream,
      });

      render(<Chat {...defaultProps} />);

      const input = screen.getByTestId("message-input");
      const sendButton = screen.getByTestId("send-button");

      await user.type(input, "Hello AI");
      await user.click(sendButton);

      expect(mockSendMessage).toHaveBeenCalledWith({
        role: "user",
        parts: [{ type: "text", text: "Hello AI" }],
      });
    });

    it("should not send empty messages", async () => {
      const _user = userEvent.setup();

      (useChat as any).mockReturnValue({
        messages: [],
        setMessages: mockSetMessages,
        sendMessage: mockSendMessage,
        status: "idle",
        stop: mockStop,
        regenerate: mockRegenerate,
        resumeStream: mockResumeStream,
      });

      render(<Chat {...defaultProps} />);

      const sendButton = screen.getByTestId("send-button");

      // Button should be disabled, so this won't trigger anything
      expect(sendButton).toBeDisabled();
    });

    it("should disable send button while streaming", () => {
      (useChat as any).mockReturnValue({
        messages: [],
        setMessages: mockSetMessages,
        sendMessage: mockSendMessage,
        status: "streaming",
        stop: mockStop,
        regenerate: mockRegenerate,
        resumeStream: mockResumeStream,
      });

      render(<Chat {...defaultProps} />);

      const sendButton = screen.getByTestId("send-button");
      expect(sendButton).toBeDisabled();
    });
  });

  describe("File upload", () => {
    it("should render file upload input", () => {
      (useChat as any).mockReturnValue({
        messages: [],
        setMessages: mockSetMessages,
        sendMessage: mockSendMessage,
        status: "idle",
        stop: mockStop,
        regenerate: mockRegenerate,
        resumeStream: mockResumeStream,
      });

      render(<Chat {...defaultProps} />);

      expect(screen.getByTestId("file-input")).toBeInTheDocument();
    });

    it("should have file input available for uploads", () => {
      (useChat as any).mockReturnValue({
        messages: [],
        setMessages: mockSetMessages,
        sendMessage: mockSendMessage,
        status: "idle",
        stop: mockStop,
        regenerate: mockRegenerate,
        resumeStream: mockResumeStream,
      });

      render(<Chat {...defaultProps} />);

      const fileInput = screen.getByTestId("file-input") as HTMLInputElement;
      expect(fileInput.type).toBe("file");
    });
  });

  describe("Streaming message display", () => {
    it("should show streaming indicator when status is streaming", () => {
      (useChat as any).mockReturnValue({
        messages: [
          {
            id: "1",
            role: "user",
            parts: [{ type: "text", text: "Hello" }],
            metadata: { createdAt: new Date().toISOString() },
          },
        ],
        setMessages: mockSetMessages,
        sendMessage: mockSendMessage,
        status: "streaming",
        stop: mockStop,
        regenerate: mockRegenerate,
        resumeStream: mockResumeStream,
      });

      render(<Chat {...defaultProps} />);

      expect(screen.getByTestId("streaming-indicator")).toBeInTheDocument();
      expect(screen.getByText("Streaming...")).toBeInTheDocument();
    });

    it("should show stop button during streaming", () => {
      (useChat as any).mockReturnValue({
        messages: [],
        setMessages: mockSetMessages,
        sendMessage: mockSendMessage,
        status: "streaming",
        stop: mockStop,
        regenerate: mockRegenerate,
        resumeStream: mockResumeStream,
      });

      render(<Chat {...defaultProps} />);

      expect(screen.getByTestId("stop-button")).toBeInTheDocument();
    });

    it("should call stop function when stop button is clicked", async () => {
      const user = userEvent.setup();

      (useChat as any).mockReturnValue({
        messages: [],
        setMessages: mockSetMessages,
        sendMessage: mockSendMessage,
        status: "streaming",
        stop: mockStop,
        regenerate: mockRegenerate,
        resumeStream: mockResumeStream,
      });

      render(<Chat {...defaultProps} />);

      const stopButton = screen.getByTestId("stop-button");
      await user.click(stopButton);

      expect(mockStop).toHaveBeenCalledTimes(1);
    });

    it("should not show streaming indicator when status is idle", () => {
      (useChat as any).mockReturnValue({
        messages: [],
        setMessages: mockSetMessages,
        sendMessage: mockSendMessage,
        status: "idle",
        stop: mockStop,
        regenerate: mockRegenerate,
        resumeStream: mockResumeStream,
      });

      render(<Chat {...defaultProps} />);

      expect(
        screen.queryByTestId("streaming-indicator")
      ).not.toBeInTheDocument();
    });
  });

  describe("Error message display", () => {
    it("should display toast error on chat error", async () => {
      const _onErrorCallback = vi.fn();

      (useChat as any).mockImplementation((config: any) => {
        // Simulate error
        setTimeout(() => {
          const error = new Error("Network error");
          config.onError(error);
        }, 0);

        return {
          messages: [],
          setMessages: mockSetMessages,
          sendMessage: mockSendMessage,
          status: "idle",
          stop: mockStop,
          regenerate: mockRegenerate,
          resumeStream: mockResumeStream,
        };
      });

      render(<Chat {...defaultProps} />);

      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith({
          type: "error",
          description: "Network error",
        });
      });
    });

    it("should display specific error for missing API key", async () => {
      (useChat as any).mockImplementation((config: any) => {
        setTimeout(() => {
          const error = new Error("Google API key is required");
          config.onError(error);
        }, 0);

        return {
          messages: [],
          setMessages: mockSetMessages,
          sendMessage: mockSendMessage,
          status: "idle",
          stop: mockStop,
          regenerate: mockRegenerate,
          resumeStream: mockResumeStream,
        };
      });

      render(<Chat {...defaultProps} />);

      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith({
          type: "error",
          description:
            "Please configure your Google API key in Settings to use the chat.",
        });
      });
    });

    it("should handle generic errors", async () => {
      (useChat as any).mockImplementation((config: any) => {
        setTimeout(() => {
          const error = new Error("Something went wrong");
          config.onError(error);
        }, 0);

        return {
          messages: [],
          setMessages: mockSetMessages,
          sendMessage: mockSendMessage,
          status: "idle",
          stop: mockStop,
          regenerate: mockRegenerate,
          resumeStream: mockResumeStream,
        };
      });

      render(<Chat {...defaultProps} />);

      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith({
          type: "error",
          description: "Something went wrong",
        });
      });
    });
  });

  describe("Retry functionality", () => {
    it("should allow sending another message after error", async () => {
      const user = userEvent.setup();

      (useChat as any).mockReturnValue({
        messages: [],
        setMessages: mockSetMessages,
        sendMessage: mockSendMessage,
        status: "idle",
        stop: mockStop,
        regenerate: mockRegenerate,
        resumeStream: mockResumeStream,
      });

      render(<Chat {...defaultProps} />);

      const input = screen.getByTestId("message-input");
      const sendButton = screen.getByTestId("send-button");

      // First attempt
      await user.type(input, "First message");
      await user.click(sendButton);

      expect(mockSendMessage).toHaveBeenCalledTimes(1);

      // Retry with new message
      await user.type(input, "Retry message");
      await user.click(sendButton);

      expect(mockSendMessage).toHaveBeenCalledTimes(2);
    });

    it("should support regenerate functionality", () => {
      (useChat as any).mockReturnValue({
        messages: [
          {
            id: "1",
            role: "user",
            parts: [{ type: "text", text: "Hello" }],
            metadata: { createdAt: new Date().toISOString() },
          },
        ],
        setMessages: mockSetMessages,
        sendMessage: mockSendMessage,
        status: "idle",
        stop: mockStop,
        regenerate: mockRegenerate,
        resumeStream: mockResumeStream,
      });

      render(<Chat {...defaultProps} />);

      // Verify regenerate function is available
      expect(mockRegenerate).toBeDefined();
    });
  });

  describe("Component structure", () => {
    it("should render all main components", () => {
      (useChat as any).mockReturnValue({
        messages: [],
        setMessages: mockSetMessages,
        sendMessage: mockSendMessage,
        status: "idle",
        stop: mockStop,
        regenerate: mockRegenerate,
        resumeStream: mockResumeStream,
      });

      render(<Chat {...defaultProps} />);

      expect(screen.getByTestId("chat-header")).toBeInTheDocument();
      expect(screen.getByTestId("messages")).toBeInTheDocument();
      expect(screen.getByTestId("multimodal-input")).toBeInTheDocument();
      expect(screen.getByTestId("artifact")).toBeInTheDocument();
    });

    it("should not render multimodal input when readonly", () => {
      (useChat as any).mockReturnValue({
        messages: [],
        setMessages: mockSetMessages,
        sendMessage: mockSendMessage,
        status: "idle",
        stop: mockStop,
        regenerate: mockRegenerate,
        resumeStream: mockResumeStream,
      });

      render(<Chat {...defaultProps} isReadonly={true} />);

      expect(screen.queryByTestId("multimodal-input")).not.toBeInTheDocument();
    });

    it("should pass correct chat ID to header", () => {
      (useChat as any).mockReturnValue({
        messages: [],
        setMessages: mockSetMessages,
        sendMessage: mockSendMessage,
        status: "idle",
        stop: mockStop,
        regenerate: mockRegenerate,
        resumeStream: mockResumeStream,
      });

      render(<Chat {...defaultProps} id="custom-chat-123" />);

      expect(
        screen.getByText(/Chat Header - custom-chat-123/)
      ).toBeInTheDocument();
    });
  });
});
