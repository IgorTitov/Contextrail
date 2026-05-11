/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Playwright smoke proof for the template’s local bootstrap fixture.
 * @sidecar template-bootstrap.spec.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import path from 'node:path';
import { test, expect } from './fixtures.mjs';
import { bootstrap } from '../../apps/starter/ui-selectors.mjs';

const fixture = path.resolve('tests/e2e/template-bootstrap.html');

test('bootstrap smoke fixture renders the expected checklist', async ({ page }) => {
  await page.goto(`file://${fixture}`);
  await expect(page.getByRole('heading', { name: 'Claude Code template bootstrap' })).toBeVisible();
  await expect(page.getByTestId(bootstrap.statusBadge)).toHaveText('Template ready');
  await expect(page.getByTestId(bootstrap.checklist)).toContainText('Install hooks');
  await expect(page.getByTestId(bootstrap.checklist)).toContainText(
    'Run deterministic smoke checks',
  );
});
