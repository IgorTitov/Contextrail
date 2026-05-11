/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of theme-toggle-test in this repository.
 * @sidecar theme-toggle.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveTheme } from '../../apps/starter/theme-toggle/theme-toggle.mjs';

describe('theme-toggle — resolveTheme()', () => {
  test('returns light when preference is light', () => {
    assert.equal(resolveTheme('light'), 'light');
  });

  test('returns dark when preference is dark', () => {
    assert.equal(resolveTheme('dark'), 'dark');
  });

  test('returns dark when preference is system and media query matches dark', () => {
    const fakeMq = { matches: true };
    assert.equal(resolveTheme('system', fakeMq), 'dark');
  });

  test('returns light when preference is system and media query matches light', () => {
    const fakeMq = { matches: false };
    assert.equal(resolveTheme('system', fakeMq), 'light');
  });

  test('returns light when preference is system and no media query available', () => {
    assert.equal(resolveTheme('system', null), 'light');
  });
});
