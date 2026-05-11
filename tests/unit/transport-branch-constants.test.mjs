/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Meta-test: pin load-bearing constants in scripts/lib/transport-branch.mjs. (CG-R2-5, TPL-241)
 * @sidecar transport-branch-constants.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { MERGING_MARKER_MAX_AGE_MS } from '../../scripts/lib/transport-branch.mjs';

describe('transport-branch constants (CG-R2-5, TPL-241)', () => {
  test('MERGING_MARKER_MAX_AGE_MS === 300000 (5 minutes)', () => {
    assert.equal(MERGING_MARKER_MAX_AGE_MS, 300_000);
  });
});
