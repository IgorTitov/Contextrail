/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Meta-test: assert NON_SKIPPABLE_PHASES in .githooks/pre-commit contains the load-bearing phases 2.5, 2.7, and 7. (CG-R1-3, TPL-241)
 * @sidecar pre-commit-non-skippable.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const HOOK = join(REPO_ROOT, '.githooks', 'pre-commit');

function parseNonSkippablePhases(src) {
  const match = src.match(/^NON_SKIPPABLE_PHASES="([^"]+)"/m);
  if (!match) return null;
  return match[1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

describe('NON_SKIPPABLE_PHASES — meta-test (CG-R1-3, TPL-241)', () => {
  const src = readFileSync(HOOK, 'utf8');
  const phases = parseNonSkippablePhases(src);

  test('NON_SKIPPABLE_PHASES line is present and parseable', () => {
    assert.ok(phases !== null, 'NON_SKIPPABLE_PHASES definition not found in pre-commit hook');
  });

  test('phase 2.5 (R1 test-isolation) is non-skippable', () => {
    assert.ok(phases.includes('2.5'), `Expected 2.5 in [${phases.join(', ')}]`);
  });

  test('phase 2.7 (R2 transport-branch) is non-skippable', () => {
    assert.ok(phases.includes('2.7'), `Expected 2.7 in [${phases.join(', ')}]`);
  });

  test('phase 7 (heavy gates: test-gate + changelog-sync) is non-skippable', () => {
    assert.ok(phases.includes('7'), `Expected 7 in [${phases.join(', ')}]`);
  });
});
