/* @HEADER
 * @version 0.7.106 | 2026-05-05
 * @purpose Unit tests for the Layer 2 history-match tightening in checkSliceCoverage (TPL-299, ADR-0031) — verifies that history match requires explicit dual-key operator override.
 * @sidecar commit-msg-check-history-tightened.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Tests for history-match tightening in checkSliceCoverage (TPL-299 / ADR-0031).
 *
 * Before TPL-299, Layer 2 passed silently with INFO when a prior commit in git
 * history matched the slice ID. This allowed subject reuse across unrelated commits
 * (incidents: TPL-288 dual-commit, ZVX-DEV-111 dual-commit).
 *
 * After TPL-299: history match → orphan by default. Only COA_OPERATOR=1 +
 * COMMIT_MSG_ALLOW_HISTORY_MATCH=1 (dual-key) allows the pass, and every such
 * pass writes a JSON Lines entry to .claims/audit.log.
 *
 * Cases:
 *   1. Active claim → ok=true reason=active-claim (regression)
 *   2. Recently-completed claim → ok=true reason=recently-completed (regression)
 *   3. No claim, history match, NO override → ok=false reason=slice-id-orphan (NEW)
 *   4. No claim, history match, dual-key override → ok=true reason=history-fixup-override + audit log
 *   5. Single-key COMMIT_MSG_ALLOW_HISTORY_MATCH=1 without COA_OPERATOR → orphan
 *   6. No claim, no history → ok=false reason=slice-id-orphan (regression)
 *   7. Existing dual-key override (COMMIT_MSG_ALLOW_ORPHAN_SLICE=1) → still works (regression)
 *   8. Audit log entry shape verified after Layer 2 dual-key pass
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
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

function makeActiveClaim(dir, sliceId) {
  const claim = {
    id: 'clm-hmt-active-001',
    agent: 'test-agent',
    slice: sliceId,
    created: new Date().toISOString(),
    expires: farFuture(),
    status: 'active',
    targets: [{ path: 'README.md', action: 'extend' }],
    strategy: 'modify-in-place',
    dependsOn: [],
    notes: '',
  };
  writeFileSync(join(dir, `${claim.id}.json`), JSON.stringify(claim, null, 2) + '\n', 'utf8');
}

function makeCompletedClaim(dir, sliceId, completedAt) {
  const claim = {
    id: 'clm-hmt-completed-001',
    agent: 'test-agent',
    slice: sliceId,
    created: new Date().toISOString(),
    expires: farFuture(),
    status: 'completed',
    completed_at: completedAt,
    targets: [{ path: 'README.md', action: 'extend' }],
    strategy: 'modify-in-place',
    dependsOn: [],
    notes: '',
  };
  writeFileSync(join(dir, `${claim.id}.json`), JSON.stringify(claim, null, 2) + '\n', 'utf8');
}

function emptyClaimsDir() {
  return mkdtempSync(join(tmpdir(), 'hmt-claims-'));
}

function makeGitRepoWithCommit(sliceId) {
  const dir = mkdtempSync(join(tmpdir(), 'hmt-repo-'));
  safeGitSpawn(dir, ['init', '-q', '-b', 'main']);
  safeGitSpawn(dir, ['config', 'user.email', 'test@local']);
  safeGitSpawn(dir, ['config', 'user.name', 'test-bot']);
  safeGitSpawn(dir, ['config', 'commit.gpgsign', 'false']);
  writeFileSync(join(dir, 'README.md'), '# test\n');
  safeGitSpawn(dir, ['add', 'README.md']);
  safeGitSpawn(dir, ['commit', '-q', '-m', `feat: prior work (${sliceId})`]);
  return dir;
}

function makeEmptyGitRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'hmt-empty-repo-'));
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

describe('history-match tightening — Layer 2 (TPL-299 / ADR-0031)', () => {
  test('1. active claim → ok=true reason=active-claim (regression)', async () => {
    const sliceId = 'HMT-ACTIVE-001';
    const claimsDir = emptyClaimsDir();
    makeActiveClaim(claimsDir, sliceId);
    const repoRoot = makeEmptyGitRepo();
    try {
      const result = await checkSliceCoverage(sliceId, { claimsDir, repoRoot, env: {} });
      assert.equal(result.ok, true);
      assert.equal(result.reason, 'active-claim');
    } finally {
      rmSync(claimsDir, { recursive: true, force: true });
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  test('2. recently-completed claim → ok=true reason=recently-completed (regression)', async () => {
    const sliceId = 'HMT-RECENT-001';
    const claimsDir = emptyClaimsDir();
    makeCompletedClaim(claimsDir, sliceId, pastTimestamp(5));
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

  test('3. no claim, history match, no override → orphan (NEW behavior — was silent pass)', async () => {
    const sliceId = 'HMT-HIST-NO-OVERRIDE-001';
    const claimsDir = emptyClaimsDir();
    const repoRoot = makeGitRepoWithCommit(sliceId);
    try {
      const result = await checkSliceCoverage(sliceId, { claimsDir, repoRoot, env: {} });
      assert.equal(result.ok, false, 'history match without override must be refused');
      assert.equal(result.reason, 'slice-id-orphan');
    } finally {
      rmSync(claimsDir, { recursive: true, force: true });
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  test('4. no claim, history match, dual-key override → history-fixup-override + audit log', async () => {
    const sliceId = 'HMT-HIST-OVERRIDE-001';
    const claimsDir = emptyClaimsDir();
    const repoRoot = makeGitRepoWithCommit(sliceId);
    try {
      const result = await checkSliceCoverage(sliceId, {
        claimsDir,
        repoRoot,
        env: { COA_OPERATOR: '1', COMMIT_MSG_ALLOW_HISTORY_MATCH: '1' },
      });
      assert.equal(result.ok, true);
      assert.equal(result.reason, 'history-fixup-override');
      assert.ok(result.info, 'info should contain hash + subject');
      assert.ok(result.info.hash, 'hash must be present');
      assert.ok(result.info.subject.includes(sliceId), 'subject must include sliceId');

      // Verify audit log entry was written
      const auditPath = join(claimsDir, 'audit.log');
      assert.ok(existsSync(auditPath), 'audit.log must exist after dual-key override pass');
      const logLine = readFileSync(auditPath, 'utf8').trim();
      const entry = JSON.parse(logLine);
      assert.equal(entry.event, 'commit-msg-history-fixup-override');
      assert.equal(entry.slice, sliceId);
      assert.equal(entry.matched_commit, result.info.hash);
      assert.ok(typeof entry.ts === 'string', 'ts must be a string');
      assert.equal(entry.operator_override_active, true);
    } finally {
      rmSync(claimsDir, { recursive: true, force: true });
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  test('5. single-key COMMIT_MSG_ALLOW_HISTORY_MATCH=1 without COA_OPERATOR → orphan', async () => {
    const sliceId = 'HMT-HIST-SINGLE-KEY-001';
    const claimsDir = emptyClaimsDir();
    const repoRoot = makeGitRepoWithCommit(sliceId);
    try {
      const result = await checkSliceCoverage(sliceId, {
        claimsDir,
        repoRoot,
        env: { COMMIT_MSG_ALLOW_HISTORY_MATCH: '1' },
      });
      assert.equal(result.ok, false, 'single-key without COA_OPERATOR must be refused');
      assert.equal(result.reason, 'slice-id-orphan');
    } finally {
      rmSync(claimsDir, { recursive: true, force: true });
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  test('6. no claim, no history → ok=false reason=slice-id-orphan (regression)', async () => {
    const sliceId = 'HMT-ORPHAN-001';
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

  test('7. COMMIT_MSG_ALLOW_ORPHAN_SLICE=1 dual-key override → still works (regression)', async () => {
    const sliceId = 'HMT-ORPHAN-OVERRIDE-001';
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

  test('8. audit log entry shape verified: ts, event, slice, matched_commit, subject, operator_override_active', async () => {
    const sliceId = 'HMT-AUDIT-SHAPE-001';
    const claimsDir = emptyClaimsDir();
    const repoRoot = makeGitRepoWithCommit(sliceId);
    try {
      const before = new Date();
      const result = await checkSliceCoverage(sliceId, {
        claimsDir,
        repoRoot,
        env: { COA_OPERATOR: '1', COMMIT_MSG_ALLOW_HISTORY_MATCH: '1' },
      });
      const after = new Date();

      assert.equal(result.reason, 'history-fixup-override');

      const auditPath = join(claimsDir, 'audit.log');
      const logLine = readFileSync(auditPath, 'utf8').trim();
      const entry = JSON.parse(logLine);

      // Shape assertions
      assert.equal(typeof entry.ts, 'string', 'ts must be string');
      const ts = new Date(entry.ts);
      assert.ok(ts >= before && ts <= after, 'ts must be within the call window');
      assert.equal(entry.event, 'commit-msg-history-fixup-override');
      assert.equal(entry.slice, sliceId);
      assert.equal(typeof entry.matched_commit, 'string', 'matched_commit must be string');
      assert.ok(entry.matched_commit.length >= 7, 'matched_commit must be a git hash');
      assert.equal(typeof entry.subject, 'string', 'subject must be string');
      assert.ok(entry.subject.includes(sliceId), 'subject must include the slice ID');
      assert.equal(entry.operator_override_active, true);
    } finally {
      rmSync(claimsDir, { recursive: true, force: true });
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });
});
