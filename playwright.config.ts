import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  // the store specs write store assets; they only run through npm run store
  testIgnore: process.env.STORE ? [] : ['**/store.spec.ts', '**/store-ios.spec.ts'],
  timeout: 180_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npx vite --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    { name: 'landscape', use: { browserName: 'chromium', viewport: { width: 800, height: 450 } } },
  ],
})
