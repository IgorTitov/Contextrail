/* @HEADER
 * @version 0.7.86 | 2026-05-04
 * @purpose Unit tests for scripts/checks/main-worktree-guard.mjs — isTransportWorktree must correctly classify all 8 fixture paths; --self-test mode must exit 0.
 * @sidecar main-worktree-guard.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// SpecRefs: TPL-276

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { isTransportWorktree } from '../../scripts/checks/main-worktree-guard.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..', '..');
const GUARD = resolve(ROOT, 'scripts', 'checks', 'main-worktree-guard.mjs');

// ---------------------------------------------------------------------------
// isTransportWorktree — pure function, no git, no fs
// ---------------------------------------------------------------------------

describe('isTransportWorktree', () => {
  const cases = [
    // non-transport paths
    { path: '/repos/contextrail-template', expected: false },
    { path: 'C:\\Projects\\contextrail-template', expected: false },
    { path: '/repos/my-project', expected: false },
    { path: '/repos/my-tx-project', expected: false },
    // transport paths
    { path: '/repos/contextrail-template-tx-TPL-276', expected: true },
    { path: 'C:\\Projects\\contextrail-template-tx-TPL-276', expected: true },
    { path: '/repos/ai-cockpit-tx-AIC-DEV-132', expected: true },
    { path: '/repos/zvenix-tx-ZVX-DEV-068', expected: true },
  ];

  for (const { path, expected } of cases) {
    test(`${JSON.stringify(path)} → ${expected}`, () => {
      assert.equal(isTransportWorktree(path), expected);
    });
  }
});

// ---------------------------------------------------------------------------
// --self-test mode — spawns the script, expects exit 0
// ---------------------------------------------------------------------------

describe('--self-test mode', () => {
  test('exits 0 and all cases pass', () => {
    const result = spawnSync(process.execPath, [GUARD, '--self-test'], {
      encoding: 'utf8',
    });
    assert.equal(
      result.status,
      0,
      `Expected exit 0 but got ${result.status}.\nstderr: ${result.stderr}`,
    );
    assert.match(result.stderr, /All \d+ cases passed/, 'Expected "All N cases passed" in stderr');
  });
});
