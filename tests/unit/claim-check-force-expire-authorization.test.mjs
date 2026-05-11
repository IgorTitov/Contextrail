/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Meta-test: pin MIN_FORCE_EXPIRE_AGE_MINUTES constant in scripts/checks/claim-check.mjs. (CG-F1-1, TPL-241)
 * @sidecar claim-check-force-expire-authorization.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { MIN_FORCE_EXPIRE_AGE_MINUTES } from '../../scripts/checks/claim-check.mjs';

describe('claim-check force-expire authorization constants (CG-F1-1, TPL-241)', () => {
  test('MIN_FORCE_EXPIRE_AGE_MINUTES === 5', () => {
    assert.equal(MIN_FORCE_EXPIRE_AGE_MINUTES, 5);
  });
});
