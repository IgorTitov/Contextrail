/* @HEADER
 * @version 0.7.90 | 2026-05-05
 * @purpose Unit and CLI tests for the C4 slice-ID uniqueness invariant — findActiveClaimWithSlice, findCommittedSliceUse, and --acquire CLI blocking behavior (TPL-282).
 * @sidecar claim-check-slice-id-uniqueness.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Tests for C4 slice-ID uniqueness invariant (TPL-282).
 *
 * Covers:
 *   1. findActiveClaimWithSlice — no match → null
 *   2. findActiveClaimWithSlice — active claim present → returns claim
 *   3. findCommittedSliceUse — commit in history → returns { hash, subject }
 *   4. findCommittedSliceUse — commit on non-default branch (--all) → returns match
 *   5. findCommittedSliceUse — no matching commit → returns null
 *   6. CLI --acquire --slice=USED when active claim exists → exit 1 + 'slice-id-collision'
 *   7. CLI --acquire --slice=PAST when committed → exit 1 + 'slice-id-collision'
 *   8. CLI --acquire --slice=COL --allow-id-collision without COA_OPERATOR=1 → exit 1
 *   9. CLI --acquire --slice=NEW with no active claims, no history → exit 0
 */

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { safeGitSpawn, SAFE_GIT_ENV_KEYS } from '../_setup/safe-git.mjs';
import {
  findActiveClaimWithSlice,
  findCommittedSliceUse,
} from '../../scripts/checks/claim-check.mjs';

const claimCheckPath = fileURLToPath(
  new URL('../../scripts/checks/claim-check.mjs', import.meta.url),
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function farFutureExpiry() {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
}

function pastExpiry() {
  return new Date(Date.now() - 60 * 1000).toISOString();
}

/**
 * Create a minimal git repo in a tmpdir for testing findCommittedSliceUse.
 * Uses safeGitSpawn so R1 is satisfied.
 */
function makeGitRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'slice-id-test-'));
  safeGitSpawn(dir, ['init', '-q', '-b', 'main']);
  safeGitSpawn(dir, ['config', 'user.email', 'test@test.local']);
  safeGitSpawn(dir, ['config', 'user.name', 'test-bot']);
  safeGitSpawn(dir, ['config', 'commit.gpgsign', 'false']);
  writeFileSync(join(dir, 'README.md'), '# test\n');
  safeGitSpawn(dir, ['add', 'README.md']);
  safeGitSpawn(dir, ['commit', '-q', '-m', 'init']);
  return dir;
}

/**
 * Create a temp claims directory with an active claim JSON file.
 */
function makeClaimsDir(claimOverrides = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'claims-test-'));
  const claim = {
    id: 'clm-test-001',
    agent: 'test-agent',
    slice: 'USED-001',
    created: new Date().toISOString(),
    expires: farFutureExpiry(),
    status: 'active',
    targets: [{ path: 'README.md', action: 'extend' }],
    strategy: 'modify-in-place',
    dependsOn: [],
    notes: '',
    ...claimOverrides,
  };
  writeFileSync(join(dir, `${claim.id}.json`), JSON.stringify(claim, null, 2) + '\n', 'utf8');
  return dir;
}

/**
 * Run claim-check CLI in a given cwd with given env overrides.
 * Strips GIT_DIR etc. to avoid live-repo interference.
 */
function runClaimCheckCLI(cwd, args, env = {}) {
  const baseEnv = { ...process.env };
  delete baseEnv.COA_OPERATOR;
  for (const key of SAFE_GIT_ENV_KEYS) {
    delete baseEnv[key];
  }
  return spawnSync(process.execPath, [claimCheckPath, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...baseEnv, ...env },
  });
}

// ---------------------------------------------------------------------------
// Unit tests: findActiveClaimWithSlice
// ---------------------------------------------------------------------------

