const { test, expect } = require('@playwright/test');

test.describe('VisionBoard Smoke Tests', () => {
  test('should load the main page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Vision Board/i);
  });

  test('should display the canvas', async ({ page }) => {
    await page.goto('/');
    const canvas = page.locator('#canvas');
    await expect(canvas).toBeVisible();
  });

  test('should display the sidebar toggle', async ({ page }) => {
    await page.goto('/');
    const sidebarToggle = page.locator('#sidebar-toggle');
    await expect(sidebarToggle).toBeVisible();
  });

  test('should display the upload button', async ({ page }) => {
    await page.goto('/');
    const uploadBtn = page.locator('#upload-btn');
    await expect(uploadBtn).toBeVisible();
  });
});
