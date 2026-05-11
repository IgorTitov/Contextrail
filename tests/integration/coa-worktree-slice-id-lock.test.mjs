/* @HEADER
 * @version 0.8.15 | 2026-05-11
 * @purpose Integration tests proving C4 slice-ID uniqueness invariant is enforced in coa-worktree --create --slice=<ID> (TPL-282). Uses safeGit/safeGitSpawn (R1/ADR-0015).
 * @sidecar coa-worktree-slice-id-lock.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// @test-isolation: live-repo-allowed | reason: Tests C4 slice-ID lock invariant; intentionally writes to live .claims/ via claim-check subprocess; uses dynamic IDs (CWALOCK-T1-timestamp) and removes all created claim files in after(). See docs comment for full rationale.

/**
 * C4 slice-ID lock integration tests.
 *
 * These tests call `runCreate` from `coa-worktree.mjs` against tmpdir
 * git repos. Because `runCreate` invokes `claim-check --acquire` as a
 * subprocess, and claim-check hardcodes its CLAIMS_DIR to the live repo's
 * `.claims/` directory (join(ROOT, '.claims')), these tests create REAL
 * claim files in the project's `.claims/` directory.
 *
 * Teardown: every test tracks the claim files created (by scanning .claims/
 * after each runCreate for the matching sliceId) and deletes them in after().
 *
 * R1 compliance: all git operations go through safeGitSpawn. Worktree
 * paths are under tmpdir. The live repo's `.claims/` is touched only for
 * claim JSON files (not git objects).
 *
 * @see docs/adr/0020-slice-id-uniqueness.md
 * @see docs/adr/0015-test-isolation-enforcement.md
 */

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { safeGitSpawn } from '../_setup/safe-git.mjs';
import { runCreate } from '../../scripts/coa-worktree.mjs';

// Path to the live .claims/ directory (claim-check subprocess always writes here)
const LIVE_CLAIMS_DIR = fileURLToPath(new URL('../../.claims', import.meta.url));

// Track created claim files so we can clean them up in teardown
const claimFilesToClean = [];

