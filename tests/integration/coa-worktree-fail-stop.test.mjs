/* @HEADER
 * @version 0.7.113 | 2026-05-06
 * @purpose Integration tests proving that coa-worktree --create emits explicit STOP guidance on branch-already-exists (ADR-0035, TPL-306 / ZVX-DEV-101 defence).
 * @sidecar coa-worktree-fail-stop.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * coa-worktree fail-stop integration tests (TPL-306 / ADR-0035).
 *
 * Proves that when `--create --slice=X` is called and branch X already exists:
 *   1. Exit code is 1.
 *   2. Output contains "STOP".
 *   3. Output contains "escalate".
 *   4. Output contains recovery option text.
 *   5. Registered worktree path appears in the message when the branch is a
 *      registered worktree.
 *   6. Auto-pick (no --slice) on a fresh repo still succeeds (exit 0).
 *
 * All git ops use safeGitSpawn (R1 / ADR-0015). Fixture repos live under
 * os.tmpdir() only.
 *
 * @see docs/adr/0035-coa-worktree-fail-stop.md
 * @see docs/adr/0015-test-isolation-enforcement.md
 */

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { safeGitSpawn } from '../_setup/safe-git.mjs';
import { runCreate } from '../../scripts/coa-worktree.mjs';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeRepo(label) {
  const root = mkdtempSync(join(tmpdir(), `fail-stop-${label}-`));
  safeGitSpawn(root, ['init', '-b', 'main']);
  safeGitSpawn(root, ['config', 'user.email', 'test@fail-stop.local']);
  safeGitSpawn(root, ['config', 'user.name', 'Fail Stop Test']);
  safeGitSpawn(root, ['config', 'commit.gpgsign', 'false']);
  // Write slice-id-config so auto-pick works.
  mkdirSync(join(root, '.coa'), { recursive: true });
  writeFileSync(
    join(root, '.coa', 'slice-id-config.json'),
    JSON.stringify({ prefix: 'FST', padding: 3, numbering_start: 1 }, null, 2),
  );
  mkdirSync(join(root, '.claims'), { recursive: true });
  writeFileSync(join(root, '.claims', '.gitkeep'), '');
  writeFileSync(join(root, 'init.txt'), 'init\n');
  safeGitSpawn(root, ['add', '.']);
  safeGitSpawn(root, ['commit', '-m', 'chore: init']);
  return root;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('coa-worktree fail-stop on branch-already-exists', () => {
  let repoA;
  let repoB;

  before(() => {
    repoA = makeRepo('a');
    repoB = makeRepo('b');
  });

  after(() => {
    if (repoA && existsSync(repoA)) rmSync(repoA, { recursive: true, force: true });
    if (repoB && existsSync(repoB)) rmSync(repoB, { recursive: true, force: true });
  });

  test('exitCode=1 and output contains STOP, escalate, recovery when branch already exists', () => {
    // First create succeeds, creating branch tx-FST-001.
    const first = runCreate(repoA, {
      sliceId: 'FST-001',
      skipSliceCheck: true,
      silent: true,
      trunk: 'main',
    });
    assert.equal(first.exitCode, 0, 'first --create should succeed');

    // Capture stderr from the second call.
    const messages = [];
    const origError = console.error;
    console.error = (...args) => messages.push(args.join(' '));

    let second;
    try {
      second = runCreate(repoA, { sliceId: 'FST-001', skipSliceCheck: true, trunk: 'main' });
    } finally {
      console.error = origError;
    }

    assert.equal(second.exitCode, 1, 'second --create should fail');
    const combined = messages.join('\n') + (second.result?.error ?? '');
    assert.ok(combined.includes('STOP'), 'error message should contain STOP');
    assert.ok(combined.includes('escalate'), 'error message should contain escalate');
    assert.ok(
      combined.includes('node scripts/coa-worktree.mjs --create'),
      'error message should contain auto-pick recovery option',
    );
  });

  test('error message includes existing worktree path when branch is a registered worktree', () => {
    const first = runCreate(repoB, {
      sliceId: 'FST-001',
      skipSliceCheck: true,
      silent: true,
      trunk: 'main',
    });
    assert.equal(first.exitCode, 0, 'first --create should succeed');

    const messages = [];
    const origError = console.error;
    console.error = (...args) => messages.push(args.join(' '));

    let second;
    try {
      second = runCreate(repoB, { sliceId: 'FST-001', skipSliceCheck: true, trunk: 'main' });
    } finally {
      console.error = origError;
    }

    assert.equal(second.exitCode, 1);
    const combined = messages.join('\n') + (second.result?.error ?? '');
    // The message should contain the worktree path (a tmpdir path).
    assert.ok(
      combined.includes('Existing worktree path') || combined.includes(tmpdir().slice(0, 4)),
      'error message should reference the registered worktree path',
    );
  });

  test('auto-pick (no --slice) succeeds on a fresh repo', () => {
    const root = makeRepo('c');
    try {
      const result = runCreate(root, { skipSliceCheck: true, trunk: 'main', silent: true });
      // Auto-pick produces exit 0.
      assert.equal(result.exitCode, 0, 'auto-pick should succeed on fresh repo');
      // No STOP in any output.
      const errMsg = result.result?.error ?? '';
      assert.ok(!errMsg.includes('STOP'), 'auto-pick should not emit STOP');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
