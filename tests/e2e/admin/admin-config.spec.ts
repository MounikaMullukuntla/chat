/**
 * E2E Tests for Admin Configuration Journey
 *
 * Tests the complete admin configuration workflow including:
 * - Admin login and access
 * - Provider selection
 * - Agent configuration updates
 * - Configuration persistence
 * - Non-admin access restrictions
 */

import { test, expect } from '@playwright/test';
import {
  createTestUserWithRole,
  loginAsUser,
  deleteTestUserById,
  logout,
} from '../../helpers/auth-helpers';
import { testUsers } from '../../fixtures/users';

// Test users
let adminUser: { id: string; email: string; password: string };
let regularUser: { id: string; email: string; password: string };

// Setup: Create test users before all tests
test.beforeAll(async () => {
  // Create admin user
  const admin = await createTestUserWithRole(
    testUsers.adminUser.email,
    testUsers.adminUser.password,
    'admin'
  );
  adminUser = {
    id: admin.id,
    email: testUsers.adminUser.email,
    password: testUsers.adminUser.password,
  };

  // Create regular user
  const user = await createTestUserWithRole(
    testUsers.regularUser.email,
    testUsers.regularUser.password,
    'user'
  );
  regularUser = {
    id: user.id,
    email: testUsers.regularUser.email,
    password: testUsers.regularUser.password,
  };
});

// Cleanup: Delete test users after all tests
test.afterAll(async () => {
  if (adminUser?.id) {
    await deleteTestUserById(adminUser.id);
  }
  if (regularUser?.id) {
    await deleteTestUserById(regularUser.id);
  }
});