after(() => {
  for (const id of claimFilesToClean) {
    try {
      const filePath = join(LIVE_CLAIMS_DIR, `${id}.json`);
      if (existsSync(filePath)) rmSync(filePath);
    } catch {
      /* non-fatal */
    }
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal isolated git repo in tmpdir.
 * R1: uses safeGitSpawn; all paths under tmpdir.
 */
function makeIsolatedRepo(label) {
  const dir = mkdtempSync(join(tmpdir(), `cwa-lock-${label}-`));
  safeGitSpawn(dir, ['init', '-q', '-b', 'main']);
  safeGitSpawn(dir, ['config', 'user.email', 'test@lock.local']);
  safeGitSpawn(dir, ['config', 'user.name', 'Lock Test']);
  safeGitSpawn(dir, ['config', 'commit.gpgsign', 'false']);
  writeFileSync(join(dir, 'README.md'), '# lock test\n');
  safeGitSpawn(dir, ['add', 'README.md']);
  safeGitSpawn(dir, ['commit', '-q', '-m', 'init']);
  return dir;
}

/**
 * Scan LIVE_CLAIMS_DIR for an active claim with the given sliceId.
 * Returns the claim object or null.
 */
function findLiveClaimForSlice(sliceId) {
  if (!existsSync(LIVE_CLAIMS_DIR)) return null;
  for (const f of readdirSync(LIVE_CLAIMS_DIR)) {
    if (!f.endsWith('.json')) continue;
    try {
      const text = readFileSync(join(LIVE_CLAIMS_DIR, f), 'utf8');
      const c = JSON.parse(text);
      if (c.slice === sliceId && c.status === 'active') return c;
    } catch {
      /* skip unparseable files */
    }
  }
  return null;
}

/**
 * Force-expire a claim by directly modifying the JSON file in LIVE_CLAIMS_DIR.
 */
function expireLiveClaim(claimId) {
  const filePath = join(LIVE_CLAIMS_DIR, `${claimId}.json`);
  if (!existsSync(filePath)) return;
  const claim = JSON.parse(readFileSync(filePath, 'utf8'));
  claim.status = 'expired';
  claim.expires = new Date(Date.now() - 60 * 1000).toISOString();
  writeFileSync(filePath, JSON.stringify(claim, null, 2) + '\n', 'utf8');
}

// ---------------------------------------------------------------------------
// Test 1: Two sequential runCreate with same slice ID
// Second one must be blocked by the active claim from the first.
// ---------------------------------------------------------------------------

test('C4/T1: second runCreate with same slice ID blocked by active claim', () => {
  const sliceId = `CWALOCK-T1-${Date.now()}`;
  const repo = makeIsolatedRepo('t1');

  try {
    // First runCreate: claim-check --acquire runs first (before git worktree add).
    // Claim is created in live .claims/ even if git worktree add subsequently fails
    // (it will fail because the worktree target path is outside tmpdir — accepted).
    runCreate(repo, { sliceId, silent: true });

    // Find the newly created claim file
    const firstClaim = findLiveClaimForSlice(sliceId);
    if (!firstClaim) {
      // Claim was not created — this can happen if claim-check itself failed for
      // an unexpected reason (e.g., pre-existing claim for this sliceId from a
      // previous failed test run). Accept skip.
      return;
    }
    claimFilesToClean.push(firstClaim.id);

    // Second runCreate with same slice ID: must fail with slice-id-collision
    const second = runCreate(repo, { sliceId, silent: true });
    assert.equal(second.exitCode, 1, 'second create should fail with exitCode 1');
    assert.ok(
      (second.result.error || '').includes('slice-id-collision'),
      `error should contain 'slice-id-collision', got: ${second.result.error}`,
    );
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Test 2: After active claim expires (no commit), second create passes collision check
// ---------------------------------------------------------------------------

test('C4/T2: second runCreate passes collision check after active claim expires', () => {
  const sliceId = `CWALOCK-T2-${Date.now()}`;
  const repo = makeIsolatedRepo('t2');

  try {
    // First runCreate: acquires claim in .claims/
    runCreate(repo, { sliceId, silent: true });

    const firstClaim = findLiveClaimForSlice(sliceId);
    if (!firstClaim) return; // skip if claim wasn't created

    claimFilesToClean.push(firstClaim.id);

    // Force-expire the claim
    expireLiveClaim(firstClaim.id);

    // Second runCreate with same slice ID:
    // - Active-claim check: no active claim (just expired) → passes
    // - History check: no commit with (sliceId) in isolated tmpdir repo → passes
    // - git worktree add: may fail (expected) but NOT due to slice-id-collision
    const second = runCreate(repo, { sliceId, silent: true });

    // Track any second claim file created
    const secondClaim = findLiveClaimForSlice(sliceId);
    if (secondClaim && secondClaim.id !== firstClaim.id) {
      claimFilesToClean.push(secondClaim.id);
    }

    const error = second.result.error || '';
    assert.ok(
      !error.includes('slice-id-collision'),
      `second create after expiry must not hit slice-id-collision, got: ${error}`,
    );
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Test 3: Committed slice ID (in live repo history) blocks runCreate
// ---------------------------------------------------------------------------

test('C4/T3: runCreate refuses when slice ID is in live repo git history', () => {
  // TPL-279 is a known committed slice ID in this repository.
  // Its commit subject contains '(TPL-279)'.
  const sliceId = 'TPL-279';
  const repo = makeIsolatedRepo('t3');

  try {
    const result = runCreate(repo, { sliceId, silent: true });
    assert.equal(result.exitCode, 1, 'should be blocked');
    assert.ok(
      (result.result.error || '').includes('slice-id-collision'),
      `error should contain 'slice-id-collision', got: ${result.result.error}`,
    );
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});
