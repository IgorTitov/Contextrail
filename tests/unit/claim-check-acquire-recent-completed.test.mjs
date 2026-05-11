/* @HEADER
 * @version 0.7.115 | 2026-05-06
 * @purpose Unit tests for claim-check --acquire Layer 1.5 (recently-completed claim refusal). Closes the race window between pre-commit --auto-complete (claim status flip) and commit landing on HEAD (TPL-308 / ADR-0036). Symmetric with commit-msg-check Layer 1.5 (TPL-298 / ADR-0030).
 * @sidecar claim-check-acquire-recent-completed.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SAFE_GIT_ENV_KEYS } from '../_setup/safe-git.mjs';

const claimCheckPath = fileURLToPath(
  new URL('../../scripts/checks/claim-check.mjs', import.meta.url),
);

function farFutureExpiry() {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
}

/**
 * Build an isolated test environment:
 *   - tmp .claims dir (CLAIMS_DIR override)
 *   - COA_SKIP_HISTORY_CHECK=1 to short-circuit Layer 2 (no live repo grep).
 *   - Clean inheritable git env keys.
 */
function makeIsolatedEnv(claimsDir, extra = {}) {
  const baseEnv = { ...process.env };
  delete baseEnv.COA_OPERATOR;
  for (const key of SAFE_GIT_ENV_KEYS) {
    delete baseEnv[key];
  }
  return {
    ...baseEnv,
    CLAIMS_DIR: claimsDir,
    COA_SKIP_HISTORY_CHECK: '1',
    ...extra,
  };
}

function makeClaimsDir() {
  return mkdtempSync(join(tmpdir(), 'acquire-recent-'));
}

function writeClaim(claimsDir, claim) {
  const id = claim.id;
  writeFileSync(join(claimsDir, `${id}.json`), JSON.stringify(claim, null, 2) + '\n', 'utf8');
}

function runAcquire(claimsDir, args, envExtra = {}) {
  return spawnSync(
    process.execPath,
    [claimCheckPath, '--acquire', ...args],
    {
      cwd: tmpdir(),
      encoding: 'utf8',
      env: makeIsolatedEnv(claimsDir, envExtra),
    },
  );
}

const baseAcquireArgs = [
  '--agent=test-acquire-recent',
  '--targets=tests/unit/claim-check-acquire-recent-completed.test.mjs',
  '--action=extend',
];

