/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove the sample traceability-id helper with dependency-free unit assertions.
 * @sidecar traceability-id.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTraceabilityId } from './traceability-id.mjs';

test('normalizeTraceabilityId trims, uppercases, and hyphenates spaces', () => {
  assert.equal(normalizeTraceabilityId(' tpl-003 '), 'TPL-003');
  assert.equal(normalizeTraceabilityId('feature smoke'), 'FEATURE-SMOKE');
});
