import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for BizSocial360 end-to-end tests.
 *
 * - Locally (no E2E_BASE_URL): Playwright boots the Next.js dev server and runs
 *   tests against it. The dashboard renders sample data even without the API,
 *   so e2e is self-contained.
 * - In CI against staging: set E2E_BASE_URL to the deployed staging URL; the
 *   webServer is then skipped and tests hit the real environment.
 */
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['list'], ['junit', { outputFile: 'test-results/junit.xml' }], ['html', { open: 'never' }]]
    : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