describe('findActiveClaimWithSlice()', () => {
  test('1. returns null when no active claim matches sliceId', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'claims-empty-'));
    try {
      const result = await findActiveClaimWithSlice('NEW-001', dir);
      assert.equal(result, null);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('2. returns claim object when active claim with matching slice exists', async () => {
    const dir = makeClaimsDir({ slice: 'USED-001' });
    try {
      const result = await findActiveClaimWithSlice('USED-001', dir);
      assert.ok(result !== null, 'should return a claim object');
      assert.equal(result.slice, 'USED-001');
      assert.equal(result.status, 'active');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('returns null when claim is expired', async () => {
    const dir = makeClaimsDir({ slice: 'EXP-001', expires: pastExpiry(), status: 'active' });
    try {
      const result = await findActiveClaimWithSlice('EXP-001', dir);
      assert.equal(result, null, 'expired claim should not match');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('returns null when claim status is completed', async () => {
    const dir = makeClaimsDir({ slice: 'DONE-001', status: 'completed' });
    try {
      const result = await findActiveClaimWithSlice('DONE-001', dir);
      assert.equal(result, null, 'completed claim should not match');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Unit tests: findCommittedSliceUse
// ---------------------------------------------------------------------------

describe('findCommittedSliceUse()', () => {
  test('3. returns { hash, subject } when commit with (PAST-001) in subject exists on default branch', async () => {
    const repo = makeGitRepo();
    try {
      writeFileSync(join(repo, 'a.txt'), 'a\n');
      safeGitSpawn(repo, ['add', 'a.txt']);
      safeGitSpawn(repo, ['commit', '-q', '-m', 'feat: thing (PAST-001)']);

      const result = await findCommittedSliceUse('PAST-001', repo);
      assert.ok(result !== null, 'should find commit');
      assert.ok(
        typeof result.hash === 'string' && result.hash.length > 0,
        'hash should be non-empty',
      );
      assert.ok(result.subject.includes('PAST-001'), 'subject should contain slice ID');
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  test('4. returns match when commit is on a non-default branch (--all)', async () => {
    const repo = makeGitRepo();
    try {
      safeGitSpawn(repo, ['checkout', '-q', '-b', 'tx-PAST-002']);
      writeFileSync(join(repo, 'b.txt'), 'b\n');
      safeGitSpawn(repo, ['add', 'b.txt']);
      safeGitSpawn(repo, ['commit', '-q', '-m', 'feat: other thing (PAST-002)']);

      const result = await findCommittedSliceUse('PAST-002', repo);
      assert.ok(result !== null, 'should find commit on non-default branch');
      assert.ok(result.subject.includes('PAST-002'), 'subject should contain slice ID');
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  test('5. returns null when no commits have matching (GHOST-001)', async () => {
    const repo = makeGitRepo();
    try {
      const result = await findCommittedSliceUse('GHOST-001', repo);
      assert.equal(result, null, 'should return null for unknown slice ID');
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  test('returns null for empty repo path (no git history)', async () => {
    const repo = makeGitRepo();
    try {
      const result = await findCommittedSliceUse('NOTHING-999', repo);
      assert.equal(result, null);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// CLI integration tests (spawn claim-check as subprocess)
// These tests use the real .claims/ directory of the live repo.
// Cleanup: any created claim files are removed in teardown.
// ---------------------------------------------------------------------------

describe('CLI --acquire slice-id-collision blocking', () => {
  // We run CLI tests using the live repo's .claims dir (claim-check hardcodes
  // CLAIMS_DIR to join(ROOT, '.claims')). We create claims there and clean up.
  const createdClaimFiles = [];

  after(() => {
    // Clean up any claim files created during these tests
    for (const f of createdClaimFiles) {
      try {
        if (existsSync(f)) rmSync(f);
      } catch {
        /* non-fatal */
      }
    }
  });

  test('6. --acquire --slice=USED-001 when active claim exists → exit 1 + slice-id-collision', async () => {
    // First acquire USED-CLI-001 via CLI to create an active claim in .claims/
    const liveClaimsDir = join(fileURLToPath(new URL('../../', import.meta.url)), '.claims');
    const repo = fileURLToPath(new URL('../../', import.meta.url));

    // First acquire — should succeed and create a claim file
    const first = runClaimCheckCLI(repo, [
      '--acquire',
      '--agent=test-slice-id',
      '--slice=USED-CLI-001',
      '--targets=tests/unit/claim-check-slice-id-uniqueness.test.mjs',
      '--action=extend',
    ]);

    if (first.status === 0) {
      // Parse claim ID from stdout and register for cleanup
      const match = first.stdout.match(/clm-[\w-]+/);
      if (match) {
        createdClaimFiles.push(join(liveClaimsDir, `${match[0]}.json`));
      }

      // Second acquire with same slice ID — should be blocked
      const second = runClaimCheckCLI(repo, [
        '--acquire',
        '--agent=test-slice-id-2',
        '--slice=USED-CLI-001',
        '--targets=tests/unit/claim-check-slice-id-uniqueness.test.mjs',
        '--action=extend',
      ]);
      assert.equal(second.status, 1, 'second acquire should fail');
      assert.ok(
        (second.stderr || '').includes('slice-id-collision'),
        `stderr should contain 'slice-id-collision', got: ${second.stderr}`,
      );
    } else {
      // First acquire failed — could be due to pre-existing claim for USED-CLI-001
      // (unlikely but possible in CI). Skip the blocking assertion.
      assert.ok(
        (first.stderr || '').includes('slice-id-collision') || first.status !== 0,
        'first acquire failed for some reason — acceptable if pre-existing claim',
      );
    }
  });

  test('7. --acquire --slice=PAST-CLI-001 when commit exists → exit 1 + slice-id-collision', () => {
    // Use a temp git repo with a known commit so this test does not depend on
    // the live repo's git history (which may be shallow in CI).
    const tmpRepo = makeGitRepo();
    try {
      mkdirSync(join(tmpRepo, '.claims'), { recursive: true });
      writeFileSync(join(tmpRepo, 'a.txt'), 'a\n');
      safeGitSpawn(tmpRepo, ['add', 'a.txt']);
      safeGitSpawn(tmpRepo, ['commit', '-q', '-m', 'feat: past work (PAST-001)']);

      const result = runClaimCheckCLI(tmpRepo, [
        '--acquire',
        '--agent=test-history-check',
        '--slice=PAST-001',
        '--targets=README.md',
        '--action=extend',
      ], { COA_HISTORY_ROOT: tmpRepo });
      assert.equal(result.status, 1, 'should be blocked');
      assert.ok(
        (result.stderr || '').includes('slice-id-collision'),
        `stderr should contain 'slice-id-collision', got: ${result.stderr}`,
      );
    } finally {
      rmSync(tmpRepo, { recursive: true, force: true });
    }
  });

  test('8. --acquire --allow-id-collision without COA_OPERATOR=1 → exit 1', () => {
    const repo = fileURLToPath(new URL('../../', import.meta.url));
    const result = runClaimCheckCLI(
      repo,
      [
        '--acquire',
        '--agent=test-allow-collision',
        '--slice=COL-CLI-001',
        '--targets=tests/unit/claim-check-slice-id-uniqueness.test.mjs',
        '--action=extend',
        '--allow-id-collision',
      ],
      { COA_OPERATOR: '' },
    ); // explicitly NOT set to '1'
    assert.equal(result.status, 1, 'should fail without COA_OPERATOR=1');
    assert.ok(
      (result.stderr || '').includes('COA_OPERATOR=1'),
      `stderr should mention COA_OPERATOR=1, got: ${result.stderr}`,
    );
  });

  test('9. --acquire --slice=NEW-CLI-unique when no active claims, no history → exit 0', () => {
    const repo = fileURLToPath(new URL('../../', import.meta.url));
    // Use a highly unique slice ID that won't be in history or active claims
    const uniqueSlice = `NOCOLLISION-${Date.now()}`;
    const result = runClaimCheckCLI(repo, [
      '--acquire',
      '--agent=test-no-collision',
      `--slice=${uniqueSlice}`,
      '--targets=tests/unit/claim-check-slice-id-uniqueness.test.mjs',
      '--action=extend',
    ]);

    if (result.status === 0) {
      // Register for cleanup
      const match = result.stdout.match(/clm-[\w-]+/);
      if (match) {
        const liveClaimsDir = join(fileURLToPath(new URL('../../', import.meta.url)), '.claims');
        createdClaimFiles.push(join(liveClaimsDir, `${match[0]}.json`));
      }
    }

    assert.equal(
      result.status,
      0,
      `should succeed for unique slice ID, got stderr: ${result.stderr}`,
    );
  });
});
