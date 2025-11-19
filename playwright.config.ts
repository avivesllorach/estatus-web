/**
 * Playwright Test Configuration for estatus-web
 *
 * Optimized for:
 * - Parallel execution (4 workers)
 * - Test file isolation (unique config files per worker)
 * - Fast feedback (<5 minutes for full E2E suite)
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Test directory
  testDir: './tests/e2e',

  // Timeout per test (2 minutes max per test)
  timeout: 120000,

  // Fail fast on first failure in CI
  fullyParallel: true,

  // Retry failed tests once in CI
  retries: process.env.CI ? 1 : 0,

  // Parallel workers (4 for optimal speed)
  workers: process.env.CI ? 4 : 4,

  // Reporter configuration
  reporter: [
    ['list'], // Console output
    ['html', { outputFolder: 'playwright-report', open: 'never' }], // HTML report
    ['junit', { outputFile: 'test-results/junit.xml' }], // CI integration
  ],

  // Global test configuration
  use: {
    // Base URL for navigation shortcuts
    baseURL: 'http://localhost:5173',

    // Capture trace on first retry
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on first retry
    video: 'retain-on-failure',

    // Navigation timeout
    navigationTimeout: 30000,

    // Action timeout
    actionTimeout: 10000,
  },

  // Test projects (browsers to run tests on)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Uncomment to test on multiple browsers
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Local dev server (start backend + frontend before tests)
  webServer: [
    {
      command: 'cd backend && npm run dev',
      url: 'http://localhost:3001/health',
      timeout: 30000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      timeout: 30000,
      reuseExistingServer: !process.env.CI,
    },
  ],

  // Output directories
  outputDir: 'test-results',
});
