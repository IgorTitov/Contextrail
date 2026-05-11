/* @HEADER
 * @version 0.8.13 | 2026-05-11
 * @purpose Unit tests for teardown path resolution and create branch guard in coa-worktree.mjs (TPL-266).
 * @sidecar coa-worktree-paths.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Tests proving two regression fixes (TPL-266):
 *
 *   Bug A — teardown resolves worktree path via git worktree list (not
 *            constructed string), so <repo>-tx-<slice> paths are found
 *            even when the operator passes just "tx-<slice>".
 *
 *   Bug B — runCreate --slice refuses to create a worktree when the
 *            transport branch already exists, preventing orphan-commit
 *            reuse (AIC-118 incident).
 *
 * All git operations use safeGitSpawn (R1 / ADR-0015).
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  writeFileSync,
  existsSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import { safeGitSpawn } from '../_setup/safe-git.mjs';
import {
  runCreate,
  resolveWorktreePath,
  transportWorktreePath,
} from '../../scripts/coa-worktree.mjs';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function createBaseRepo(label) {
  const root = mkdtempSync(join(tmpdir(), `tpl266-${label}-`));
  safeGitSpawn(root, ['init', '-b', 'main']);
  safeGitSpawn(root, ['config', 'user.email', 'test@tpl266.local']);
  safeGitSpawn(root, ['config', 'user.name', 'TPL266 Test']);
  safeGitSpawn(root, ['config', 'commit.gpgsign', 'false']);
  writeFileSync(join(root, 'README.md'), '# fixture\n');
  safeGitSpawn(root, ['add', 'README.md']);
  safeGitSpawn(root, ['commit', '-m', 'init']);
  return root;
}

function cleanupWorktree(mainRoot, wtPath) {
  const nmInWt = join(wtPath, 'node_modules');
  if (existsSync(nmInWt)) {
    try { rmSync(nmInWt, { recursive: false }); } catch {
      try { rmSync(nmInWt, { recursive: true, force: true }); } catch { /* best effort */ }
    }
  }
  try { safeGitSpawn(mainRoot, ['worktree', 'remove', '--force', wtPath]); } catch { /* best effort */ }
  if (existsSync(wtPath)) rmSync(wtPath, { recursive: true, force: true });
  rmSync(mainRoot, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// Bug A — teardown path lookup via git worktree list
// ---------------------------------------------------------------------------

describe('resolveWorktreePath: lookup via git worktree list (Bug A)', () => {
  test('finds worktree by branch name, not by constructed path', () => {
    // Simulate the ZVX-056 scenario: repo is "zvenix", worktree sits at
    // "../.worktrees/zvenix-tx-TEST-001" but operator passes just "tx-TEST-001".
    const mainRoot = createBaseRepo('lookup-by-branch');
    const repoName = basename(mainRoot);
    const wtPath = transportWorktreePath(mainRoot, 'TEST-001');

    try {
      const { exitCode } = runCreate(mainRoot, { sliceId: 'TEST-001', silent: true, skipSliceCheck: true });
      assert.strictEqual(exitCode, 0, 'pre-condition: runCreate must succeed');

      // Worktree lives inside .worktrees/ subdir (TPL-334 / ADR-0050)
      assert.ok(
        wtPath.endsWith(`${repoName}-tx-TEST-001`),
        `Worktree path should carry repo prefix: ${wtPath}`,
      );
      assert.ok(
        wtPath.replaceAll('\\', '/').includes('/.worktrees/'),
        `Worktree path must be inside .worktrees/: ${wtPath}`,
      );

      // resolveWorktreePath must find it by branch name "tx-TEST-001",
      // NOT by constructing a path (old or new location).
      const resolved = resolveWorktreePath(mainRoot, 'tx-TEST-001');
      assert.ok(resolved !== null, 'resolveWorktreePath must find the worktree');
      assert.strictEqual(
        resolved.replaceAll('\\', '/'),
        wtPath.replaceAll('\\', '/'),
        'Resolved path must match the actual worktree path (with repo prefix)',
      );

      // The old sibling path (pre-TPL-334) must NOT be the resolved path.
      const oldSiblingPath = join(mainRoot, '..', `${repoName}-tx-TEST-001`).replaceAll('\\', '/');
      assert.notStrictEqual(
        resolved.replaceAll('\\', '/'),
        oldSiblingPath,
        'Should NOT resolve to the old sibling path outside .worktrees/',
      );
    } finally {
      cleanupWorktree(mainRoot, wtPath);
    }
  });

  test('returns null for an unknown branch name', () => {
    const mainRoot = createBaseRepo('lookup-unknown');
    try {
      const resolved = resolveWorktreePath(mainRoot, 'tx-NONEXISTENT-999');
      assert.strictEqual(resolved, null, 'Should return null for a branch that has no worktree');
    } finally {
      rmSync(mainRoot, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Bug B — create branch reuse guard
// ---------------------------------------------------------------------------

describe('runCreate --slice: branch existence guard (Bug B)', () => {
  test('fails with clear error when transport branch already exists', () => {
    const mainRoot = createBaseRepo('branch-guard');
    // Pre-create the branch without a worktree, simulating a leftover from
    // a prior session (AIC-118 incident pattern).
    safeGitSpawn(mainRoot, ['branch', 'tx-TPL-266']);

    try {
      const { exitCode, result } = runCreate(mainRoot, { sliceId: 'TPL-266', silent: true, skipSliceCheck: true });
      assert.strictEqual(exitCode, 1, 'runCreate must fail when branch exists');
      assert.ok(
        result.error.includes('tx-TPL-266'),
        `Error message should mention the branch name: ${result.error}`,
      );
      assert.ok(
        result.error.includes('STOP'),
        `Error message should contain STOP: ${result.error}`,
      );
      assert.ok(
        result.error.includes('git branch -D'),
        `Error message should hint how to delete: ${result.error}`,
      );
    } finally {
      // Clean up the branch we created, then the repo
      try { safeGitSpawn(mainRoot, ['branch', '-D', 'tx-TPL-266']); } catch { /* best effort */ }
      rmSync(mainRoot, { recursive: true, force: true });
    }
  });

  test('creates worktree on trunk HEAD when branch is fresh (no orphan commits)', () => {
    const mainRoot = createBaseRepo('fresh-branch');
    const wtPath = transportWorktreePath(mainRoot, 'TPL-266');

    try {
      const { exitCode, result } = runCreate(mainRoot, { sliceId: 'TPL-266', silent: true, skipSliceCheck: true });
      assert.strictEqual(exitCode, 0, `runCreate should succeed: ${result?.error}`);
      assert.ok(existsSync(wtPath), 'Transport worktree directory must be created');

      // Verify the worktree HEAD matches trunk HEAD — no orphan commits.
      const trunkHead = safeGitSpawn(mainRoot, ['rev-parse', 'HEAD']).stdout.trim();
      const wtHead = safeGitSpawn(wtPath, ['rev-parse', 'HEAD']).stdout.trim();

      assert.strictEqual(
        wtHead,
        trunkHead,
        `Worktree HEAD (${wtHead}) must match trunk HEAD (${trunkHead}) — no orphan commits`,
      );
    } finally {
      cleanupWorktree(mainRoot, wtPath);
    }
  });
});
