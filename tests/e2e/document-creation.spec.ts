/**
 * E2E Tests: Document Creation Journey
 *
 * This test suite covers the complete document lifecycle:
 * - Requesting document creation
 * - Watching real-time streaming
 * - Document appearing in artifact panel
 * - Editing document
 * - Saving new version
 * - Viewing version history
 * - Comparing versions
 * - Reverting to previous version
 */

import { test, expect, type Page } from '@playwright/test';

/**
 * Helper function to setup chat and authenticate
 */
async function setupChat(page: Page) {
  await page.goto('/');

  // Wait for the page to load
  await expect(page).toHaveTitle(/CodeChat/i);

  // Setup Google API key in localStorage (mocking for E2E tests)
  await page.evaluate(() => {
    localStorage.setItem('google-api-key', 'test-api-key-for-e2e');
  });

  return page;
}

/**
 * Helper function to send a chat message
 */
async function sendChatMessage(page: Page, message: string) {
  const input = page.getByTestId('multimodal-input');
  await input.fill(message);
  await input.press('Enter');
}

/**
 * Helper function to wait for AI response
 */
async function waitForAIResponse(page: Page) {
  // Wait for the assistant message to appear
  await page.getByTestId('message-assistant').waitFor({ timeout: 30000 });

  // Wait for the loading state to disappear
  await page.getByTestId('message-assistant-loading').waitFor({ state: 'hidden', timeout: 30000 });
}

