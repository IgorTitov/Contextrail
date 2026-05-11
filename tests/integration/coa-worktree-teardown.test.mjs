/* @HEADER
 * @version 0.7.93 | 2026-05-05
 * @purpose Integration tests for --teardown branch-ref cleanup (TPL-285, ADR-0023).
 * @sidecar coa-worktree-teardown.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * TPL-285: --teardown branch-ref cleanup integration tests.
 *
 * Covers four cases:
 *   1. Merged branch — worktree dir AND branch ref deleted.
 *   2. Unmerged branch — worktree dir deleted, branch ref preserved with warning.
 *   3. Worktree dir not found — graceful error (existing guard).
 *   4. Branch ref already gone (manual cleanup) — worktree removed, no error.
 *
 * All git invocations use safeGit / safeGitSpawn (R1, ADR-0015).
 *
 * @see docs/adr/0023-teardown-branch-cleanup.md
 * @see docs/adr/0016-worktree-lifecycle.md
 * @see docs/adr/0015-test-isolation-enforcement.md
 */

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync, writeFileSync, existsSync, rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import { safeGit, safeGitSpawn } from '../_setup/safe-git.mjs';
import { runTeardown } from '../../scripts/coa-worktree.mjs';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function createBaseRepo(label) {
  const root = mkdtempSync(join(tmpdir(), `tpl285-${label}-`));
  safeGitSpawn(root, ['init', '-b', 'main']);
  safeGitSpawn(root, ['config', 'user.email', 'test@tpl285.local']);
  safeGitSpawn(root, ['config', 'user.name', 'TPL285 Test']);
  safeGitSpawn(root, ['config', 'commit.gpgsign', 'false']);
  writeFileSync(join(root, 'README.md'), '# fixture\n');
  safeGitSpawn(root, ['add', 'README.md']);
  safeGitSpawn(root, ['commit', '-m', 'init']);
  return root;
}

function addWorktree(root, branchName) {
  const wtPath = mkdtempSync(join(tmpdir(), `tpl285-wt-${branchName}-`));
  rmSync(wtPath, { recursive: true, force: true });
  safeGitSpawn(root, ['worktree', 'add', '-b', branchName, wtPath, 'main']);
  return wtPath;
}

function commitInWorktree(wtPath, filename, content) {
  writeFileSync(join(wtPath, filename), content);
  safeGitSpawn(wtPath, ['add', filename]);
  safeGitSpawn(wtPath, ['commit', '-m', `add ${filename}`]);
}

function mergeBranchIntoMain(root, branchName) {
  safeGitSpawn(root, ['checkout', 'main']);
  safeGitSpawn(root, ['merge', '--no-ff', '--no-edit', branchName]);
}

function branchExists(root, branchName) {
  const r = safeGitSpawn(root, ['branch', '--list', branchName]);
  return r.stdout.trim().length > 0;
}

// ---------------------------------------------------------------------------
// Case 1: merged tx-branch — both worktree dir and branch ref deleted
// ---------------------------------------------------------------------------

