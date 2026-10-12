import { defineConfig, devices } from '@playwright/test';

const port = 4300;
// En local, `PLAYWRIGHT_CHANNEL=chrome` utilise le Chrome installé ; la CI utilise le Chromium de Playwright.
const channel = process.env['PLAYWRIGHT_CHANNEL'];

/**
 * Tests end-to-end du web (docs/13). En phase 0 : démarrage et page d'accueil,
 * sur ordinateur et sur téléphone, contre le build de production servi en statique.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    locale: 'fr-FR',
    timezoneId: 'Africa/Douala',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'ordinateur', use: { ...devices['Desktop Chrome'], channel } },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel } },
  ],
  webServer: {
    command: `node e2e/serve-static.mjs ${port}`,
    port,
    reuseExistingServer: !process.env['CI'],
    timeout: 60_000,
  },
});