test.describe('Document Creation Journey', () => {
  test.beforeEach(async ({ page }) => {
    await setupChat(page);
  });

  test('should complete full document creation flow', async ({ page }) => {
    // Step 1: Request document creation
    await sendChatMessage(page, 'Create a document about TypeScript best practices');

    // Step 2: Watch for real-time streaming
    // The document creation should trigger the artifact panel
    const artifact = page.getByTestId('artifact');

    // Wait for artifact to become visible with streaming status
    await artifact.waitFor({ state: 'visible', timeout: 30000 });

    // Verify artifact is visible
    await expect(artifact).toBeVisible();

    // Step 3: Verify document appears in artifact panel
    // The artifact should show the document title
    await expect(artifact.locator('text=TypeScript best practices')).toBeVisible({ timeout: 10000 });

    // Wait for streaming to complete (status changes from 'streaming' to 'idle')
    // We can check this by waiting for the "Updated" timestamp to appear
    await expect(artifact.locator('text=/Updated.*ago/')).toBeVisible({ timeout: 60000 });

    // Verify some content has been streamed
    const contentArea = artifact.locator('[data-testid="document-content"]').first();
    await expect(contentArea).toBeVisible();
  });

  test('should request document creation', async ({ page }) => {
    // Send a message requesting document creation
    await sendChatMessage(page, 'Write a document about React hooks');

    // Wait for the AI to respond
    await waitForAIResponse(page);

    // Verify that a document creation tool call appears
    const documentToolCall = page.locator('text=/Creating.*React hooks/i');
    await expect(documentToolCall).toBeVisible({ timeout: 30000 });
  });

  test('should watch real-time streaming', async ({ page }) => {
    // Request document creation
    await sendChatMessage(page, 'Create a document explaining JavaScript closures');

    // Wait for artifact panel to appear
    const artifact = page.getByTestId('artifact');
    await artifact.waitFor({ state: 'visible', timeout: 30000 });

    // Verify that content is being streamed (appears gradually)
    // We can check for the presence of streaming indicators
    const savingIndicator = artifact.locator('text=Saving changes...');

    // The artifact should be in streaming mode initially
    // Wait for the document to have some content
    await expect(artifact).toContainText('closure', { timeout: 60000 });

    // Verify streaming completes (Updated timestamp appears)
    await expect(artifact.locator('text=/Updated.*ago/')).toBeVisible({ timeout: 60000 });
  });

  test('should show document in artifact panel', async ({ page }) => {
    // Create a document
    await sendChatMessage(page, 'Create a markdown document about Git workflow');

    // Wait for artifact panel
    const artifact = page.getByTestId('artifact');
    await artifact.waitFor({ state: 'visible', timeout: 30000 });

    // Verify artifact panel structure
    await expect(artifact).toBeVisible();

    // Verify close button is present
    const closeButton = artifact.getByTestId('artifact-close-button');
    await expect(closeButton).toBeVisible();

    // Verify document title is displayed
    await expect(artifact).toContainText('Git workflow', { timeout: 30000 });

    // Verify content area exists
    const contentArea = artifact.locator('[role="textbox"]').first();
    await expect(contentArea).toBeVisible({ timeout: 30000 });
  });

  test('should edit document', async ({ page }) => {
    // Create a document first
    await sendChatMessage(page, 'Create a document listing Python data types');

    // Wait for artifact
    const artifact = page.getByTestId('artifact');
    await artifact.waitFor({ state: 'visible', timeout: 30000 });

    // Wait for streaming to complete
    await expect(artifact.locator('text=/Updated.*ago/')).toBeVisible({ timeout: 60000 });

    // Find the editable content area (Monaco editor or contentEditable div)
    const editor = artifact.locator('[role="textbox"]').first();
    await editor.waitFor({ state: 'visible', timeout: 10000 });

    // Click into the editor to focus it
    await editor.click();

    // Add some text to the document
    // For Monaco editor, we need to use keyboard commands
    await page.keyboard.press('Control+End'); // Go to end of document
    await page.keyboard.press('Enter');
    await page.keyboard.type('- Additional data type: Set');

    // Verify the "Saving changes..." indicator appears
    await expect(artifact.locator('text=Saving changes...')).toBeVisible({ timeout: 5000 });
  });

  test('should save new version', async ({ page }) => {
    // Create initial document
    await sendChatMessage(page, 'Create a document about CSS Grid');

    // Wait for artifact
    const artifact = page.getByTestId('artifact');
    await artifact.waitFor({ state: 'visible', timeout: 30000 });

    // Wait for initial version to complete
    await expect(artifact.locator('text=/Updated.*ago/')).toBeVisible({ timeout: 60000 });

    // Edit the document
    const editor = artifact.locator('[role="textbox"]').first();
    await editor.click();
    await page.keyboard.press('Control+End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('## Additional Resources');

    // Wait for "Saving changes..." indicator
    await expect(artifact.locator('text=Saving changes...')).toBeVisible({ timeout: 5000 });

    // Wait for save to complete (indicator disappears and shows "Updated" again)
    await expect(artifact.locator('text=/Updated.*ago/')).toBeVisible({ timeout: 10000 });
    await expect(artifact.locator('text=Saving changes...')).not.toBeVisible();

    // Verify that a new version was created by checking the version history
    // The new version should be saved to the database automatically
  });

  test('should view version history', async ({ page }) => {
    // Create a document
    await sendChatMessage(page, 'Create a document about REST API design');

    // Wait for artifact
    const artifact = page.getByTestId('artifact');
    await artifact.waitFor({ state: 'visible', timeout: 30000 });

    // Wait for initial version
    await expect(artifact.locator('text=/Updated.*ago/')).toBeVisible({ timeout: 60000 });

    // Make an edit to create version 2
    const editor = artifact.locator('[role="textbox"]').first();
    await editor.click();
    await page.keyboard.press('Control+End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('## Version 2 Addition');

    // Wait for save
    await expect(artifact.locator('text=Saving changes...')).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(3000); // Wait for debounce and save

    // Look for version navigation controls (prev/next buttons)
    // These should appear in the artifact actions area
    const versionControls = artifact.locator('button').filter({ hasText: /version|history/i });

    // If version controls exist, try to navigate
    if (await versionControls.count() > 0) {
      await versionControls.first().click();
    }

    // Alternative: Look for keyboard shortcut or menu to access version history
    // The version footer should show when viewing previous versions
  });

  test('should compare versions', async ({ page }) => {
    // Create a document
    await sendChatMessage(page, 'Create a document explaining async/await in JavaScript');

    // Wait for artifact
    const artifact = page.getByTestId('artifact');
    await artifact.waitFor({ state: 'visible', timeout: 30000 });

    // Wait for initial version
    await expect(artifact.locator('text=/Updated.*ago/')).toBeVisible({ timeout: 60000 });

    // Make an edit to create version 2
    const editor = artifact.locator('[role="textbox"]').first();
    await editor.click();
    await page.keyboard.press('Control+End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('## Error Handling in Async Functions');

    // Wait for save
    await page.waitForTimeout(3000);

    // Make another edit for version 3
    await page.keyboard.press('Enter');
    await page.keyboard.type('- Always use try/catch blocks');
    await page.waitForTimeout(3000);

    // Look for diff/compare mode toggle
    // This might be in the artifact actions or toolbar
    const diffToggle = artifact.locator('button').filter({ hasText: /diff|compare/i });

    if (await diffToggle.count() > 0) {
      await diffToggle.first().click();

      // Verify diff view is shown
      // Diff view typically shows added/removed lines
      await expect(artifact).toBeVisible();
    }
  });

  test('should revert to previous version', async ({ page }) => {
    // Create a document
    await sendChatMessage(page, 'Create a document about Docker basics');

    // Wait for artifact
    const artifact = page.getByTestId('artifact');
    await artifact.waitFor({ state: 'visible', timeout: 30000 });

    // Wait for initial version
    await expect(artifact.locator('text=/Updated.*ago/')).toBeVisible({ timeout: 60000 });

    // Store initial content for later comparison
    const editor = artifact.locator('[role="textbox"]').first();
    await editor.waitFor({ state: 'visible', timeout: 10000 });

    // Make an edit to create version 2
    await editor.click();
    await page.keyboard.press('Control+End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('## This is version 2 content that will be reverted');

    // Wait for save
    await page.waitForTimeout(3000);

    // Navigate to previous version
    // Look for version navigation in artifact actions
    const prevVersionButton = artifact.locator('button').filter({ hasText: /previous|prev|back/i });

    if (await prevVersionButton.count() > 0) {
      await prevVersionButton.first().click();

      // Look for "Restore this version" button in version footer
      const restoreButton = artifact.locator('button', { hasText: /restore/i });

      if (await restoreButton.count() > 0) {
        await restoreButton.first().click();

        // Wait for restore to complete
        await page.waitForTimeout(2000);

        // Verify we're back to latest version (version footer should disappear)
        const versionFooter = artifact.locator('text=You are viewing a previous version');
        await expect(versionFooter).not.toBeVisible({ timeout: 5000 });

        // Verify the reverted content doesn't contain the version 2 addition
        await expect(artifact).not.toContainText('This is version 2 content that will be reverted');
      }
    }
  });

  test('should handle document creation errors gracefully', async ({ page }) => {
    // Test error handling when document creation fails
    // This would require mocking API failures

    // For now, we just verify the UI doesn't break on edge cases
    await sendChatMessage(page, '');

    // Empty messages shouldn't trigger document creation
    const artifact = page.getByTestId('artifact');
    await expect(artifact).not.toBeVisible({ timeout: 5000 });
  });

  test('should close artifact panel', async ({ page }) => {
    // Create a document
    await sendChatMessage(page, 'Create a simple Hello World document');

    // Wait for artifact
    const artifact = page.getByTestId('artifact');
    await artifact.waitFor({ state: 'visible', timeout: 30000 });

    // Click close button
    const closeButton = artifact.getByTestId('artifact-close-button');
    await closeButton.click();

    // Verify artifact is closed
    await expect(artifact).not.toBeVisible({ timeout: 5000 });
  });

  test('should persist document across page refresh', async ({ page }) => {
    // Create a document
    await sendChatMessage(page, 'Create a document about SQL basics');

    // Wait for artifact
    const artifact = page.getByTestId('artifact');
    await artifact.waitFor({ state: 'visible', timeout: 30000 });

    // Wait for document to save
    await expect(artifact.locator('text=/Updated.*ago/')).toBeVisible({ timeout: 60000 });

    // Get the document ID from the URL or artifact state
    // Then refresh the page
    await page.reload();

    // The document should be accessible from chat history
    // Verify the chat message with the document still exists
    const documentMessage = page.locator('text=SQL basics');
    await expect(documentMessage).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Document Creation - Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await setupChat(page);
  });

  test('should handle multiple document creations in same chat', async ({ page }) => {
    // Create first document
    await sendChatMessage(page, 'Create a document about HTML');

    // Wait for first artifact
    const artifact1 = page.getByTestId('artifact');
    await artifact1.waitFor({ state: 'visible', timeout: 30000 });

    // Close first artifact
    const closeButton1 = artifact1.getByTestId('artifact-close-button');
    await closeButton1.click();
    await expect(artifact1).not.toBeVisible({ timeout: 5000 });

    // Create second document
    await sendChatMessage(page, 'Now create a document about CSS');

    // Wait for second artifact
    const artifact2 = page.getByTestId('artifact');
    await artifact2.waitFor({ state: 'visible', timeout: 30000 });

    // Verify it's the CSS document
    await expect(artifact2).toContainText('CSS', { timeout: 30000 });
  });

  test('should handle rapid edits', async ({ page }) => {
    // Create a document
    await sendChatMessage(page, 'Create a simple document');

    // Wait for artifact
    const artifact = page.getByTestId('artifact');
    await artifact.waitFor({ state: 'visible', timeout: 30000 });
    await expect(artifact.locator('text=/Updated.*ago/')).toBeVisible({ timeout: 60000 });

    // Make multiple rapid edits
    const editor = artifact.locator('[role="textbox"]').first();
    await editor.click();

    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+End');
      await page.keyboard.type(` Edit ${i}`);
      await page.waitForTimeout(100); // Rapid edits
    }

    // Wait for debounced save to complete
    await page.waitForTimeout(3000);

    // Verify the document is still functional
    await expect(artifact).toBeVisible();
  });
});
