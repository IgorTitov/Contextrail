/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of starter-app-spec in this repository.
 * @sidecar starter-app.spec.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import path from 'node:path';
import { test, expect } from './fixtures.mjs';
import { layout } from '../../apps/starter/layout/ui-selectors.mjs';
import { themeToggle } from '../../apps/starter/theme-toggle/ui-selectors.mjs';
import { languagePicker } from '../../apps/starter/language-picker/ui-selectors.mjs';
import { notifications } from '../../apps/starter/notifications/ui-selectors.mjs';
import { loading } from '../../apps/starter/loading-states/ui-selectors.mjs';
import { errorBoundary } from '../../apps/starter/error-boundary/ui-selectors.mjs';

const fixture = path.resolve('tests/e2e/starter-app.html');

test('layout skeleton renders header, main, footer', async ({ page }) => {
  await page.goto(`file://${fixture}`);
  await expect(page.getByTestId(layout.header)).toBeVisible();
  await expect(page.getByTestId(layout.main)).toBeVisible();
  await expect(page.getByTestId(layout.footer)).toBeVisible();
});

test('skip-to-content link is present', async ({ page }) => {
  await page.goto(`file://${fixture}`);
  const skipLink = page.getByTestId(layout.skipLink);
  await expect(skipLink).toBeAttached();
  await expect(skipLink).toHaveText('Skip to content');
});

test('language picker is rendered', async ({ page }) => {
  await page.goto(`file://${fixture}`);
  const select = page.getByTestId(languagePicker.select);
  await expect(select).toBeVisible();
  await expect(select).toHaveValue('en');
});

test('theme toggle button is rendered', async ({ page }) => {
  await page.goto(`file://${fixture}`);
  const button = page.getByTestId(themeToggle.button);
  await expect(button).toBeVisible();
});

test('theme toggle cycles through themes', async ({ page }) => {
  await page.goto(`file://${fixture}`);
  const button = page.getByTestId(themeToggle.button);

  // Initial state is 'system' — click to go to 'light'
  await button.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  // Click to go to 'dark'
  await button.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  // Click to go back to 'system' (removes data-theme)
  await button.click();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme');
});

test('notification buttons show toasts', async ({ page }) => {
  await page.goto(`file://${fixture}`);

  await page.getByTestId('notif-info').click();
  await expect(page.getByTestId(notifications.toast).first()).toBeVisible();
  await expect(page.getByTestId(notifications.toast).first()).toContainText('info notification');
});

test('toast can be dismissed', async ({ page }) => {
  await page.goto(`file://${fixture}`);

  await page.getByTestId('notif-error').click();
  const toast = page.getByTestId(notifications.toast).first();
  await expect(toast).toBeVisible();

  await page.getByTestId(notifications.closeButton).first().click();
  await expect(page.getByTestId(notifications.toast)).toHaveCount(0);
});

test('skeleton placeholders are rendered', async ({ page }) => {
  await page.goto(`file://${fixture}`);
  const skeletons = page.getByTestId(loading.skeleton);
  await expect(skeletons.first()).toBeAttached();
});

test('loading overlay shows spinner', async ({ page }) => {
  await page.goto(`file://${fixture}`);
  await expect(page.getByTestId(loading.overlay)).toBeVisible();
  await expect(page.getByTestId(loading.spinner)).toBeVisible();
});

test('error boundary shows fallback and retry works', async ({ page }) => {
  await page.goto(`file://${fixture}`);

  await page.getByTestId('trigger-error').click();
  await expect(page.getByTestId(errorBoundary.container)).toBeVisible();
  await expect(page.getByTestId(errorBoundary.title)).toHaveText('Something went wrong');

  await page.getByTestId(errorBoundary.retryButton).click();
  await expect(page.getByTestId('error-demo')).toContainText('Recovered');
});

test('footer shows copyright', async ({ page }) => {
  await page.goto(`file://${fixture}`);
  await expect(page.getByTestId(layout.footer)).toContainText('2026');
});
