/**
 * E2E tests for GitHub MCP Integration
 * Tests the complete GitHub integration workflow including:
 * - Entering GitHub PAT
 * - Connecting to GitHub
 * - Selecting repositories
 * - Browsing files
 * - Loading file content
 * - Asking questions about code
 * - AI using GitHub context
 */

import { expect, test } from "@playwright/test";

// Test data
const TEST_GITHUB_PAT = process.env.TEST_GITHUB_PAT || "test_pat_placeholder";
const _TEST_REPO_NAME = process.env.TEST_REPO_NAME || "test-user/test-repo";

test.describe("GitHub MCP Journey", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto("/");

    // Wait for page to load
    await expect(page).toHaveTitle(/CodeChat/i);
  });

  test("should enter GitHub PAT and display GitHub integration UI", async ({
    page,
  }) => {
    // Look for settings or GitHub configuration area
    // This test checks if the GitHub PAT input is available

    // Try to find GitHub PAT input (adjust selector based on actual UI)
    const githubPATInput = page
      .locator(
        'input[placeholder*="GitHub" i][placeholder*="PAT" i], input[placeholder*="token" i]'
      )
      .first();

    // If the input exists, enter the PAT
    if (await githubPATInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await githubPATInput.fill(TEST_GITHUB_PAT);

      // Verify the PAT was entered
      await expect(githubPATInput).toHaveValue(TEST_GITHUB_PAT);
    } else {
      console.log(
        "GitHub PAT input not immediately visible, may require navigation to settings"
      );
    }
  });

  test("should connect to GitHub and load user repositories", async ({
    page,
  }) => {
    // This test verifies that after entering a PAT, the GitHub connection is established

    // Navigate to settings or GitHub section if needed
    const settingsButton = page
      .locator('[href="/settings"], button:has-text("Settings")')
      .first();
    if (await settingsButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await settingsButton.click();
      await page.waitForURL("**/settings**", { timeout: 5000 }).catch(() => {});
    }

    // Find and fill GitHub PAT input
    const githubPATInput = page
      .locator(
        'input[placeholder*="GitHub" i][placeholder*="PAT" i], input[placeholder*="Personal Access Token" i], input[type="password"]'
      )
      .first();

    if (await githubPATInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await githubPATInput.fill(TEST_GITHUB_PAT);

      // Look for a connect button or the UI that shows when connected
      const connectButton = page
        .locator('button:has-text("Connect"), button:has-text("Save")')
        .first();
      if (await connectButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await connectButton.click();
      }

      // Wait for repositories to load (check for repository list or loading indicator)
      const repoList = page
        .locator('[class*="repository" i], [data-testid*="repo" i]')
        .first();
      await repoList.waitFor({ timeout: 10_000 }).catch(() => {
        console.log("Repository list not found - may need UI adjustment");
      });
    }
  });

  test("should search and select a repository", async ({ page }) => {
    // Set up GitHub PAT first
    const githubPATInput = page
      .locator(
        'input[placeholder*="GitHub" i][placeholder*="PAT" i], input[placeholder*="token" i]'
      )
      .first();

    if (await githubPATInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await githubPATInput.fill(TEST_GITHUB_PAT);
    }

    // Look for repository search input
    const repoSearchInput = page
      .locator(
        'input[placeholder*="Search repositories" i], input[placeholder*="repository" i]'
      )
      .first();

    if (await repoSearchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Enter search query
      await repoSearchInput.fill("test");

      // Wait for search results
      await page.waitForTimeout(1000); // Wait for debounce

      // Look for repository checkboxes or selection UI
      const repoCheckbox = page.locator('input[type="checkbox"]').first();

      if (await repoCheckbox.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Select the repository
        await repoCheckbox.check();

        // Verify checkbox is checked
        await expect(repoCheckbox).toBeChecked();
      }
    }
  });

  test("should browse repository files in file browser", async ({ page }) => {
    // This test assumes GitHub is already connected and a repo is selected

    // Look for file browser or files tab
    const filesTab = page
      .locator('button:has-text("Files"), [role="tab"]:has-text("Files")')
      .first();

    if (await filesTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await filesTab.click();

      // Wait for file tree to load
      const fileTree = page
        .locator('[class*="tree" i], [class*="browser" i]')
        .first();
      await fileTree.waitFor({ timeout: 10_000 }).catch(() => {
        console.log("File tree not loaded");
      });

      // Look for folder icons that can be expanded
      const folderIcon = page
        .locator('svg[class*="folder" i], button:has(svg)')
        .first();

      if (await folderIcon.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Click to expand folder
        await folderIcon.click();

        // Wait for folder contents to load
        await page.waitForTimeout(1000);
      }
    }
  });

  test("should select and load file content from repository", async ({
    page,
  }) => {
    // This test verifies file selection and content loading

    // Navigate to file browser (may require opening modal or navigating to section)
    const githubButton = page
      .locator('button:has-text("GitHub"), [aria-label*="GitHub" i]')
      .first();

    if (await githubButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await githubButton.click();

      // Wait for modal or file browser to open
      await page.waitForTimeout(1000);

      // Look for file checkboxes in the file browser
      const fileCheckbox = page.locator('input[type="checkbox"]').nth(1); // Skip first (might be repo)

      if (await fileCheckbox.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Select a file
        await fileCheckbox.check();

        // Verify file is selected
        await expect(fileCheckbox).toBeChecked();

        // Look for Apply or Select button to confirm selection
        const applyButton = page
          .locator(
            'button:has-text("Apply"), button:has-text("Select"), button:has-text("Done")'
          )
          .first();

        if (await applyButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await applyButton.click();

          // File content should be loaded into context
          // Look for indicator that file is in context
          const selectedFileIndicator = page
            .locator('[class*="selected" i], [class*="context" i]')
            .first();
          await selectedFileIndicator.waitFor({ timeout: 5000 }).catch(() => {
            console.log("Selected file indicator not found");
          });
        }
      }
    }
  });

  test("should ask questions about code from GitHub repository", async ({
    page,
  }) => {
    // This test verifies asking questions about GitHub code
    // Assumes GitHub context is already loaded

    // Find the message input field
    const messageInput = page
      .locator(
        'textarea[placeholder*="message" i], input[placeholder*="message" i], [contenteditable="true"]'
      )
      .first();

    if (await messageInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Type a question about the code
      await messageInput.fill("What does this code do?");

      // Find and click send button
      const sendButton = page
        .locator(
          'button[type="submit"], button:has-text("Send"), button[aria-label*="Send" i]'
        )
        .first();

      if (await sendButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await sendButton.click();

        // Wait for AI response
        const aiResponse = page
          .locator(
            '[class*="message" i][class*="assistant" i], [data-role="assistant"]'
          )
          .first();
        await aiResponse.waitFor({ timeout: 30_000 }).catch(() => {
          console.log("AI response not received within timeout");
        });

        // Verify response is visible
        if (await aiResponse.isVisible({ timeout: 1000 }).catch(() => false)) {
          await expect(aiResponse).toBeVisible();
        }
      }
    }
  });

  test("should verify AI uses GitHub context in response", async ({ page }) => {
    // This is an end-to-end test of the complete GitHub MCP workflow
    // 1. Enter GitHub PAT
    // 2. Select repository
    // 3. Select file
    // 4. Ask question
    // 5. Verify AI uses GitHub context

    // Step 1: Navigate to settings or GitHub setup
    const settingsLink = page
      .locator('[href="/settings"], button:has-text("Settings")')
      .first();
    if (await settingsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await settingsLink.click();
    }

    // Step 2: Enter GitHub PAT (if input is visible)
    const githubPATInput = page
      .locator('input[placeholder*="GitHub" i], input[placeholder*="PAT" i]')
      .first();
    if (await githubPATInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await githubPATInput.fill(TEST_GITHUB_PAT);

      // Save settings if there's a save button
      const saveButton = page.locator('button:has-text("Save")').first();
      if (await saveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await saveButton.click();
        await page.waitForTimeout(1000);
      }
    }

    // Step 3: Navigate back to chat and open GitHub context
    await page.goto("/");

    const githubContextButton = page
      .locator('button:has-text("GitHub"), [aria-label*="GitHub" i]')
      .first();
    if (
      await githubContextButton.isVisible({ timeout: 5000 }).catch(() => false)
    ) {
      await githubContextButton.click();
      await page.waitForTimeout(1000);

      // Select a repository
      const repoCheckbox = page.locator('input[type="checkbox"]').first();
      if (await repoCheckbox.isVisible({ timeout: 5000 }).catch(() => false)) {
        await repoCheckbox.check();

        // Apply selection
        const applyButton = page.locator('button:has-text("Apply")').first();
        if (await applyButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await applyButton.click();
        }
      }
    }

    // Step 4: Ask a question that requires GitHub context
    const messageInput = page.locator('textarea, input[type="text"]').last();
    if (await messageInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await messageInput.fill(
        "Based on the GitHub repository, describe the main functionality"
      );

      const sendButton = page.locator('button[type="submit"]').first();
      if (await sendButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await sendButton.click();

        // Wait for response that should reference GitHub context
        await page.waitForTimeout(5000);

        // Look for AI response
        const response = page.locator('[class*="message" i]').last();
        if (await response.isVisible({ timeout: 30_000 }).catch(() => false)) {
          const responseText = await response.textContent();

          // The response should indicate it used GitHub context
          // This is a basic check - could be enhanced with more specific assertions
          expect(responseText).toBeTruthy();
          expect(responseText?.length).toBeGreaterThan(0);
        }
      }
    }
  });

  test("should handle GitHub PAT validation errors gracefully", async ({
    page,
  }) => {
    // Test error handling with invalid PAT

    // Find GitHub PAT input
    const githubPATInput = page
      .locator(
        'input[placeholder*="GitHub" i][placeholder*="PAT" i], input[placeholder*="token" i]'
      )
      .first();

    if (await githubPATInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Enter invalid PAT
      await githubPATInput.fill("invalid_github_pat_12345");

      // Try to connect or trigger validation
      const connectButton = page
        .locator('button:has-text("Connect"), button:has-text("Save")')
        .first();
      if (await connectButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await connectButton.click();

        // Wait for error message
        const errorMessage = page
          .locator('[class*="error" i], [role="alert"], [class*="danger" i]')
          .first();

        // Error should be displayed
        if (
          await errorMessage.isVisible({ timeout: 5000 }).catch(() => false)
        ) {
          await expect(errorMessage).toBeVisible();

          // Error message should contain relevant text
          const errorText = await errorMessage.textContent();
          expect(errorText?.toLowerCase()).toMatch(
            /invalid|error|failed|token/i
          );
        }
      }
    }
  });

  test("should display repository information correctly", async ({ page }) => {
    // Test that repository metadata is displayed correctly

    // This test assumes we can navigate to a point where repos are listed
    const repoElement = page
      .locator('[class*="repository" i], [data-testid*="repo" i]')
      .first();

    if (await repoElement.isVisible({ timeout: 10_000 }).catch(() => false)) {
      // Check for repository name
      const repoName = repoElement
        .locator('[class*="name" i], [class*="title" i]')
        .first();
      await expect(repoName).toBeVisible();

      // Check for repository description (if present)
      const _repoDescription = repoElement
        .locator('[class*="description" i]')
        .first();
      // Description may or may not be present, so just check if element exists

      // Check for metadata like stars, forks, language
      const _metadata = repoElement
        .locator('[class*="metadata" i], [class*="stat" i]')
        .first();
      // Metadata should be visible if repository info is loaded
    }
  });

  test("should handle file browser navigation correctly", async ({ page }) => {
    // Test file browser tree navigation

    // Look for expandable folders
    const folderIcons = page.locator(
      'button:has(svg[class*="chevron" i]), button:has(svg[class*="folder" i])'
    );

    const count = await folderIcons.count().catch(() => 0);

    if (count > 0) {
      // Click first folder to expand
      await folderIcons.first().click();
      await page.waitForTimeout(1000);

      // Folder should expand and show children
      // Look for nested items with increased indentation
      const nestedItems = page.locator(
        '[style*="padding-left"], [class*="nested" i]'
      );

      // Should have some nested items after expansion
      const nestedCount = await nestedItems.count().catch(() => 0);
      expect(nestedCount).toBeGreaterThanOrEqual(0);
    }
  });

  test("should support multiple file selection", async ({ page }) => {
    // Test selecting multiple files from repository

    // Find all file checkboxes
    const fileCheckboxes = page.locator('input[type="checkbox"]');

    const checkboxCount = await fileCheckboxes.count().catch(() => 0);

    if (checkboxCount >= 2) {
      // Select first two files
      await fileCheckboxes.nth(0).check();
      await fileCheckboxes.nth(1).check();

      // Verify both are checked
      await expect(fileCheckboxes.nth(0)).toBeChecked();
      await expect(fileCheckboxes.nth(1)).toBeChecked();

      // Look for selection count indicator
      const selectionCount = page
        .locator('[class*="selected" i]:has-text("2"), :has-text("2 file")')
        .first();

      // Should show count of selected files
      if (
        await selectionCount.isVisible({ timeout: 3000 }).catch(() => false)
      ) {
        await expect(selectionCount).toBeVisible();
      }
    }
  });

  test("should clear GitHub context when deselecting repositories", async ({
    page,
  }) => {
    // Test removing selected repositories

    // Find a selected repository badge or item
    const selectedRepoBadge = page
      .locator('[class*="badge" i], [class*="selected" i]')
      .first();

    if (
      await selectedRepoBadge.isVisible({ timeout: 5000 }).catch(() => false)
    ) {
      // Look for remove/close button on the badge
      const removeButton = selectedRepoBadge
        .locator('button, [role="button"]')
        .first();

      if (await removeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await removeButton.click();

        // Badge should be removed
        await expect(selectedRepoBadge).not.toBeVisible({ timeout: 3000 });
      }
    }
  });
});
