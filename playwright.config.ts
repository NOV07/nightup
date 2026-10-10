import { defineConfig, devices } from '@playwright/test'

// E2E against a dev server that is already running (`npm run dev`), or the
// URL in TEST_BASE_URL. Tests seed their own throwaway "+deltest-" accounts.
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: [['list']],
  outputDir: process.env.PW_OUTPUT_DIR || 'test-results',
  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
    locale: 'el-GR',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'mobile-390',
      use: { ...devices['iPhone 13'], browserName: 'chromium', viewport: { width: 390, height: 844 } },
    },
  ],
})