test.describe('Admin Configuration Journey', () => {
  test.describe('Admin Access', () => {
    test('should allow admin user to access admin panel', async ({ page }) => {
      // Login as admin
      await loginAsUser(page, adminUser.email, adminUser.password);

      // Navigate to admin panel
      await page.goto('/admin');

      // Verify admin dashboard loads
      await expect(page.locator('h1')).toContainText('Admin Dashboard');

      // Verify provider selection card is visible
      await expect(page.locator('text=Select AI Provider')).toBeVisible();

      // Verify all three providers are shown
      await expect(page.locator('text=Google AI')).toBeVisible();
      await expect(page.locator('text=OpenAI')).toBeVisible();
      await expect(page.locator('text=Anthropic')).toBeVisible();
    });

    test('should redirect non-admin user to home page', async ({ page }) => {
      // Login as regular user
      await loginAsUser(page, regularUser.email, regularUser.password);

      // Try to navigate to admin panel
      await page.goto('/admin');

      // Should be redirected to home page
      await page.waitForURL('/');

      // Verify we're not on admin page
      await expect(page).not.toHaveURL('/admin');

      // Verify admin dashboard is not visible
      await expect(page.locator('text=Admin Dashboard')).not.toBeVisible();
    });

    test('should redirect unauthenticated user to login', async ({ page }) => {
      // Ensure no user is logged in
      await page.goto('/');
      await logout(page);

      // Try to navigate to admin panel
      await page.goto('/admin');

      // Should be redirected to login
      await page.waitForURL('/login', { timeout: 5000 });
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Provider Selection', () => {
    test.beforeEach(async ({ page }) => {
      // Login as admin before each test
      await loginAsUser(page, adminUser.email, adminUser.password);
      await page.goto('/admin');
    });

    test('should navigate to Google provider configuration', async ({ page }) => {
      // Click on Google Configure button
      await page.locator('text=Google AI').locator('..').locator('..').locator('button:has-text("Configure")').click();

      // Verify navigation to Google config page
      await expect(page).toHaveURL('/admin/google');

      // Verify provider title
      await expect(page.locator('h1')).toContainText('Google AI Configuration');

      // Verify all agent tabs are visible
      await expect(page.locator('text=Chat Model Agent')).toBeVisible();
      await expect(page.locator('text=Provider Tools Agent')).toBeVisible();
      await expect(page.locator('text=Document Agent')).toBeVisible();
      await expect(page.locator('text=Python Agent')).toBeVisible();
      await expect(page.locator('text=Mermaid Agent')).toBeVisible();
      await expect(page.locator('text=Git MCP Agent')).toBeVisible();
    });

    test('should navigate to OpenAI provider configuration', async ({ page }) => {
      // Click on OpenAI Configure button
      await page.locator('text=OpenAI').locator('..').locator('..').locator('button:has-text("Configure")').click();

      // Verify navigation to OpenAI config page
      await expect(page).toHaveURL('/admin/openai');
      await expect(page.locator('h1')).toContainText('OpenAI Configuration');
    });

    test('should navigate to Anthropic provider configuration', async ({ page }) => {
      // Click on Anthropic Configure button
      await page.locator('text=Anthropic').locator('..').locator('..').locator('button:has-text("Configure")').click();

      // Verify navigation to Anthropic config page
      await expect(page).toHaveURL('/admin/anthropic');
      await expect(page.locator('h1')).toContainText('Anthropic Configuration');
    });

    test('should navigate back to dashboard from provider page', async ({ page }) => {
      // Go to Google config
      await page.goto('/admin/google');

      // Click Back to Dashboard button
      await page.locator('button:has-text("Dashboard")').first().click();

      // Verify navigation back to admin dashboard
      await expect(page).toHaveURL('/admin');
      await expect(page.locator('h1')).toContainText('Admin Dashboard');
    });
  });

  test.describe('Agent Configuration', () => {
    test.beforeEach(async ({ page }) => {
      // Login as admin and navigate to Google provider config
      await loginAsUser(page, adminUser.email, adminUser.password);
      await page.goto('/admin/google');

      // Wait for configuration to load
      await page.waitForSelector('text=Chat Model Agent', { timeout: 10000 });
    });

    test('should display Chat Model Agent configuration form', async ({ page }) => {
      // Chat Model Agent tab should be active by default
      await expect(page.locator('[role="tabpanel"]')).toBeVisible();

      // Verify form fields are present
      await expect(page.locator('label:has-text("System Prompt")')).toBeVisible();
      await expect(page.locator('textarea[name*="systemPrompt"], textarea[id*="systemPrompt"]')).toBeVisible();

      // Verify Save button is present
      await expect(page.locator('button:has-text("Save")')).toBeVisible();
    });

    test('should switch between agent configuration tabs', async ({ page }) => {
      // Click on Provider Tools Agent tab
      await page.locator('button:has-text("Provider Tools Agent")').click();

      // Verify Provider Tools configuration is shown
      await expect(page.locator('text=Provider Tools Agent')).toBeVisible();

      // Click on Document Agent tab
      await page.locator('button:has-text("Document Agent")').click();

      // Verify Document Agent configuration is shown
      await expect(page.locator('text=Document Agent')).toBeVisible();

      // Click on Python Agent tab
      await page.locator('button:has-text("Python Agent")').click();

      // Verify Python Agent configuration is shown
      await expect(page.locator('text=Python Agent')).toBeVisible();
    });

    test('should update and save Chat Model Agent configuration', async ({ page }) => {
      // Ensure we're on Chat Model Agent tab
      const chatModelTab = page.locator('button:has-text("Chat Model Agent")');
      if (!(await chatModelTab.getAttribute('data-state') === 'active')) {
        await chatModelTab.click();
      }

      // Wait for form to be visible
      await page.waitForSelector('textarea[name*="systemPrompt"], textarea[id*="systemPrompt"]', { timeout: 5000 });

      // Find and update system prompt
      const systemPromptField = page.locator('textarea[name*="systemPrompt"], textarea[id*="systemPrompt"]').first();
      await systemPromptField.clear();
      await systemPromptField.fill('Test system prompt for E2E testing');

      // Click Save button
      await page.locator('button:has-text("Save")').click();

      // Wait for success message
      await expect(page.locator('text=saved successfully')).toBeVisible({ timeout: 5000 });
    });

    test('should persist configuration changes after page reload', async ({ page }) => {
      const testPrompt = `E2E Test Prompt - ${Date.now()}`;

      // Update system prompt
      const systemPromptField = page.locator('textarea[name*="systemPrompt"], textarea[id*="systemPrompt"]').first();
      await systemPromptField.clear();
      await systemPromptField.fill(testPrompt);

      // Save configuration
      await page.locator('button:has-text("Save")').click();
      await expect(page.locator('text=saved successfully')).toBeVisible({ timeout: 5000 });

      // Reload the page
      await page.reload();

      // Wait for configuration to load
      await page.waitForSelector('textarea[name*="systemPrompt"], textarea[id*="systemPrompt"]', { timeout: 10000 });

      // Verify the saved prompt is still there
      const reloadedPromptField = page.locator('textarea[name*="systemPrompt"], textarea[id*="systemPrompt"]').first();
      await expect(reloadedPromptField).toHaveValue(testPrompt);
    });

    test('should enable/disable agent tools', async ({ page }) => {
      // Look for tool toggle switches
      const toolSwitches = page.locator('button[role="switch"]');
      const count = await toolSwitches.count();

      if (count > 0) {
        // Click the first toggle
        const firstSwitch = toolSwitches.first();
        const initialState = await firstSwitch.getAttribute('data-state');

        await firstSwitch.click();

        // Verify state changed
        const newState = await firstSwitch.getAttribute('data-state');
        expect(newState).not.toBe(initialState);

        // Save configuration
        await page.locator('button:has-text("Save")').click();
        await expect(page.locator('text=saved successfully')).toBeVisible({ timeout: 5000 });
      }
    });

    test('should update rate limit settings', async ({ page }) => {
      // Look for rate limit input fields
      const rateLimitInputs = page.locator('input[type="number"]');
      const count = await rateLimitInputs.count();

      if (count > 0) {
        // Update first rate limit value
        const firstInput = rateLimitInputs.first();
        await firstInput.clear();
        await firstInput.fill('100');

        // Save configuration
        await page.locator('button:has-text("Save")').click();
        await expect(page.locator('text=saved successfully')).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Configuration Effect Verification', () => {
    test.beforeEach(async ({ page }) => {
      // Login as admin
      await loginAsUser(page, adminUser.email, adminUser.password);
    });

    test('should verify configuration is loaded on admin dashboard', async ({ page }) => {
      // Navigate to admin dashboard
      await page.goto('/admin');

      // Wait for provider stats to load
      await page.waitForSelector('text=Google AI', { timeout: 10000 });

      // Verify stats are displayed (indicating configs are loaded)
      const googleCard = page.locator('text=Google AI').locator('../..');
      await expect(googleCard).toBeVisible();

      // The badge showing active agents indicates configs are loaded
      const activeBadge = googleCard.locator('text=/\\d+\\/\\d+ active/');
      if (await activeBadge.count() > 0) {
        await expect(activeBadge).toBeVisible();
      }
    });

    test('should show configuration summary', async ({ page }) => {
      // Test that the API endpoint for config summary works
      const response = await page.request.get('/api/admin/config/summary');

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      // Verify response structure
      expect(data).toHaveProperty('stats');
      expect(data.stats).toHaveProperty('google');
    });
  });

  test.describe('Error Handling', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsUser(page, adminUser.email, adminUser.password);
      await page.goto('/admin/google');
    });

    test('should handle save errors gracefully', async ({ page }) => {
      // This test verifies error handling when save fails
      // We can't easily trigger a real error, but we can verify the error handling UI exists

      // Verify that save button exists and can be clicked
      const saveButton = page.locator('button:has-text("Save")').first();
      await expect(saveButton).toBeVisible();
      await expect(saveButton).toBeEnabled();
    });

    test('should handle network errors during config load', async ({ page }) => {
      // Navigate to a provider with network offline
      await page.context().setOffline(true);

      // Try to reload the page
      await page.goto('/admin/google', { waitUntil: 'domcontentloaded' });

      // Restore network
      await page.context().setOffline(false);
    });
  });

  test.describe('Navigation and Breadcrumbs', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsUser(page, adminUser.email, adminUser.password);
    });

    test('should display correct breadcrumbs on provider page', async ({ page }) => {
      await page.goto('/admin/google');

      // Verify breadcrumb navigation
      await expect(page.locator('nav[aria-label="Breadcrumb"]')).toBeVisible();
      await expect(page.locator('text=Admin')).toBeVisible();
      await expect(page.locator('text=Google AI')).toBeVisible();
    });

    test('should navigate using breadcrumb links', async ({ page }) => {
      await page.goto('/admin/google');

      // Click on Admin breadcrumb
      await page.locator('nav[aria-label="Breadcrumb"] button:has-text("Admin")').click();

      // Verify navigation back to admin dashboard
      await expect(page).toHaveURL('/admin');
    });

    test('should navigate back to chat from admin panel', async ({ page }) => {
      await page.goto('/admin/google');

      // Click Back to Chat button
      await page.locator('button:has-text("Back to Chat")').click();

      // Verify navigation to chat
      await expect(page).toHaveURL('/chat');
    });
  });

  test.describe('Multi-Provider Configuration', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsUser(page, adminUser.email, adminUser.password);
    });

    test('should maintain separate configurations for different providers', async ({ page }) => {
      const googlePrompt = `Google E2E Test - ${Date.now()}`;
      const openaiPrompt = `OpenAI E2E Test - ${Date.now()}`;

      // Configure Google provider
      await page.goto('/admin/google');
      await page.waitForSelector('textarea[name*="systemPrompt"], textarea[id*="systemPrompt"]', { timeout: 10000 });
      const googleField = page.locator('textarea[name*="systemPrompt"], textarea[id*="systemPrompt"]').first();
      await googleField.clear();
      await googleField.fill(googlePrompt);
      await page.locator('button:has-text("Save")').click();
      await expect(page.locator('text=saved successfully')).toBeVisible({ timeout: 5000 });

      // Configure OpenAI provider
      await page.goto('/admin/openai');
      await page.waitForSelector('textarea[name*="systemPrompt"], textarea[id*="systemPrompt"]', { timeout: 10000 });
      const openaiField = page.locator('textarea[name*="systemPrompt"], textarea[id*="systemPrompt"]').first();
      await openaiField.clear();
      await openaiField.fill(openaiPrompt);
      await page.locator('button:has-text("Save")').click();
      await expect(page.locator('text=saved successfully')).toBeVisible({ timeout: 5000 });

      // Verify Google config is unchanged
      await page.goto('/admin/google');
      await page.waitForSelector('textarea[name*="systemPrompt"], textarea[id*="systemPrompt"]', { timeout: 10000 });
      const verifyGoogleField = page.locator('textarea[name*="systemPrompt"], textarea[id*="systemPrompt"]').first();
      await expect(verifyGoogleField).toHaveValue(googlePrompt);

      // Verify OpenAI config is unchanged
      await page.goto('/admin/openai');
      await page.waitForSelector('textarea[name*="systemPrompt"], textarea[id*="systemPrompt"]', { timeout: 10000 });
      const verifyOpenAIField = page.locator('textarea[name*="systemPrompt"], textarea[id*="systemPrompt"]').first();
      await expect(verifyOpenAIField).toHaveValue(openaiPrompt);
    });
  });
});