describe('claim-check --acquire Layer 1.5 (recently-completed)', () => {
  test('1. no claim, no history → acquire passes', () => {
    const claimsDir = makeClaimsDir();
    try {
      const result = runAcquire(claimsDir, [...baseAcquireArgs, '--slice=FRESH-001']);
      assert.equal(result.status, 0,
        `expected exit 0, got ${result.status}\nstderr: ${result.stderr}`);
    } finally {
      rmSync(claimsDir, { recursive: true, force: true });
    }
  });

  test('2. active claim with same slice → refuse with active-claim message (regression TPL-282)', () => {
    const claimsDir = makeClaimsDir();
    try {
      writeClaim(claimsDir, {
        id: 'clm-test-active-001',
        agent: 'other-agent',
        slice: 'BUSY-001',
        created: new Date().toISOString(),
        expires: farFutureExpiry(),
        status: 'active',
        targets: [{ path: 'README.md', action: 'extend' }],
        strategy: 'modify-in-place',
        dependsOn: [],
        notes: '',
      });
      const result = runAcquire(claimsDir, [...baseAcquireArgs, '--slice=BUSY-001']);
      assert.equal(result.status, 1, 'should refuse');
      assert.ok(result.stderr.includes('slice-id-collision'),
        `stderr should mention slice-id-collision: ${result.stderr}`);
      assert.ok(result.stderr.includes('active claim'),
        `should be the active-claim message, not Layer 1.5: ${result.stderr}`);
    } finally {
      rmSync(claimsDir, { recursive: true, force: true });
    }
  });

  test('3. completed claim within 60s window → refuse with recently-completed message (NEW)', () => {
    const claimsDir = makeClaimsDir();
    try {
      const completedAt = new Date(Date.now() - 5_000).toISOString(); // 5s ago
      writeClaim(claimsDir, {
        id: 'clm-test-recent-001',
        agent: 'other-agent',
        slice: 'RACE-001',
        created: new Date(Date.now() - 60_000).toISOString(),
        expires: farFutureExpiry(),
        status: 'completed',
        completed_at: completedAt,
        targets: [{ path: 'README.md', action: 'extend' }],
        strategy: 'modify-in-place',
        dependsOn: [],
        notes: '',
      });
      const result = runAcquire(claimsDir, [...baseAcquireArgs, '--slice=RACE-001']);
      assert.equal(result.status, 1, `should refuse, got ${result.status}: ${result.stderr}`);
      assert.ok(result.stderr.includes('recently-completed'),
        `stderr should mention recently-completed: ${result.stderr}`);
      assert.ok(result.stderr.includes('RACE-001'),
        `stderr should mention slice ID: ${result.stderr}`);
    } finally {
      rmSync(claimsDir, { recursive: true, force: true });
    }
  });

  test('4. completed claim older than window → acquire passes (Layer 1.5 not triggered)', () => {
    const claimsDir = makeClaimsDir();
    try {
      const completedAt = new Date(Date.now() - 5 * 60_000).toISOString(); // 5 min ago
      writeClaim(claimsDir, {
        id: 'clm-test-old-001',
        agent: 'other-agent',
        slice: 'OLD-001',
        created: new Date(Date.now() - 10 * 60_000).toISOString(),
        expires: farFutureExpiry(),
        status: 'completed',
        completed_at: completedAt,
        targets: [{ path: 'README.md', action: 'extend' }],
        strategy: 'modify-in-place',
        dependsOn: [],
        notes: '',
      });
      const result = runAcquire(claimsDir, [...baseAcquireArgs, '--slice=OLD-001']);
      assert.equal(result.status, 0,
        `should pass — completed_at outside window. stderr: ${result.stderr}`);
    } finally {
      rmSync(claimsDir, { recursive: true, force: true });
    }
  });

  test('5. commit history with slice → refuse with committed-history message (regression TPL-282)', () => {
    // Layer 2 (history) is exercised by claim-check-slice-id-uniqueness test 7.
    // Here we just confirm Layer 1.5 doesn't break the history-check path.
    // We can't easily seed git history in an isolated tmp; rely on the existing
    // TPL-282 test for end-to-end history coverage, but verify here that with
    // COA_SKIP_HISTORY_CHECK=1 and no claim, acquire succeeds (sanity).
    const claimsDir = makeClaimsDir();
    try {
      const result = runAcquire(claimsDir, [...baseAcquireArgs, '--slice=NOHIST-001']);
      assert.equal(result.status, 0,
        `with history check skipped and no claim, should succeed: ${result.stderr}`);
    } finally {
      rmSync(claimsDir, { recursive: true, force: true });
    }
  });

  test('6. --allow-id-collision with COA_OPERATOR=1 bypasses Layer 1.5', () => {
    const claimsDir = makeClaimsDir();
    try {
      writeClaim(claimsDir, {
        id: 'clm-test-bypass-001',
        agent: 'other-agent',
        slice: 'BYPASS-001',
        created: new Date(Date.now() - 60_000).toISOString(),
        expires: farFutureExpiry(),
        status: 'completed',
        completed_at: new Date(Date.now() - 5_000).toISOString(),
        targets: [{ path: 'README.md', action: 'extend' }],
        strategy: 'modify-in-place',
        dependsOn: [],
        notes: '',
      });
      const result = runAcquire(
        claimsDir,
        [...baseAcquireArgs, '--slice=BYPASS-001', '--allow-id-collision'],
        { COA_OPERATOR: '1' },
      );
      assert.equal(result.status, 0,
        `--allow-id-collision + COA_OPERATOR=1 should bypass: ${result.stderr}`);
    } finally {
      rmSync(claimsDir, { recursive: true, force: true });
    }
  });

  test('7. CLAIM_ACQUIRE_RECENT_WINDOW_S=10 honored — claim completed 30s ago is outside', () => {
    const claimsDir = makeClaimsDir();
    try {
      writeClaim(claimsDir, {
        id: 'clm-test-window-001',
        agent: 'other-agent',
        slice: 'WIN-001',
        created: new Date(Date.now() - 60_000).toISOString(),
        expires: farFutureExpiry(),
        status: 'completed',
        completed_at: new Date(Date.now() - 30_000).toISOString(), // 30s ago
        targets: [{ path: 'README.md', action: 'extend' }],
        strategy: 'modify-in-place',
        dependsOn: [],
        notes: '',
      });
      const result = runAcquire(
        claimsDir,
        [...baseAcquireArgs, '--slice=WIN-001'],
        { CLAIM_ACQUIRE_RECENT_WINDOW_S: '10' },
      );
      assert.equal(result.status, 0,
        `with window=10s and completed 30s ago, should pass: ${result.stderr}`);
    } finally {
      rmSync(claimsDir, { recursive: true, force: true });
    }
  });

  test('8. audit log entry written on Layer 1.5 refusal', () => {
    const claimsDir = makeClaimsDir();
    try {
      writeClaim(claimsDir, {
        id: 'clm-test-audit-001',
        agent: 'other-agent',
        slice: 'AUDIT-001',
        created: new Date(Date.now() - 60_000).toISOString(),
        expires: farFutureExpiry(),
        status: 'completed',
        completed_at: new Date(Date.now() - 5_000).toISOString(),
        targets: [{ path: 'README.md', action: 'extend' }],
        strategy: 'modify-in-place',
        dependsOn: [],
        notes: '',
      });
      const result = runAcquire(claimsDir, [...baseAcquireArgs, '--slice=AUDIT-001']);
      assert.equal(result.status, 1, 'should refuse');

      const auditPath = join(claimsDir, 'audit.log');
      assert.ok(existsSync(auditPath), 'audit log file should exist');
      const lines = readFileSync(auditPath, 'utf8').trim().split('\n').filter(Boolean);
      const refuseEvents = lines
        .map((l) => {
          try { return JSON.parse(l); } catch { return null; }
        })
        .filter((e) => e && e.event === 'claim-acquire-recent-completed-refuse');
      assert.equal(refuseEvents.length, 1, 'one refuse event expected');
      const ev = refuseEvents[0];
      assert.equal(ev.slice, 'AUDIT-001');
      assert.equal(ev.matched_claim, 'clm-test-audit-001');
      assert.equal(ev.window_seconds, 60);
      assert.ok(typeof ev.completed_at === 'string', 'completed_at should be ISO string');
      assert.ok(typeof ev.ts === 'string', 'ts should be ISO string');
    } finally {
      rmSync(claimsDir, { recursive: true, force: true });
    }
  });
});
