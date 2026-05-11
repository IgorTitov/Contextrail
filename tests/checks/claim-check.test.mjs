/* @HEADER
 * @version 0.8.8 | 2026-05-11
 * @purpose Meta-test: pin MAX_TTL_HOURS and MAX_TARGETS trust constants in scripts/checks/claim-check.mjs. (CG-C2-1, TPL-241)
 * @sidecar claim-check.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_TTL_HOURS, MAX_TARGETS } from '../../scripts/checks/claim-check.mjs';

describe('claim-check trust constants (CG-C2-1, TPL-241)', () => {
  test('MAX_TTL_HOURS === 168 (7 days)', () => {
    assert.equal(MAX_TTL_HOURS, 168);
  });

  test('MAX_TARGETS === 100', () => {
    assert.equal(MAX_TARGETS, 100);
  });
});
