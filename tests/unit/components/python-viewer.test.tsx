/**
 * Unit tests for PythonViewer component
 * Tests code editor rendering, console rendering, execution controls, and syntax highlighting
 */

import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PythonViewer } from "@/components/python-viewer";
import { render, screen, waitFor } from "@/tests/helpers/test-utils";

// Mock Monaco Editor
vi.mock("@monaco-editor/react", () => ({
  Editor: ({ value, onChange, options, theme, defaultLanguage }: any) => (
    <div data-testid="monaco-editor">
      <div data-testid="editor-value">{value}</div>
      <div data-testid="editor-language">{defaultLanguage}</div>
      <div data-testid="editor-theme">{theme}</div>
      <div data-testid="editor-readonly">{String(options?.readOnly)}</div>
      <div data-testid="editor-line-numbers">{options?.lineNumbers}</div>
      <div data-testid="editor-font-size">{options?.fontSize}</div>
      <textarea
        data-testid="editor-textarea"
        onChange={(e) => onChange?.(e.target.value)}
        value={value}
      />
    </div>
  ),
}));

// Mock PythonConsole component
vi.mock("@/components/python-console", () => ({
  PythonConsole: ({ output, isExecuting, onClear }: any) => (
    <div data-testid="python-console">
      <div data-testid="console-executing">{String(isExecuting)}</div>
      {output?.stdout && (
        <div data-testid="console-stdout">{output.stdout}</div>
      )}
      {output?.stderr && (
        <div data-testid="console-stderr">{output.stderr}</div>
      )}
      {output?.error && <div data-testid="console-error">{output.error}</div>}
      {onClear && (
        <button data-testid="console-clear-btn" onClick={onClear}>
          Clear
        </button>
      )}
    </div>
  ),
}));

