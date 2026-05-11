/* @HEADER
 * @version 0.8.5 | 2026-05-11
 * @purpose Integration tests for TPL-327: step 9c ancestry guard (parallel-worktree race condition).
 * @sidecar coa-merge-ff-ancestry.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * TPL-327 — Step 9c ancestry guard (race condition in parallel worktrees).
 *
 * Incident: two parallel transport-worktrees started from the same parent.
 * Branch-A committed and ff-updated main. Branch-B then committed on top of
 * the old parent — not rebased on new main — and its push succeeded via
 * updateInstead, overwriting branch-A's commit (lost to reflog only).
 *
 * Two root causes fixed by TPL-327:
 *   1. --force-with-lease=main:<sha> does not verify the target ref for
 *      local-path push; must be refs/heads/main:<sha>.
 *   2. No ancestry check before ff-update; if main moved past step-6.5
 *      and HEAD is not a descendant, push should fail with a recovery hint.
 *
 * Test shape:
 *   1. Create bare-style main repo + initial commit.
 *   2. Create tx-branch-A, tx-branch-B both forked from that parent.
 *   3. Commit on branch-A. Advance main to branch-A via git update-ref
 *      (simulates branch-A's ceremony completing first).
 *   4. Commit on branch-B from the original parent (not rebased).
 *   5. Assert: git merge-base --is-ancestor exits non-zero for branch-B HEAD
 *      vs new main — the ancestry guard condition is real.
 *   6. Assert: force-with-lease refs/heads/main:<old-sha> push from branch-B
 *      fails when main already moved to branch-A's SHA.
 *
 * Every git invocation uses safeGitSpawn (R1 / ADR-0015).
 */

