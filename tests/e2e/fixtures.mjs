/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Custom Playwright fixture extending base test with visual cursor overlay and starter app page navigation.
 * @sidecar fixtures.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Custom Playwright fixture for the template's E2E tests.
 *
 * Extends the standard @playwright/test with automatic visual-cursor
 * overlay injection in headed mode. All spec files should import
 * { test, expect } from this module instead of '@playwright/test'.
 *
 * Cursor activation logic:
 *   E2E_CURSOR=1  -> always on  (useful for video recording in headless)
 *   E2E_CURSOR=0  -> always off (headed but no overlay)
 *   not set        -> follows HEADED env var (on when HEADED=1)
 *
 * To customize the cursor appearance, override the page fixture:
 *
 *   import { test as base, expect } from './fixtures.mjs';
 *   import { injectCursorOverlay } from './visual-cursor.mjs';
 *
 *   export { expect };
 *   export const test = base.extend({
 *     page: async ({ page }, use) => {
 *       await injectCursorOverlay(page, { color: '#3b82f6', size: 28 });
 *       await use(page);
 *     },
 *   });
 */

import { test as base, expect } from '@playwright/test';
import { injectCursorOverlay } from './visual-cursor.mjs';

export { expect };

const cursorEnabled =
  process.env.E2E_CURSOR === '1'
    ? true
    : process.env.E2E_CURSOR === '0'
      ? false
      : process.env.HEADED === '1';

export const test = base.extend({
  page: async ({ page }, use) => {
    if (cursorEnabled) {
      await injectCursorOverlay(page);
    }
    await use(page);
  },
});
