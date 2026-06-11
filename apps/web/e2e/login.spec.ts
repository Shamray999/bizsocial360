import { test, expect } from '@playwright/test';

test.describe('login', () => {
  test('shows the sign-in form', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: 'BizSocial360' })).toBeVisible();
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('can switch to the create-account form', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('button', { name: "Don't have an account? Create one" }).click();
    await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();
    await expect(page.getByPlaceholder('Jane Doe')).toBeVisible();
  });
});
