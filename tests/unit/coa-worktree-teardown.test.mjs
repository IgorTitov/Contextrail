/* @HEADER
 * @version 0.7.82 | 2026-05-04
 * @purpose TDD tests for unsetStaleCoreWorktree — proves the teardown path cleans stale core.worktree from main .git/config (TPL-269).
 * @sidecar coa-worktree-teardown.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Tests for the unsetStaleCoreWorktree() helper added in TPL-269.
 *
 * Root-cause context: when a linked worktree is torn down, stale
 * `core.worktree` can survive in the main repo's .git/config, causing
 * `git status` to fail for every subsequent session (AIC-088 incident,
 * 2026-05-04). This suite proves the defensive cleanup runs correctly
 * in all three cases: stale-missing, matches-removed, and still-valid.
 *
 * All git invocations use safeGit/safeGitSpawn (R1, ADR-0015).
 * All repos are created under os.tmpdir().
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  rmSync,
  readFileSync,
  realpathSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { safeGitSpawn } from '../_setup/safe-git.mjs';
import {
  unsetStaleCoreWorktree,
} from '../../scripts/coa-worktree.mjs';

// ---------------------------------------------------------------------------
// Fixture helper
// ---------------------------------------------------------------------------

function createBaseRepo(label) {
  const root = mkdtempSync(join(tmpdir(), `tpl269-${label}-`));
  safeGitSpawn(root, ['init', '-b', 'main']);
  safeGitSpawn(root, ['config', 'user.email', 'test@tpl269.local']);
  safeGitSpawn(root, ['config', 'user.name', 'TPL269 Test']);
  safeGitSpawn(root, ['config', 'commit.gpgsign', 'false']);
  writeFileSync(join(root, 'README.md'), '# fixture\n');
  safeGitSpawn(root, ['add', 'README.md']);
  safeGitSpawn(root, ['commit', '-m', 'init']);
  return root;
}

function setConfigValue(repoRoot, key, value) {
  safeGitSpawn(repoRoot, ['config', '--local', key, value]);
}

function getConfigValue(repoRoot, key) {
  const { stdout, status } = safeGitSpawn(repoRoot, ['config', '--local', '--get', key], { capture: true });
  if (status !== 0) return null;
  return stdout.trim();
}

// ---------------------------------------------------------------------------
// unsetStaleCoreWorktree: not set → returns not-set, no error
// ---------------------------------------------------------------------------

describe('unsetStaleCoreWorktree: core.worktree not set', () => {
  test('returns { unset: false, reason: "not-set" } when core.worktree is absent', () => {
    const root = createBaseRepo('no-cw');
    try {
      const r = unsetStaleCoreWorktree(root, '/some/path');
      assert.strictEqual(r.unset, false);
      assert.strictEqual(r.reason, 'not-set');
      assert.strictEqual(r.value, null);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// unsetStaleCoreWorktree: points to missing path → unsets
// ---------------------------------------------------------------------------

describe('unsetStaleCoreWorktree: points to nonexistent path', () => {
  test('unsets core.worktree when it points to a missing directory', () => {
    const root = createBaseRepo('missing-path');
    const stalePath = join(tmpdir(), 'tpl269-NONEXISTENT-' + Date.now());
    // Confirm the path does not exist
    assert.ok(!existsSync(stalePath), 'stale path should not exist for this test');
    setConfigValue(root, 'core.worktree', stalePath);
    try {
      const r = unsetStaleCoreWorktree(root, undefined);
      assert.strictEqual(r.unset, true, `Expected unset=true, got reason: ${r.reason}`);
      assert.ok(
        r.reason === 'points-to-missing-path' || r.reason === 'matches-removed-worktree',
        `Unexpected reason: ${r.reason}`,
      );
      // Verify the config key is actually gone
      const remaining = getConfigValue(root, 'core.worktree');
      assert.strictEqual(remaining, null, 'core.worktree should be absent from config after unset');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('unsets core.worktree when removedPath matches the configured value', () => {
    const root = createBaseRepo('matches-removed');
    const removedPath = join(tmpdir(), 'tpl269-old-worktree-' + Date.now());
    // The path doesn't need to exist — it was just removed
    setConfigValue(root, 'core.worktree', removedPath);
    try {
      const r = unsetStaleCoreWorktree(root, removedPath);
      assert.strictEqual(r.unset, true, `Expected unset=true, got reason: ${r.reason}`);
      const remaining = getConfigValue(root, 'core.worktree');
      assert.strictEqual(remaining, null, 'core.worktree should be gone after matching-path unset');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// unsetStaleCoreWorktree: points to existing path (not removed) → leave alone
// ---------------------------------------------------------------------------

describe('unsetStaleCoreWorktree: points to still-valid path', () => {
  test('does NOT unset core.worktree when path exists and does not match removedPath', () => {
    const root = createBaseRepo('still-valid');
    // Create a directory that represents a live worktree
    const liveWorktree = mkdtempSync(join(tmpdir(), 'tpl269-live-'));
    setConfigValue(root, 'core.worktree', liveWorktree);
    const otherRemovedPath = join(tmpdir(), 'tpl269-some-other-path-' + Date.now());
    try {
      const r = unsetStaleCoreWorktree(root, otherRemovedPath);
      assert.strictEqual(r.unset, false, 'Should not unset when path still exists and does not match removed');
      assert.strictEqual(r.reason, 'points-to-existing-path');
      // Verify the config key is still set
      const remaining = getConfigValue(root, 'core.worktree');
      assert.strictEqual(remaining, liveWorktree, 'core.worktree should still be set to liveWorktree');
    } finally {
      rmSync(liveWorktree, { recursive: true, force: true });
      rmSync(root, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// teardownWorktree integration: core.worktree is cleaned up after teardown
// ---------------------------------------------------------------------------

describe('teardownWorktree: cleans stale core.worktree from main config', () => {
  test('unsets core.worktree pointing to now-removed worktree path', () => {
    // This test manually simulates the corruption scenario:
    // 1. Create a base repo
    // 2. Set core.worktree in its .git/config to a path we will "teardown"
    // 3. The path doesn't need to be a real worktree for this unit test —
    //    we just set the config key to a missing path and prove unsetStaleCoreWorktree
    //    (called during teardown) cleans it.
    const root = createBaseRepo('td-integration');
    const phantomPath = join(tmpdir(), 'tpl269-phantom-' + Date.now());
    setConfigValue(root, 'core.worktree', phantomPath);

    assert.ok(!existsSync(phantomPath), 'phantom path should not exist');

    try {
      // Call unsetStaleCoreWorktree directly (same call teardownWorktree will make)
      const r = unsetStaleCoreWorktree(root, phantomPath);
      assert.strictEqual(r.unset, true);

      // Confirm git status would succeed in the main repo (no stale worktree confusion)
      const { status } = safeGitSpawn(root, ['status', '--short'], { capture: true });
      assert.strictEqual(status, 0, 'git status should succeed after core.worktree is cleaned');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// R1 isolation regression — TPL-274 / ZVX-064
//
// Root cause: git sets GIT_COMMON_DIR in the hook environment when running
// pre-commit inside a linked worktree. If GIT_COMMON_DIR is not scrubbed,
// git fixture commits write objects/refs to the live repo's .git even when
// cwd is in tmpdir.
//
// This describe-block proves:
// 1. createBaseRepo() always produces a repo under os.tmpdir().
// 2. GIT_COMMON_DIR is absent from process.env when tests run (either the
//    pre-commit hook unset it before phase 7, or we're not in a hook context).
// ---------------------------------------------------------------------------

describe('R1 isolation invariants (TPL-274 regression)', () => {
  test('createBaseRepo() root is under os.tmpdir()', () => {
    const root = createBaseRepo('isolation-check');
    try {
      const real = realpathSync(root);
      const tmp = realpathSync(tmpdir());
      assert.ok(
        real === tmp || real.startsWith(tmp + '\\') || real.startsWith(tmp + '/'),
        `createBaseRepo root must be under os.tmpdir().\n  root: ${real}\n  tmp: ${tmp}`,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('GIT_COMMON_DIR is absent from process.env during test execution', () => {
    // If this fails it means the test runner was invoked from a context where
    // git set GIT_COMMON_DIR (e.g. a pre-commit hook running inside a linked
    // worktree) and the phase-7 unset or no-live-git scrub did not remove it.
    // This is the exact vector that caused ZVX-064 fixture commit contamination.
    const val = process.env.GIT_COMMON_DIR;
    assert.ok(
      val === undefined || val === '',
      `GIT_COMMON_DIR must be absent from process.env during tests. Got: ${val}\n` +
      'This env var causes git to write objects/refs to the live repo even with cwd in tmpdir. ' +
      'Check that pre-commit Phase 7 unsets GIT_COMMON_DIR and that no-live-git.mjs scrubs it.',
    );
  });
});
