import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,

  use: {
    baseURL: process.env.API_BASE_URL || 'http://localhost:5000',
    headless: true,
  },
});