describe("PythonViewer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Code Editor Rendering", () => {
    it("should render Monaco editor with Python code", () => {
      const code = 'print("Hello, World!")';
      render(<PythonViewer content={code} />);

      const editor = screen.getByTestId("monaco-editor");
      expect(editor).toBeInTheDocument();
      expect(screen.getByTestId("editor-value")).toHaveTextContent(code);
    });

    it("should set Python as the default language", () => {
      render(<PythonViewer content="print('test')" />);

      expect(screen.getByTestId("editor-language")).toHaveTextContent("python");
    });

    it("should use vs-dark theme", () => {
      render(<PythonViewer content="print('test')" />);

      expect(screen.getByTestId("editor-theme")).toHaveTextContent("vs-dark");
    });

    it("should set editor as editable (not read-only)", () => {
      render(<PythonViewer content="print('test')" />);

      expect(screen.getByTestId("editor-readonly")).toHaveTextContent("false");
    });

    it("should enable line numbers", () => {
      render(<PythonViewer content="print('test')" />);

      expect(screen.getByTestId("editor-line-numbers")).toHaveTextContent("on");
    });

    it("should set appropriate font size", () => {
      render(<PythonViewer content="print('test')" />);

      expect(screen.getByTestId("editor-font-size")).toHaveTextContent("14");
    });

    it("should call onChange when content is modified", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      const initialCode = 'print("Hello")';

      render(<PythonViewer content={initialCode} onChange={handleChange} />);

      const textarea = screen.getByTestId("editor-textarea");
      await user.clear(textarea);
      await user.type(textarea, 'print("Modified")');

      expect(handleChange).toHaveBeenCalled();
    });

    it('should display "Generating code..." when streaming with no content', () => {
      render(<PythonViewer content="" status="streaming" />);

      expect(screen.getByText("Generating code...")).toBeInTheDocument();
    });

    it("should show spinner animation when streaming with no content", () => {
      render(<PythonViewer content="" status="streaming" />);

      const spinner =
        screen.getByText("Generating code...").previousElementSibling;
      expect(spinner).toHaveClass("animate-spin");
    });

    it("should display empty state when no content and not streaming", () => {
      render(<PythonViewer content="" status="idle" />);

      expect(screen.getByText("No code content")).toBeInTheDocument();
      expect(
        screen.getByText("Python code will appear here once generated")
      ).toBeInTheDocument();
    });

    it('should show "Generating..." badge when streaming with content', () => {
      render(<PythonViewer content="print('test')" status="streaming" />);

      expect(screen.getByText("Generating...")).toBeInTheDocument();
    });

    it("should show code even when streaming if content exists", () => {
      const code = 'print("test")';
      render(<PythonViewer content={code} status="streaming" />);

      expect(screen.getByTestId("editor-value")).toHaveTextContent(code);
    });
  });

  describe("Console Tab Rendering", () => {
    it("should not show console by default", () => {
      render(<PythonViewer content="print('test')" />);

      expect(screen.queryByTestId("python-console")).not.toBeInTheDocument();
    });

    it('should show console when "Show Console" button is clicked', async () => {
      const user = userEvent.setup();
      render(<PythonViewer content="print('test')" />);

      const showConsoleBtn = screen.getByText("Show Console");
      await user.click(showConsoleBtn);

      expect(screen.getByTestId("python-console")).toBeInTheDocument();
    });

    it("should toggle console visibility when button is clicked", async () => {
      const user = userEvent.setup();
      render(<PythonViewer content="print('test')" />);

      // Show console
      const showBtn = screen.getByText("Show Console");
      await user.click(showBtn);
      expect(screen.getByTestId("python-console")).toBeInTheDocument();

      // Hide console
      const hideBtn = screen.getByText("Hide Console");
      await user.click(hideBtn);
      expect(screen.queryByTestId("python-console")).not.toBeInTheDocument();
    });

    it("should auto-show console when there is stdout output", async () => {
      const { rerender } = render(<PythonViewer content="print('test')" />);

      // Initially no console
      expect(screen.queryByTestId("python-console")).not.toBeInTheDocument();

      // Add execution output
      rerender(
        <PythonViewer
          content="print('test')"
          executionOutput={{ stdout: "test output" }}
        />
      );

      // Console should auto-show
      await waitFor(() => {
        expect(screen.getByTestId("python-console")).toBeInTheDocument();
      });
    });

    it("should auto-show console when there is stderr output", async () => {
      const { rerender } = render(
        <PythonViewer content="import sys; print('error', file=sys.stderr)" />
      );

      rerender(
        <PythonViewer
          content="import sys; print('error', file=sys.stderr)"
          executionOutput={{ stderr: "error output" }}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("python-console")).toBeInTheDocument();
      });
    });

    it("should auto-show console when there is an error", async () => {
      const { rerender } = render(
        <PythonViewer content="raise Exception('Test error')" />
      );

      rerender(
        <PythonViewer
          content="raise Exception('Test error')"
          executionOutput={{ error: "Exception: Test error" }}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("python-console")).toBeInTheDocument();
      });
    });

    it("should auto-show console when there are plots", async () => {
      const { rerender } = render(
        <PythonViewer content="import matplotlib.pyplot as plt" />
      );

      rerender(
        <PythonViewer
          content="import matplotlib.pyplot as plt"
          executionOutput={{ plots: ["base64encodedimage"] }}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("python-console")).toBeInTheDocument();
      });
    });

    it("should pass execution output to PythonConsole component", async () => {
      const output = {
        stdout: "Hello, World!",
        stderr: "Warning message",
        error: "Error occurred",
      };

      const { rerender } = render(<PythonViewer content="print('test')" />);

      rerender(
        <PythonViewer content="print('test')" executionOutput={output} />
      );

      await waitFor(() => {
        expect(screen.getByTestId("console-stdout")).toHaveTextContent(
          output.stdout
        );
        expect(screen.getByTestId("console-stderr")).toHaveTextContent(
          output.stderr
        );
        expect(screen.getByTestId("console-error")).toHaveTextContent(
          output.error
        );
      });
    });

    it("should pass isExecuting state to PythonConsole", async () => {
      const { rerender } = render(<PythonViewer content="print('test')" />);

      rerender(
        <PythonViewer
          content="print('test')"
          executionOutput={{ stdout: "test" }}
          isExecuting={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("console-executing")).toHaveTextContent(
          "true"
        );
      });
    });

    it("should call onClearConsole when clear button is clicked in console", async () => {
      const user = userEvent.setup();
      const handleClearConsole = vi.fn();

      const { rerender } = render(<PythonViewer content="print('test')" />);

      rerender(
        <PythonViewer
          content="print('test')"
          executionOutput={{ stdout: "test output" }}
          onClearConsole={handleClearConsole}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("python-console")).toBeInTheDocument();
      });

      const clearBtn = screen.getByTestId("console-clear-btn");
      await user.click(clearBtn);

      expect(handleClearConsole).toHaveBeenCalledTimes(1);
    });
  });

  describe("Execution Controls", () => {
    it("should render Run button", () => {
      render(<PythonViewer content="print('test')" />);

      expect(screen.getByText("Run")).toBeInTheDocument();
    });

    it("should call onExecute when Run button is clicked", async () => {
      const user = userEvent.setup();
      const handleExecute = vi.fn();

      render(
        <PythonViewer content="print('test')" onExecute={handleExecute} />
      );

      const runBtn = screen.getByText("Run");
      await user.click(runBtn);

      expect(handleExecute).toHaveBeenCalledTimes(1);
    });

    it("should disable Run button when isExecuting is true", () => {
      render(<PythonViewer content="print('test')" isExecuting={true} />);

      const runBtn = screen.getByRole("button", { name: /running/i });
      expect(runBtn).toBeDisabled();
    });

    it('should show "Running..." text when executing', () => {
      render(<PythonViewer content="print('test')" isExecuting={true} />);

      expect(screen.getByText("Running...")).toBeInTheDocument();
    });

    it("should show spinner when executing", () => {
      render(<PythonViewer content="print('test')" isExecuting={true} />);

      const spinner = screen.getByText("Running...").previousElementSibling;
      expect(spinner).toHaveClass("animate-spin");
    });

    it("should enable Run button when not executing", () => {
      render(<PythonViewer content="print('test')" isExecuting={false} />);

      const runBtn = screen.getByText("Run");
      expect(runBtn).not.toBeDisabled();
    });

    it("should render Show Console button", () => {
      render(<PythonViewer content="print('test')" />);

      expect(screen.getByText("Show Console")).toBeInTheDocument();
    });

    it('should change button text to "Hide Console" when console is visible', async () => {
      const user = userEvent.setup();
      render(<PythonViewer content="print('test')" />);

      const showBtn = screen.getByText("Show Console");
      await user.click(showBtn);

      expect(screen.getByText("Hide Console")).toBeInTheDocument();
      expect(screen.queryByText("Show Console")).not.toBeInTheDocument();
    });

    it('should render header with "Python Code" label', () => {
      render(<PythonViewer content="print('test')" />);

      expect(screen.getByText("Python Code")).toBeInTheDocument();
    });

    it("should show play icon in Run button when not executing", () => {
      render(<PythonViewer content="print('test')" />);

      const runBtn = screen.getByText("Run").parentElement;
      const svg = runBtn?.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });

  describe("Syntax Highlighting", () => {
    it("should configure Monaco editor with proper Python syntax highlighting settings", () => {
      render(<PythonViewer content="def hello():\n    print('Hello')" />);

      // Verify Monaco editor is configured with Python language
      expect(screen.getByTestId("editor-language")).toHaveTextContent("python");

      // Verify dark theme is used for better syntax highlighting visibility
      expect(screen.getByTestId("editor-theme")).toHaveTextContent("vs-dark");
    });

    it("should enable syntax-aware features in Monaco editor options", () => {
      render(<PythonViewer content="# Python code" />);

      const editor = screen.getByTestId("monaco-editor");
      expect(editor).toBeInTheDocument();

      // Monaco editor is configured, syntax highlighting is handled by the editor itself
      expect(screen.getByTestId("editor-language")).toHaveTextContent("python");
    });

    it("should display Python code with proper formatting settings", () => {
      const pythonCode = `def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)`;

      render(<PythonViewer content={pythonCode} />);

      // Check that the editor contains the code (whitespace may be collapsed in HTML rendering)
      const editorValue = screen.getByTestId("editor-value");
      expect(editorValue.textContent).toContain("def fibonacci(n):");
      expect(editorValue.textContent).toContain("if n <= 1:");
      expect(screen.getByTestId("editor-font-size")).toHaveTextContent("14");
    });
  });

  describe("Error Handling", () => {
    it("should handle missing onExecute gracefully", async () => {
      const user = userEvent.setup();
      render(<PythonViewer content="print('test')" />);

      const runBtn = screen.getByText("Run");
      await user.click(runBtn);

      // Should not throw error
      expect(runBtn).toBeInTheDocument();
    });

    it("should handle missing onChange gracefully", async () => {
      const user = userEvent.setup();
      render(<PythonViewer content="print('test')" />);

      const textarea = screen.getByTestId("editor-textarea");
      await user.type(textarea, "new code");

      // Should not throw error
      expect(textarea).toBeInTheDocument();
    });

    it("should handle missing onClearConsole gracefully", async () => {
      const _user = userEvent.setup();
      const { rerender } = render(<PythonViewer content="print('test')" />);

      rerender(
        <PythonViewer
          content="print('test')"
          executionOutput={{ stdout: "test" }}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("python-console")).toBeInTheDocument();
      });

      // Should render without clear button if no handler provided
      expect(screen.queryByTestId("console-clear-btn")).not.toBeInTheDocument();
    });

    it("should handle empty content gracefully", () => {
      render(<PythonViewer content="" />);

      expect(screen.getByText("No code content")).toBeInTheDocument();
    });

    it("should render editor even with whitespace-only content", () => {
      render(<PythonViewer content="   \n   \t   " status="idle" />);

      // Component renders editor with whitespace content
      // The trim() check happens but the editor still renders
      expect(screen.getByTestId("monaco-editor")).toBeInTheDocument();
      expect(screen.getByTestId("editor-value")).toBeInTheDocument();
    });
  });

  describe("Component States", () => {
    it("should handle idle state", () => {
      render(<PythonViewer content="print('test')" status="idle" />);

      expect(screen.getByTestId("monaco-editor")).toBeInTheDocument();
      expect(screen.queryByText("Generating...")).not.toBeInTheDocument();
    });

    it("should handle streaming state with content", () => {
      render(<PythonViewer content="print('test')" status="streaming" />);

      expect(screen.getByText("Generating...")).toBeInTheDocument();
      expect(screen.getByTestId("monaco-editor")).toBeInTheDocument();
    });

    it("should adjust layout when console is shown", async () => {
      const user = userEvent.setup();
      render(<PythonViewer content="print('test')" />);

      const showBtn = screen.getByText("Show Console");
      await user.click(showBtn);

      expect(screen.getByTestId("python-console")).toBeInTheDocument();
      expect(screen.getByTestId("monaco-editor")).toBeInTheDocument();
    });
  });

  describe("Integration Tests", () => {
    it("should complete full execution workflow", async () => {
      const user = userEvent.setup();
      const handleExecute = vi.fn();
      const handleChange = vi.fn();

      const { rerender } = render(
        <PythonViewer
          content="print('Hello')"
          onChange={handleChange}
          onExecute={handleExecute}
        />
      );

      // Modify code
      const textarea = screen.getByTestId("editor-textarea");
      await user.clear(textarea);
      await user.type(textarea, 'print("World")');
      expect(handleChange).toHaveBeenCalled();

      // Execute code
      const runBtn = screen.getByText("Run");
      await user.click(runBtn);
      expect(handleExecute).toHaveBeenCalledTimes(1);

      // Simulate execution started
      rerender(
        <PythonViewer
          content='print("World")'
          isExecuting={true}
          onChange={handleChange}
          onExecute={handleExecute}
        />
      );

      expect(screen.getByText("Running...")).toBeInTheDocument();

      // Simulate execution completed with output
      rerender(
        <PythonViewer
          content='print("World")'
          executionOutput={{ stdout: "World\n" }}
          isExecuting={false}
          onChange={handleChange}
          onExecute={handleExecute}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("console-stdout")).toHaveTextContent("World");
      });
    });

    it("should handle error during execution", async () => {
      const user = userEvent.setup();
      const handleExecute = vi.fn();
      const handleError = vi.fn();

      const { rerender } = render(
        <PythonViewer
          content="raise Exception('Test')"
          onError={handleError}
          onExecute={handleExecute}
        />
      );

      const runBtn = screen.getByText("Run");
      await user.click(runBtn);

      rerender(
        <PythonViewer
          content="raise Exception('Test')"
          executionOutput={{ error: "Exception: Test" }}
          onError={handleError}
          onExecute={handleExecute}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("console-error")).toHaveTextContent(
          "Exception: Test"
        );
      });
    });
  });
});
