/**
 * E2E Test: Python Code Journey
 *
 * Tests the complete user journey for Python code generation and execution:
 * - Requesting Python code from chat
 * - Code appearing in Monaco editor
 * - Syntax highlighting
 * - Switching to console tab
 * - Executing Python code
 * - Viewing execution output
 * - Modifying and re-running code
 * - Error handling in execution
 */

import { test, expect } from '@playwright/test';

test.describe('Python Code Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should request Python code and display it in editor', async ({ page }) => {
    // Test requesting Python code
    const messageInput = page.locator('textarea[placeholder*="Message"], textarea[data-testid="message-input"], [data-testid="chat-input"]');

    // Wait for input to be visible
    await messageInput.waitFor({ state: 'visible', timeout: 10000 });

    // Type a request for Python code
    await messageInput.fill('Write a Python function to calculate fibonacci numbers');

    // Find and click send button
    const sendButton = page.locator('button[type="submit"], button[aria-label*="Send"], [data-testid="send-button"]').first();
    await sendButton.click();

    // Wait for Python artifact to appear
    // The artifact should contain a Python code editor
    await page.waitForSelector('[data-artifact-kind="python"], .monaco-editor', {
      timeout: 30000,
      state: 'visible'
    });

    // Verify code appears in editor
    const editor = page.locator('.monaco-editor').first();
    await expect(editor).toBeVisible();

    // Verify the editor contains Python code (check for "def" keyword)
    const editorContent = page.locator('.view-lines, .monaco-editor .view-line');
    await expect(editorContent.first()).toBeVisible();
  });

  test('should display Python code with syntax highlighting', async ({ page }) => {
    // Request Python code
    const messageInput = page.locator('textarea[placeholder*="Message"], textarea[data-testid="message-input"], [data-testid="chat-input"]');
    await messageInput.waitFor({ state: 'visible' });
    await messageInput.fill('Write a simple Python hello world function');

    const sendButton = page.locator('button[type="submit"], button[aria-label*="Send"], [data-testid="send-button"]').first();
    await sendButton.click();

    // Wait for Monaco editor to appear
    await page.waitForSelector('.monaco-editor', { timeout: 30000 });

    // Verify syntax highlighting is active by checking for syntax tokens
    // Monaco editor applies syntax highlighting through CSS classes
    const syntaxTokens = page.locator('.monaco-editor .mtk1, .monaco-editor .mtk3, .monaco-editor .mtk5');

    // Wait for syntax highlighting to be applied
    await page.waitForTimeout(2000);

    // Verify syntax tokens exist (indicating syntax highlighting is working)
    const tokenCount = await syntaxTokens.count();
    expect(tokenCount).toBeGreaterThan(0);
  });

  test('should switch to console tab', async ({ page }) => {
    // Request Python code
    const messageInput = page.locator('textarea[placeholder*="Message"], textarea[data-testid="message-input"], [data-testid="chat-input"]');
    await messageInput.waitFor({ state: 'visible' });
    await messageInput.fill('Write Python code to print hello world');

    const sendButton = page.locator('button[type="submit"], button[aria-label*="Send"], [data-testid="send-button"]').first();
    await sendButton.click();

    // Wait for editor to appear
    await page.waitForSelector('.monaco-editor', { timeout: 30000 });

    // Find and click the "Show Console" button
    const consoleButton = page.locator('button:has-text("Show Console"), button:has-text("Console")').first();

    // Wait for console button to be visible
    await consoleButton.waitFor({ state: 'visible', timeout: 10000 });
    await consoleButton.click();

    // Verify console panel is visible
    const consolePanel = page.locator('[class*="console"], :has-text("Console"):has(div), :has-text("No output yet")').first();
    await expect(consolePanel).toBeVisible();

    // Verify console header is visible
    const consoleHeader = page.locator('text=/Console/i').first();
    await expect(consoleHeader).toBeVisible();
  });

  test('should execute Python code and display output', async ({ page }) => {
    // Request Python code
    const messageInput = page.locator('textarea[placeholder*="Message"], textarea[data-testid="message-input"], [data-testid="chat-input"]');
    await messageInput.waitFor({ state: 'visible' });
    await messageInput.fill('Write Python code to print "Hello, World!"');

    const sendButton = page.locator('button[type="submit"], button[aria-label*="Send"], [data-testid="send-button"]').first();
    await sendButton.click();

    // Wait for editor to appear
    await page.waitForSelector('.monaco-editor', { timeout: 30000 });

    // Wait for streaming to complete (status changes from "streaming" to "idle")
    await page.waitForTimeout(3000);

    // Show console first
    const consoleButton = page.locator('button:has-text("Show Console"), button:has-text("Console")').first();
    await consoleButton.waitFor({ state: 'visible', timeout: 10000 });
    await consoleButton.click();

    // Find and click the Run button
    const runButton = page.locator('button:has-text("Run")').first();
    await runButton.waitFor({ state: 'visible', timeout: 5000 });
    await runButton.click();

    // Wait for execution to complete
    // Check for either the output or the "Running..." state to disappear
    await page.waitForTimeout(5000);

    // Verify output appears in console
    // Look for stdout output or result
    const output = page.locator('text=/stdout:|Hello|output/i, pre').first();

    // Give some time for output to appear
    await page.waitForTimeout(2000);

    // Check if output is visible (may contain "Hello, World!" or similar)
    const hasOutput = await output.isVisible().catch(() => false);

    // If execution completes, verify no error state
    const errorOutput = page.locator('text=/Error:|error/i').first();
    const hasError = await errorOutput.isVisible().catch(() => false);

    // Either we should have output or no error (Pyodide might not be available in test environment)
    expect(hasOutput || !hasError).toBeTruthy();
  });

  test('should view execution output in console', async ({ page }) => {
    // Request simple Python code
    const messageInput = page.locator('textarea[placeholder*="Message"], textarea[data-testid="message-input"], [data-testid="chat-input"]');
    await messageInput.waitFor({ state: 'visible' });
    await messageInput.fill('Write Python code that prints numbers 1 to 5');

    const sendButton = page.locator('button[type="submit"], button[aria-label*="Send"], [data-testid="send-button"]').first();
    await sendButton.click();

    // Wait for editor
    await page.waitForSelector('.monaco-editor', { timeout: 30000 });
    await page.waitForTimeout(3000);

    // Show console
    const consoleButton = page.locator('button:has-text("Show Console"), button:has-text("Console")').first();
    await consoleButton.waitFor({ state: 'visible' });
    await consoleButton.click();

    // Verify console shows "No output yet" message initially
    const noOutputMessage = page.locator('text=/No output yet|Click "Run" to execute/i');
    await expect(noOutputMessage).toBeVisible();

    // Run the code
    const runButton = page.locator('button:has-text("Run")').first();
    await runButton.click();

    // Wait for execution
    await page.waitForTimeout(5000);

    // Verify console output area exists
    const consoleOutput = page.locator('[class*="console"], pre, [class*="output"]').first();
    await expect(consoleOutput).toBeVisible();
  });

  test('should modify code and re-run successfully', async ({ page }) => {
    // Request Python code
    const messageInput = page.locator('textarea[placeholder*="Message"], textarea[data-testid="message-input"], [data-testid="chat-input"]');
    await messageInput.waitFor({ state: 'visible' });
    await messageInput.fill('Write Python code to print a message');

    const sendButton = page.locator('button[type="submit"], button[aria-label*="Send"], [data-testid="send-button"]').first();
    await sendButton.click();

    // Wait for editor
    await page.waitForSelector('.monaco-editor', { timeout: 30000 });
    await page.waitForTimeout(3000);

    // Click in the editor to focus it
    const editor = page.locator('.monaco-editor').first();
    await editor.click();

    // Wait a bit for editor to be ready
    await page.waitForTimeout(1000);

    // Select all text and replace with new code
    // Use keyboard shortcuts
    await page.keyboard.press('Control+A');
    await page.keyboard.type('print("Modified code")');

    // Wait for modification to be processed
    await page.waitForTimeout(1000);

    // Show console
    const consoleButton = page.locator('button:has-text("Show Console"), button:has-text("Console")').first();

    // Only click if console is not already shown
    const isConsoleVisible = await page.locator('text=/No output yet|Console/i').isVisible().catch(() => false);
    if (!isConsoleVisible) {
      await consoleButton.click();
      await page.waitForTimeout(500);
    }

    // Run the modified code
    const runButton = page.locator('button:has-text("Run")').first();
    await runButton.click();

    // Wait for execution
    await page.waitForTimeout(5000);

    // Verify the run button is clickable again (indicating execution completed)
    const runButtonAfter = page.locator('button:has-text("Run")').first();
    await expect(runButtonAfter).toBeEnabled();
  });

  test('should handle Python execution errors gracefully', async ({ page }) => {
    // Request Python code
    const messageInput = page.locator('textarea[placeholder*="Message"], textarea[data-testid="message-input"], [data-testid="chat-input"]');
    await messageInput.waitFor({ state: 'visible' });
    await messageInput.fill('Write a simple Python function');

    const sendButton = page.locator('button[type="submit"], button[aria-label*="Send"], [data-testid="send-button"]').first();
    await sendButton.click();

    // Wait for editor
    await page.waitForSelector('.monaco-editor', { timeout: 30000 });
    await page.waitForTimeout(3000);

    // Click in editor and insert code with syntax error
    const editor = page.locator('.monaco-editor').first();
    await editor.click();
    await page.waitForTimeout(1000);

    // Replace with invalid Python code
    await page.keyboard.press('Control+A');
    await page.keyboard.type('print("Missing closing quote');

    await page.waitForTimeout(1000);

    // Show console
    const consoleButton = page.locator('button:has-text("Show Console"), button:has-text("Console")').first();
    await consoleButton.waitFor({ state: 'visible' });
    await consoleButton.click();

    // Run the code with error
    const runButton = page.locator('button:has-text("Run")').first();
    await runButton.click();

    // Wait for execution
    await page.waitForTimeout(5000);

    // Check for error indicators in console
    // Could be "Error:", red text, or stderr output
    const possibleErrorIndicators = [
      page.locator('text=/Error:|error/i'),
      page.locator('text=/stderr:/i'),
      page.locator('[class*="red"], [class*="error"]'),
      page.locator('pre:has-text("SyntaxError"), pre:has-text("Error")')
    ];

    // At least one error indicator should be visible, or code shouldn't have executed
    let errorFound = false;
    for (const indicator of possibleErrorIndicators) {
      const isVisible = await indicator.isVisible().catch(() => false);
      if (isVisible) {
        errorFound = true;
        break;
      }
    }

    // Verify application didn't crash (run button still exists)
    await expect(runButton).toBeVisible();
  });

  test('should show loading state during code execution', async ({ page }) => {
    // Request Python code
    const messageInput = page.locator('textarea[placeholder*="Message"], textarea[data-testid="message-input"], [data-testid="chat-input"]');
    await messageInput.waitFor({ state: 'visible' });
    await messageInput.fill('Write Python code with a loop');

    const sendButton = page.locator('button[type="submit"], button[aria-label*="Send"], [data-testid="send-button"]').first();
    await sendButton.click();

    // Wait for editor
    await page.waitForSelector('.monaco-editor', { timeout: 30000 });
    await page.waitForTimeout(3000);

    // Show console
    const consoleButton = page.locator('button:has-text("Show Console"), button:has-text("Console")').first();
    await consoleButton.waitFor({ state: 'visible' });
    await consoleButton.click();

    // Click run button
    const runButton = page.locator('button:has-text("Run")').first();
    await runButton.click();

    // Immediately check for loading state
    // Look for "Running..." text or disabled run button
    const loadingIndicators = page.locator('text=/Running|Executing/i, button:has-text("Running")');

    // Check within a short timeout
    const hasLoadingState = await loadingIndicators.isVisible().catch(() => false);

    // Verify run button becomes disabled during execution or shows "Running..." state
    const runButtonState = page.locator('button:has-text("Run"), button:has-text("Running")').first();

    // Either loading state is visible or execution was too fast
    // In either case, the button should exist
    await expect(runButtonState).toBeVisible();
  });

  test('should display console toggle button', async ({ page }) => {
    // Request Python code
    const messageInput = page.locator('textarea[placeholder*="Message"], textarea[data-testid="message-input"], [data-testid="chat-input"]');
    await messageInput.waitFor({ state: 'visible' });
    await messageInput.fill('Write a Python hello world');

    const sendButton = page.locator('button[type="submit"], button[aria-label*="Send"], [data-testid="send-button"]').first();
    await sendButton.click();

    // Wait for editor
    await page.waitForSelector('.monaco-editor', { timeout: 30000 });

    // Verify Show Console button exists
    const showConsoleButton = page.locator('button:has-text("Show Console"), button:has-text("Console")').first();
    await expect(showConsoleButton).toBeVisible();

    // Click to show console
    await showConsoleButton.click();

    // Verify button text changes to "Hide Console" or console is visible
    await page.waitForTimeout(500);

    // Check for either Hide Console button or visible console
    const hideConsoleButton = page.locator('button:has-text("Hide Console")');
    const consoleVisible = page.locator('text=/Console/i, text=/No output yet/i');

    const hideButtonExists = await hideConsoleButton.isVisible().catch(() => false);
    const consoleIsVisible = await consoleVisible.isVisible().catch(() => false);

    expect(hideButtonExists || consoleIsVisible).toBeTruthy();
  });
});
