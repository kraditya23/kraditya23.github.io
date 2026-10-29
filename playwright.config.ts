import { defineConfig, devices } from '@playwright/test';

// E2E tests run against a production build. A dummy Formspree ID renders the form;
// the tests intercept every request to formspree.io.
export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4322',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npx astro build && npx astro preview --port 4322 --ignore-lock',
    url: 'http://localhost:4322',
    env: { PUBLIC_FORMSPREE_ID: 'e2e-test-form' },
    reuseExistingServer: false,
    timeout: 180_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
