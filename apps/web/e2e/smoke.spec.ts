import { expect, test } from '@playwright/test';

test.describe('Web Smoke', () => {
  test('courses page loads', async ({ page }) => {
    await page.goto('/courses', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/courses/);
    await expect(page.locator('body')).toBeVisible();
  });
});

