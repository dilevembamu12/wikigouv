import { expect, test } from '@playwright/test';

test.describe('Visual Baselines', () => {
  async function stabilizePageForSnapshot(page: import('@playwright/test').Page) {
    await page.addStyleTag({
      content: `
        * { animation: none !important; transition: none !important; caret-color: transparent !important; }
        [data-dynamic], .time, .date, .clock, .countdown, .notification-badge, .toast, .swal2-container { visibility: hidden !important; }
      `
    });
  }

  test('courses page snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/courses', { waitUntil: 'networkidle' });
    await stabilizePageForSnapshot(page);
    await expect(page).toHaveScreenshot('courses-page.png', {
      fullPage: false,
      animations: 'disabled',
      maxDiffPixelRatio: 0.01
    });
  });

  test('learning page snapshot (optional)', async ({ page }) => {
    const learningPath = process.env.E2E_LEARNING_PATH;
    test.skip(!learningPath, 'Set E2E_LEARNING_PATH to enable learning page visual checks.');
    await page.goto(String(learningPath), { waitUntil: 'networkidle' });
    await page.setViewportSize({ width: 1920, height: 1080 });
    await stabilizePageForSnapshot(page);
    await expect(page).toHaveScreenshot('learning-page.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.01
    });
  });
});
