/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove the shape and content of the bounded selector registry for the bootstrap starter feature.
 * @sidecar ui-selectors.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { bootstrap } from '../../apps/starter/ui-selectors.mjs';

test('bootstrap registry exports expected selector values', () => {
  assert.equal(bootstrap.statusBadge, 'status-badge');
  assert.equal(bootstrap.checklist, 'bootstrap-checklist');
});

test('bootstrap registry values are all non-empty strings', () => {
  for (const [key, value] of Object.entries(bootstrap)) {
    assert.equal(typeof value, 'string', `${key} should be a string`);
    assert.ok(value.length > 0, `${key} should be non-empty`);
  }
});
