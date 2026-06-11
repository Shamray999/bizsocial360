import { test, expect } from '@playwright/test';

test.describe('dashboard', () => {
  test('renders the header and key sections', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'BizSocial360', level: 1 })).toBeVisible();
    await expect(page.getByText('Connected accounts')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Engagement summary' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Best times to publish' })).toBeVisible();
  });

  test('shows a data-source status badge', async ({ page }) => {
    await page.goto('/');
    // The badge reads either "Live data" or the demo-data fallback message.
    await expect(page.getByText(/Live data|Demo data/)).toBeVisible();
  });
});