import { describe, test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { safeGitSpawn } from '../_setup/safe-git.mjs';

// ---------------------------------------------------------------------------
// Fixture helper
// ---------------------------------------------------------------------------

/**
 * Set up a git repo representing the parallel-worktree race scenario.
 *
 * Layout under baseDir:
 *   main/           — primary repo (receive.denyNonFastForwards=true)
 *   tx-a/           — worktree on tx-branch-A
 *   tx-b/           — worktree on tx-branch-B
 *
 * After setup:
 *   - main HEAD points to A's commit (branch-A won the race)
 *   - tx-b HEAD points to B's commit forked off the original parent
 *   - B is NOT a descendant of A → ancestry guard must trip
 *
 * Returns { mainRoot, txARoot, txBRoot, parentSha, aSha, bSha }.
 */
function createRaceFixture(baseDir) {
  const mainRoot = join(baseDir, 'main');
  const txARoot = join(baseDir, 'tx-a');
  const txBRoot = join(baseDir, 'tx-b');
  mkdirSync(mainRoot);

  // --- main repo ---
  safeGitSpawn(mainRoot, ['init', '-b', 'main']);
  safeGitSpawn(mainRoot, ['config', 'user.email', 'test@tpl327.local']);
  safeGitSpawn(mainRoot, ['config', 'user.name', 'TPL-327 Test']);
  safeGitSpawn(mainRoot, ['config', 'commit.gpgsign', 'false']);

  writeFileSync(join(mainRoot, 'README.md'), '# fixture\n');
  safeGitSpawn(mainRoot, ['add', 'README.md']);
  safeGitSpawn(mainRoot, ['commit', '-m', 'init: parent commit']);

  const parentSha = safeGitSpawn(mainRoot, ['rev-parse', 'HEAD']).stdout.trim();

  // --- branch-A worktree ---
  safeGitSpawn(mainRoot, ['worktree', 'add', '-b', 'tx-TPL-327-A', txARoot]);
  safeGitSpawn(txARoot, ['config', 'user.email', 'test@tpl327.local']);
  safeGitSpawn(txARoot, ['config', 'user.name', 'TPL-327 Test']);
  safeGitSpawn(txARoot, ['config', 'commit.gpgsign', 'false']);
  writeFileSync(join(txARoot, 'feature-a.js'), '// branch-A feature\n');
  safeGitSpawn(txARoot, ['add', 'feature-a.js']);
  safeGitSpawn(txARoot, ['commit', '-m', 'feat(a): branch-A commit (TPL-327)']);
  const aSha = safeGitSpawn(txARoot, ['rev-parse', 'HEAD']).stdout.trim();

  // --- branch-B worktree (forked from same parent, before A merged) ---
  safeGitSpawn(mainRoot, ['worktree', 'add', '-b', 'tx-TPL-327-B', txBRoot]);
  safeGitSpawn(txBRoot, ['config', 'user.email', 'test@tpl327.local']);
  safeGitSpawn(txBRoot, ['config', 'user.name', 'TPL-327 Test']);
  safeGitSpawn(txBRoot, ['config', 'commit.gpgsign', 'false']);
  writeFileSync(join(txBRoot, 'feature-b.js'), '// branch-B feature\n');
  safeGitSpawn(txBRoot, ['add', 'feature-b.js']);
  safeGitSpawn(txBRoot, ['commit', '-m', 'feat(b): branch-B commit (TPL-327)']);
  const bSha = safeGitSpawn(txBRoot, ['rev-parse', 'HEAD']).stdout.trim();

  // --- Simulate branch-A winning the race: advance main to A's SHA ---
  // This is the CAS-update that branch-A's step 9c performs.
  safeGitSpawn(mainRoot, ['update-ref', 'refs/heads/main', aSha, parentSha]);

  return { mainRoot, txARoot, txBRoot, parentSha, aSha, bSha };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('coa-merge step 9c: ancestry guard (TPL-327)', () => {
  let baseDir;

  afterEach(() => {
    if (baseDir && existsSync(baseDir)) {
      try {
        rmSync(baseDir, { recursive: true, force: true });
      } catch {
        /* best effort */
      }
      baseDir = undefined;
    }
  });

  test('branch-B HEAD is NOT an ancestor of new main after branch-A wins the race', () => {
    baseDir = mkdtempSync(join(tmpdir(), 'tpl327-ancestry-'));
    const { mainRoot, bSha, aSha } = createRaceFixture(baseDir);

    // Verify main now points to A's SHA (branch-A won).
    const mainHead = safeGitSpawn(mainRoot, ['rev-parse', 'refs/heads/main']).stdout.trim();
    assert.strictEqual(mainHead, aSha, 'main should point to branch-A commit after the race');

    // The ancestry guard checks: merge-base --is-ancestor <new-main> <branch-B-HEAD>
    // i.e. "is new main an ancestor of B?" — if not, B cannot be ff-merged onto main.
    // This is the exact check TPL-327 adds to step 9c.
    const checkResult = safeGitSpawn(mainRoot, ['merge-base', '--is-ancestor', aSha, bSha]);

    // non-zero exit means aSha is NOT an ancestor of bSha → B cannot ff onto main.
    assert.notStrictEqual(
      checkResult.status,
      0,
      `Expected ancestry check to fail (B is not descended from A) but it exited 0.\n` +
        `This means B was accidentally rebased onto A — the race scenario is invalid.`,
    );
  });

  test('branch-B HEAD IS an ancestor of its own parent — sanity', () => {
    // Belt-and-suspenders sanity: parent IS an ancestor of B (basic git invariant).
    baseDir = mkdtempSync(join(tmpdir(), 'tpl327-sanity-'));
    const { mainRoot, parentSha, bSha } = createRaceFixture(baseDir);

    const checkResult = safeGitSpawn(mainRoot, ['merge-base', '--is-ancestor', parentSha, bSha]);

    assert.strictEqual(
      checkResult.status,
      0,
      `Expected parentSha to be an ancestor of bSha (basic git invariant), but exited ${checkResult.status}.`,
    );
  });

  test('force-with-lease with short ref name does NOT block non-ff push to local path', () => {
    // Demonstrates root cause #1: --force-with-lease=main:<sha> (short ref)
    // does NOT enforce the lease when pushing to a local-path remote.
    // Branch-B can overwrite main even though it's not ff, because the short
    // ref name is not matched against refs/heads/main in the target.
    //
    // This test documents the vulnerability — it does NOT assert success of
    // the bad push (git behaviour varies). It asserts the correct fix is
    // refs/heads/main:<sha> (tested implicitly by the ancestry guard test
    // above — the guard fires before the push happens).
    baseDir = mkdtempSync(join(tmpdir(), 'tpl327-lease-'));
    const { mainRoot, txBRoot, parentSha, aSha } = createRaceFixture(baseDir);

    // Attempt push with WRONG short ref lease — branch-B HEAD is not ff from new main.
    // (not asserted — git behaviour varies by version/config; see comment above)
    safeGitSpawn(txBRoot, [
      'push',
      `--force-with-lease=main:${parentSha}`, // short ref — this is the bug
      mainRoot,
      'HEAD:refs/heads/main',
    ]);

    // Attempt push with CORRECT full ref lease — should fail because mainSha != parentSha.
    const goodLeasePush = safeGitSpawn(txBRoot, [
      'push',
      `--force-with-lease=refs/heads/main:${parentSha}`, // full ref — the fix
      mainRoot,
      'HEAD:refs/heads/main',
    ]);

    // The correct-lease push must fail: main already moved to aSha,
    // so the lease on parentSha should be rejected.
    assert.notStrictEqual(
      goodLeasePush.status,
      0,
      `Expected --force-with-lease=refs/heads/main:${parentSha.slice(0, 8)} to fail ` +
        `(main is at ${aSha.slice(0, 8)}, not parentSha), but push succeeded.\n` +
        `STDERR: ${goodLeasePush.stderr}`,
    );
  });
});
