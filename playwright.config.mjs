/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Minimal Playwright configuration for the template’s optional visible-behavior smoke proof.
 * @sidecar playwright.config.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { defineConfig } from '@playwright/test';

const slowMo = parseInt(process.env.E2E_SLOWMO, 10);

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  fullyParallel: false,
  retries: 0,
  use: {
    headless: process.env.HEADED !== '1',
    ...(slowMo > 0 ? { launchOptions: { slowMo } } : {}),
  },
});
