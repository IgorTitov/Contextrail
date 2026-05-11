/* @HEADER
 * @version 0.7.106 | 2026-05-05
 * @purpose Unit tests for the recently-completed claim path in checkSliceCoverage (TPL-293, ADR-0030) — verifies Layer 1.5 that accepts claims completed within the ceremony window.
 * @sidecar commit-msg-check-recent-completed.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Tests for the recently-completed claim window in checkSliceCoverage (CG-C4-1 Layer 1.5).
 *
 * Context: pre-commit --auto-complete fires BEFORE commit-msg hook, so by the time
 * commit-msg-check validates the slice ID the claim is already status=completed.
 * Layer 1.5 treats recently-completed claims (within COMMIT_MSG_RECENT_WINDOW_S seconds)
 * as valid coverage. (TPL-293 / ADR-0030)
 *
 * Cases:
 *   1. Active claim → covered, reason=active-claim (regression)
 *   2. Completed claim within window → covered, reason=recently-completed (NEW)
 *   3. Completed claim older than window → NOT covered (orphan path)
 *   4. Expired claim → NOT covered (regression)
 *   5. No claim, history match → covered, reason=history-commit (regression)
 *   6. No claim, no history → orphan (regression)
 *   7. Dual-key override → covered (regression)
 *   8. Custom COMMIT_MSG_RECENT_WINDOW_S=10 env → window respected
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { statSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { safeGitSpawn } from '../_setup/safe-git.mjs';
import { checkSliceCoverage } from '../../scripts/checks/commit-msg-check.mjs';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function farFuture() {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
}

function pastTimestamp(secondsAgo) {
  return new Date(Date.now() - secondsAgo * 1000).toISOString();
}

/** Create a temp claims dir with a single claim at the given status. */
function makeClaimsDir(sliceId, status, completedAtOverride) {
  const dir = mkdtempSync(join(tmpdir(), 'rcmc-claims-'));
  const base = {
    id: 'clm-rcmc-test-001',
    agent: 'test-agent',
    slice: sliceId,
    created: new Date().toISOString(),
    expires: farFuture(),
    status,
    targets: [{ path: 'README.md', action: 'extend' }],
    strategy: 'modify-in-place',
    dependsOn: [],
    notes: '',
  };
  if (completedAtOverride !== undefined) {
    base.completed_at = completedAtOverride;
  }
  writeFileSync(join(dir, `${base.id}.json`), JSON.stringify(base, null, 2) + '\n', 'utf8');
  return dir;
}

/** Create temp claims dir with a completed claim whose file mtime is backdated (no completed_at). */
function makeClaimsDirWithMtime(sliceId, secondsAgo) {
  const dir = mkdtempSync(join(tmpdir(), 'rcmc-mtime-'));
  const claim = {
    id: 'clm-rcmc-mtime-001',
    agent: 'test-agent',
    slice: sliceId,
    created: new Date().toISOString(),
    expires: farFuture(),
    status: 'completed',
    // No completed_at — legacy shape
    targets: [{ path: 'README.md', action: 'extend' }],
    strategy: 'modify-in-place',
    dependsOn: [],
    notes: '',
  };
  const filePath = join(dir, `${claim.id}.json`);
  writeFileSync(filePath, JSON.stringify(claim, null, 2) + '\n', 'utf8');
  // Backdate file mtime
  const pastTime = (Date.now() - secondsAgo * 1000) / 1000;
  utimesSync(filePath, pastTime, pastTime);
  return dir;
}

/** Create empty tmp dir with no claims. */
function emptyClaimsDir() {
  return mkdtempSync(join(tmpdir(), 'rcmc-empty-'));
}

