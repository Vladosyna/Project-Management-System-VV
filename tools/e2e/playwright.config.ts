// Browser e2e against the real stack (04-testing §4): PostgreSQL + API + web app, started by global-setup.
import { defineConfig, devices } from '@playwright/test';

export const WEB_PORT = 5174;
export const API_PORT = 3101;

export default defineConfig({
  testDir: './tests',
  globalSetup: './global-setup.ts',
  timeout: 120_000,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${String(WEB_PORT)}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