describe('TPL-285 Case 1: --teardown of merged branch deletes worktree dir and branch ref', () => {
  let root, wtPath;
  const branch = 'tx-tpl285-c1';

  before(() => {
    root = createBaseRepo('c1');
    wtPath = addWorktree(root, branch);
    commitInWorktree(wtPath, 'slice.txt', 'done\n');
    mergeBranchIntoMain(root, branch);
    // Checkout main so the branch is not the current branch of any worktree.
    safeGitSpawn(root, ['checkout', 'main']);
  });

  after(() => { if (root) rmSync(root, { recursive: true, force: true }); });

  test('worktree dir is gone after teardown', () => {
    const { exitCode, result } = runTeardown(root, { sessionName: branch, silent: true });
    assert.equal(exitCode, 0, `expected ok; got: ${JSON.stringify(result)}`);
    assert.equal(existsSync(wtPath), false, 'worktree directory must be removed');
  });

  test('branch ref is deleted (merged work → strict -d succeeds)', () => {
    // worktree already torn down in the previous test — branch ref check is independent.
    assert.equal(branchExists(root, branch), false, 'branch ref must be absent after teardown');
  });

  test('result.branchDeleted equals branch name', () => {
    // Re-create fixture since first test already tore it down.
    const root2 = createBaseRepo('c1b');
    const wt2 = addWorktree(root2, branch);
    commitInWorktree(wt2, 'work.txt', 'done\n');
    mergeBranchIntoMain(root2, branch);
    safeGitSpawn(root2, ['checkout', 'main']);
    try {
      const { result } = runTeardown(root2, { sessionName: branch, silent: true });
      assert.equal(result.branchDeleted, branch, 'branchDeleted must be set to the branch name');
      assert.equal(result.branchPreserved, null, 'branchPreserved must be null for merged branch');
    } finally {
      rmSync(root2, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Case 2: unmerged tx-branch — worktree dir deleted, branch ref preserved
// ---------------------------------------------------------------------------

describe('TPL-285 Case 2: --teardown of unmerged branch preserves branch ref with warning', () => {
  let root, wtPath;
  const branch = 'tx-tpl285-c2';

  before(() => {
    root = createBaseRepo('c2');
    wtPath = addWorktree(root, branch);
    // Commit on the branch but do NOT merge into main.
    commitInWorktree(wtPath, 'wip.txt', 'wip\n');
    safeGitSpawn(root, ['checkout', 'main']);
  });

  after(() => { if (root) rmSync(root, { recursive: true, force: true }); });

  test('teardown exits 0 even for unmerged branch (no hard failure)', () => {
    const { exitCode } = runTeardown(root, { sessionName: branch, silent: true });
    assert.equal(exitCode, 0, 'teardown must succeed (exit 0) even when branch is unmerged');
  });

  test('worktree directory is removed', () => {
    assert.equal(existsSync(wtPath), false, 'worktree directory must be removed');
  });

  test('branch ref is preserved (strict -d refused unmerged branch)', () => {
    assert.equal(branchExists(root, branch), true, 'branch ref must survive for unmerged work');
  });

  test('result.branchPreserved equals branch name', () => {
    // Re-create to get a fresh result struct.
    const root2 = createBaseRepo('c2b');
    const wt2 = addWorktree(root2, branch);
    commitInWorktree(wt2, 'wip2.txt', 'wip\n');
    safeGitSpawn(root2, ['checkout', 'main']);
    try {
      const { result } = runTeardown(root2, { sessionName: branch, silent: true });
      assert.equal(result.branchPreserved, branch, 'branchPreserved must be set to branch name');
      assert.equal(result.branchDeleted, null, 'branchDeleted must be null for unmerged branch');
    } finally {
      rmSync(root2, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Case 3: worktree not found — graceful error
// ---------------------------------------------------------------------------

describe('TPL-285 Case 3: --teardown on non-existent worktree returns error', () => {
  let root;

  before(() => { root = createBaseRepo('c3'); });
  after(() => { if (root) rmSync(root, { recursive: true, force: true }); });

  test('exitCode is 1 and error message mentions not found', () => {
    const { exitCode, result } = runTeardown(root, {
      sessionName: 'tx-does-not-exist',
      silent: true,
    });
    assert.equal(exitCode, 1);
    assert.match(result.error, /not found/i);
  });
});

// ---------------------------------------------------------------------------
// Case 4: worktree in detached HEAD (no branch ref) — teardown succeeds silently
// ---------------------------------------------------------------------------

describe('TPL-285 Case 4: --teardown of detached-HEAD worktree — no branch ref, no error', () => {
  let root, wtPath;

  before(() => {
    root = createBaseRepo('c4');
    // Create a worktree in detached-HEAD mode — no branch ref associated.
    // This covers the "branch ref already gone" scenario (e.g., step 9e deleted
    // it before --teardown ran, or worktree was created with --detach).
    wtPath = mkdtempSync(join(tmpdir(), 'tpl285-wt-detach-'));
    rmSync(wtPath, { recursive: true, force: true });
    safeGitSpawn(root, ['worktree', 'add', '--detach', wtPath, 'main']);
  });

  after(() => { if (root) rmSync(root, { recursive: true, force: true }); });

  test('teardown of detached-HEAD worktree exits 0', () => {
    // Use basename of wtPath as the session name since there is no branch.
    const { exitCode, result } = runTeardown(root, {
      sessionName: wtPath,  // full path — resolveWorktreePath accepts it
      silent: true,
    });
    assert.equal(exitCode, 0, `expected ok; got: ${JSON.stringify(result)}`);
  });

  test('worktree directory is removed', () => {
    assert.equal(existsSync(wtPath), false, 'worktree directory must be removed');
  });

  test('result.branchDeleted and branchPreserved are both null for detached HEAD', () => {
    const root2 = createBaseRepo('c4b');
    const wt2 = mkdtempSync(join(tmpdir(), 'tpl285-wt-det2-'));
    rmSync(wt2, { recursive: true, force: true });
    safeGitSpawn(root2, ['worktree', 'add', '--detach', wt2, 'main']);
    try {
      const { result } = runTeardown(root2, { sessionName: wt2, silent: true });
      assert.equal(result.branchDeleted, null, 'branchDeleted must be null for detached HEAD');
      assert.equal(result.branchPreserved, null, 'branchPreserved must be null for detached HEAD');
    } finally {
      rmSync(root2, { recursive: true, force: true });
    }
  });
});