/** Create a minimal git repo with one commit whose subject contains (sliceId). */
function makeGitRepoWithCommit(sliceId) {
  const dir = mkdtempSync(join(tmpdir(), 'rcmc-repo-'));
  safeGitSpawn(dir, ['init', '-q', '-b', 'main']);
  safeGitSpawn(dir, ['config', 'user.email', 'test@local']);
  safeGitSpawn(dir, ['config', 'user.name', 'test-bot']);
  safeGitSpawn(dir, ['config', 'commit.gpgsign', 'false']);
  writeFileSync(join(dir, 'README.md'), '# test\n');
  safeGitSpawn(dir, ['add', 'README.md']);
  safeGitSpawn(dir, ['commit', '-q', '-m', `feat: prior work (${sliceId})`]);
  return dir;
}

/** Create a minimal git repo with NO commit referencing sliceId. */
function makeEmptyGitRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'rcmc-empty-repo-'));
  safeGitSpawn(dir, ['init', '-q', '-b', 'main']);
  safeGitSpawn(dir, ['config', 'user.email', 'test@local']);
  safeGitSpawn(dir, ['config', 'user.name', 'test-bot']);
  safeGitSpawn(dir, ['config', 'commit.gpgsign', 'false']);
  writeFileSync(join(dir, 'README.md'), '# init\n');
  safeGitSpawn(dir, ['add', 'README.md']);
  safeGitSpawn(dir, ['commit', '-q', '-m', 'chore: init']);
  return dir;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('recently-completed coverage — Layer 1.5 (TPL-293 / ADR-0030)', () => {

  test('1. active claim → ok=true reason=active-claim (regression)', async () => {
    const sliceId = 'RCMC-ACTIVE-001';
    const claimsDir = makeClaimsDir(sliceId, 'active');
    const repoRoot = makeEmptyGitRepo();
    try {
      const result = await checkSliceCoverage(sliceId, { claimsDir, repoRoot, env: {} });
      assert.equal(result.ok, true);
      assert.equal(result.reason, 'active-claim');
      assert.ok(result.info);
    } finally {
      rmSync(claimsDir, { recursive: true, force: true });
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  test('2. completed claim within 60s window → ok=true reason=recently-completed (NEW)', async () => {
    const sliceId = 'RCMC-RECENT-001';
    // completed_at is 5 seconds ago — well within the 60s default window
    const claimsDir = makeClaimsDir(sliceId, 'completed', pastTimestamp(5));
    const repoRoot = makeEmptyGitRepo();
    try {
      const result = await checkSliceCoverage(sliceId, { claimsDir, repoRoot, env: {} });
      assert.equal(result.ok, true, 'should be covered');
      assert.equal(result.reason, 'recently-completed');
      assert.ok(result.info);
      assert.equal(result.info.slice, sliceId);
    } finally {
      rmSync(claimsDir, { recursive: true, force: true });
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  test('3. completed claim older than window → ok=false reason=slice-id-orphan', async () => {
    const sliceId = 'RCMC-STALE-001';
    // completed_at is 120 seconds ago — outside the 60s window
    const claimsDir = makeClaimsDir(sliceId, 'completed', pastTimestamp(120));
    const repoRoot = makeEmptyGitRepo();
    try {
      const result = await checkSliceCoverage(sliceId, { claimsDir, repoRoot, env: {} });
      assert.equal(result.ok, false);
      assert.equal(result.reason, 'slice-id-orphan');
    } finally {
      rmSync(claimsDir, { recursive: true, force: true });
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  test('4. expired claim → ok=false reason=slice-id-orphan (regression)', async () => {
    const sliceId = 'RCMC-EXPIRED-001';
    const claimsDir = makeClaimsDir(sliceId, 'expired');
    const repoRoot = makeEmptyGitRepo();
    try {
      const result = await checkSliceCoverage(sliceId, { claimsDir, repoRoot, env: {} });
      assert.equal(result.ok, false);
      assert.equal(result.reason, 'slice-id-orphan');
    } finally {
      rmSync(claimsDir, { recursive: true, force: true });
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  test('5. no claim, prior commit in history, no override → orphan (TPL-299)', async () => {
    // TPL-299 (ADR-0031): history-match silent pass removed. Without dual-key override
    // (COA_OPERATOR=1 + COMMIT_MSG_ALLOW_HISTORY_MATCH=1), history match → orphan.
    const sliceId = 'RCMC-HIST-001';
    const claimsDir = emptyClaimsDir();
    const repoRoot = makeGitRepoWithCommit(sliceId);
    try {
      const result = await checkSliceCoverage(sliceId, { claimsDir, repoRoot, env: {} });
      assert.equal(result.ok, false);
      assert.equal(result.reason, 'slice-id-orphan');
    } finally {
      rmSync(claimsDir, { recursive: true, force: true });
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  test('6. no claim, no history → ok=false reason=slice-id-orphan (regression)', async () => {
    const sliceId = 'RCMC-ORPHAN-001';
    const claimsDir = emptyClaimsDir();
    const repoRoot = makeEmptyGitRepo();
    try {
      const result = await checkSliceCoverage(sliceId, { claimsDir, repoRoot, env: {} });
      assert.equal(result.ok, false);
      assert.equal(result.reason, 'slice-id-orphan');
    } finally {
      rmSync(claimsDir, { recursive: true, force: true });
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  test('7. dual-key override → ok=true reason=operator-override (regression)', async () => {
    const sliceId = 'RCMC-OVERRIDE-001';
    const claimsDir = emptyClaimsDir();
    const repoRoot = makeEmptyGitRepo();
    try {
      const result = await checkSliceCoverage(sliceId, {
        claimsDir,
        repoRoot,
        env: { COA_OPERATOR: '1', COMMIT_MSG_ALLOW_ORPHAN_SLICE: '1' },
      });
      assert.equal(result.ok, true);
      assert.equal(result.reason, 'operator-override');
    } finally {
      rmSync(claimsDir, { recursive: true, force: true });
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  test('8. COMMIT_MSG_RECENT_WINDOW_S=10 env: claim completed 5s ago → covered', async () => {
    const sliceId = 'RCMC-WIN-SHORT-001';
    const claimsDir = makeClaimsDir(sliceId, 'completed', pastTimestamp(5));
    const repoRoot = makeEmptyGitRepo();
    try {
      const result = await checkSliceCoverage(sliceId, {
        claimsDir,
        repoRoot,
        env: { COMMIT_MSG_RECENT_WINDOW_S: '10' },
      });
      assert.equal(result.ok, true);
      assert.equal(result.reason, 'recently-completed');
    } finally {
      rmSync(claimsDir, { recursive: true, force: true });
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  test('8b. COMMIT_MSG_RECENT_WINDOW_S=10 env: claim completed 15s ago → orphan', async () => {
    const sliceId = 'RCMC-WIN-STALE-001';
    const claimsDir = makeClaimsDir(sliceId, 'completed', pastTimestamp(15));
    const repoRoot = makeEmptyGitRepo();
    try {
      const result = await checkSliceCoverage(sliceId, {
        claimsDir,
        repoRoot,
        env: { COMMIT_MSG_RECENT_WINDOW_S: '10' },
      });
      assert.equal(result.ok, false);
      assert.equal(result.reason, 'slice-id-orphan');
    } finally {
      rmSync(claimsDir, { recursive: true, force: true });
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  test('2b. legacy completed claim (no completed_at) within file-mtime window → covered', async () => {
    const sliceId = 'RCMC-LEGACY-001';
    // File mtime is 5 seconds ago — within 60s window
    const claimsDir = makeClaimsDirWithMtime(sliceId, 5);
    const repoRoot = makeEmptyGitRepo();
    try {
      const result = await checkSliceCoverage(sliceId, { claimsDir, repoRoot, env: {} });
      assert.equal(result.ok, true);
      assert.equal(result.reason, 'recently-completed');
    } finally {
      rmSync(claimsDir, { recursive: true, force: true });
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });
});
