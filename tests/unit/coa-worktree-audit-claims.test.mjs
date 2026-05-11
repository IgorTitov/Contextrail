/* @HEADER
 * @version 0.8.14 | 2026-05-11
 * @purpose Unit tests for --audit-claims subcommand: classification, execute path, operator gate (TPL-335 / ADR-0051).
 * @sidecar coa-worktree-audit-claims.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Tests for runAuditClaims (--audit-claims).
 *
 * Covers: history-confirmed, reserved-no-history (in-flight vs stale),
 * anomalous-numbering, --execute path, COA_OPERATOR gate.
 *
 * All git setup uses safeGit / safeGitSpawn (R1 / ADR-0015).
 *
 * @see docs/adr/0051-auto-picker-sanity-threshold.md
 */

import { describe, test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { safeGitSpawn } from '../_setup/safe-git.mjs';
import { runAuditClaims } from '../../scripts/coa-worktree.mjs';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeRepo(label) {
  const root = mkdtempSync(join(tmpdir(), `ac-${label}-`));
  safeGitSpawn(root, ['init', '-b', 'main']);
  safeGitSpawn(root, ['config', 'user.email', 'test@ac.local']);
  safeGitSpawn(root, ['config', 'user.name', 'AC Test']);
  safeGitSpawn(root, ['config', 'commit.gpgsign', 'false']);
  writeFileSync(join(root, 'init.txt'), 'init\n');
  safeGitSpawn(root, ['add', 'init.txt']);
  safeGitSpawn(root, ['commit', '-m', 'chore: init']);
  mkdirSync(join(root, '.claims'), { recursive: true });
  writeFileSync(join(root, '.claims', '.gitkeep'), '');
  return root;
}

function addCommit(root, message) {
  writeFileSync(join(root, `c-${Date.now()}-${Math.random()}.txt`), message);
  safeGitSpawn(root, ['add', '.']);
  safeGitSpawn(root, ['commit', '-m', message]);
}

function writeActiveClaim(root, sliceId, overrides = {}) {
  const claimsDir = join(root, '.claims');
  mkdirSync(claimsDir, { recursive: true });
  const id = `clm-ac-${sliceId.replace(/[^a-z0-9]/gi, '')}`;
  const claim = {
    id,
    agent: 'test-agent',
    slice: sliceId,
    targets: [],
    action: 'extend',
    status: 'active',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
  writeFileSync(join(claimsDir, `${id}.json`), JSON.stringify(claim, null, 2) + '\n');
  return { id, file: `${id}.json` };
}

// ---------------------------------------------------------------------------
// Test 1: history-confirmed classification
// ---------------------------------------------------------------------------

describe('runAuditClaims: history-confirmed', () => {
  let root;
  before(() => {
    root = makeRepo('t1');
    addCommit(root, 'feat(auth): implement login (TST-100)');
    writeActiveClaim(root, 'TST-100');
  });
  after(() => { try { rmSync(root, { recursive: true, force: true }); } catch { /* best effort */ } });

  test('TC1: claim whose slice is in git log → history-confirmed', () => {
    const { exitCode, rows } = runAuditClaims(root, {});
    assert.strictEqual(exitCode, 0);
    const row = rows.find((r) => r.slice === 'TST-100');
    assert.ok(row, 'row for TST-100 must exist');
    assert.strictEqual(row.classification, 'history-confirmed');
  });
});

// ---------------------------------------------------------------------------
// Test 2: reserved-no-history — fresh claim (< 6h) → likely in-flight
// ---------------------------------------------------------------------------

describe('runAuditClaims: reserved-no-history in-flight', () => {
  let root;
  before(() => {
    root = makeRepo('t2');
    addCommit(root, 'feat(auth): something (TST-010)');
    // TST-011 not in history, brand new claim
    writeActiveClaim(root, 'TST-011', { createdAt: new Date().toISOString() });
  });
  after(() => { try { rmSync(root, { recursive: true, force: true }); } catch { /* best effort */ } });

  test('TC2: fresh claim not in history → reserved-no-history (likely in-flight)', () => {
    const { exitCode, rows } = runAuditClaims(root, {});
    assert.strictEqual(exitCode, 0);
    const row = rows.find((r) => r.slice === 'TST-011');
    assert.ok(row, 'row for TST-011 must exist');
    assert.ok(
      row.classification.includes('in-flight'),
      `expected "in-flight" classification, got: ${row.classification}`,
    );
  });
});

// ---------------------------------------------------------------------------
// Test 3: reserved-no-history — stale claim (> 6h) → likely stale/orphaned
// ---------------------------------------------------------------------------

describe('runAuditClaims: reserved-no-history stale', () => {
  let root;
  before(() => {
    root = makeRepo('t3');
    addCommit(root, 'feat: something (OLD-010)');
    // OLD-011 not in history, 8h old
    const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();
    writeActiveClaim(root, 'OLD-011', { createdAt: eightHoursAgo });
  });
  after(() => { try { rmSync(root, { recursive: true, force: true }); } catch { /* best effort */ } });

  test('TC3: stale claim not in history → reserved-no-history (likely stale/orphaned)', () => {
    const { exitCode, rows } = runAuditClaims(root, {});
    assert.strictEqual(exitCode, 0);
    const row = rows.find((r) => r.slice === 'OLD-011');
    assert.ok(row, 'row for OLD-011 must exist');
    assert.ok(
      row.classification.includes('stale/orphaned'),
      `expected "stale/orphaned" classification, got: ${row.classification}`,
    );
  });
});

// ---------------------------------------------------------------------------
// Test 4: anomalous-numbering classification
// ---------------------------------------------------------------------------

describe('runAuditClaims: anomalous-numbering', () => {
  let root;
  before(() => {
    root = makeRepo('t4');
    addCommit(root, 'feat: something (ZVX-164)');
    // ZVX-999 is 835 above gitLogMax(164) — well over threshold
    writeActiveClaim(root, 'ZVX-999');
  });
  after(() => { try { rmSync(root, { recursive: true, force: true }); } catch { /* best effort */ } });

  test('TC4: claim whose numeric is way above git-log max → anomalous-numbering', () => {
    const { exitCode, rows } = runAuditClaims(root, {});
    assert.strictEqual(exitCode, 0);
    const row = rows.find((r) => r.slice === 'ZVX-999');
    assert.ok(row, 'row for ZVX-999 must exist');
    assert.strictEqual(row.classification, 'anomalous-numbering');
  });
});

// ---------------------------------------------------------------------------
// Test 5: --execute without COA_OPERATOR → refused
// ---------------------------------------------------------------------------

describe('runAuditClaims: --execute gate', () => {
  let root;
  before(() => {
    root = makeRepo('t5');
    writeActiveClaim(root, 'TST-999'); // anomalous
  });
  after(() => { try { rmSync(root, { recursive: true, force: true }); } catch { /* best effort */ } });

  test('TC5: --execute without COA_OPERATOR=1 returns exitCode 1', () => {
    const orig = process.env.COA_OPERATOR;
    delete process.env.COA_OPERATOR;
    try {
      const { exitCode } = runAuditClaims(root, { execute: true });
      assert.strictEqual(exitCode, 1, 'must refuse without COA_OPERATOR=1');
    } finally {
      if (orig !== undefined) process.env.COA_OPERATOR = orig;
    }
  });
});

// ---------------------------------------------------------------------------
// Test 6: --execute with COA_OPERATOR=1 expires anomalous claims
// ---------------------------------------------------------------------------

describe('runAuditClaims: --execute expires anomalous claims', () => {
  let root;
  let anomalousFile;
  let legitimateFile;
  before(() => {
    root = makeRepo('t6');
    addCommit(root, 'feat: something (ZVX-050)');
    // Anomalous
    const a = writeActiveClaim(root, 'ZVX-999');
    anomalousFile = join(root, '.claims', a.file);
    // Legitimate (in history)
    const l = writeActiveClaim(root, 'ZVX-050');
    legitimateFile = join(root, '.claims', l.file);
  });
  after(() => { try { rmSync(root, { recursive: true, force: true }); } catch { /* best effort */ } });

  test('TC6: --execute with COA_OPERATOR=1 expires anomalous claim, leaves legitimate intact', () => {
    const orig = process.env.COA_OPERATOR;
    process.env.COA_OPERATOR = '1';
    try {
      const { exitCode } = runAuditClaims(root, { execute: true });
      assert.strictEqual(exitCode, 0);
    } finally {
      if (orig === undefined) delete process.env.COA_OPERATOR;
      else process.env.COA_OPERATOR = orig;
    }

    // Anomalous claim must now be expired
    const anomalous = JSON.parse(readFileSync(anomalousFile, 'utf8'));
    assert.strictEqual(anomalous.status, 'expired', 'anomalous claim must be expired');
    assert.ok(anomalous.expiredAt, 'expiredAt must be set');

    // Legitimate claim must still be active
    const legitimate = JSON.parse(readFileSync(legitimateFile, 'utf8'));
    assert.strictEqual(legitimate.status, 'active', 'history-confirmed claim must remain active');
  });
});

// ---------------------------------------------------------------------------
// Test 7: no active claims → exits 0 with empty rows
// ---------------------------------------------------------------------------

describe('runAuditClaims: empty claims dir', () => {
  let root;
  before(() => { root = makeRepo('t7'); });
  after(() => { try { rmSync(root, { recursive: true, force: true }); } catch { /* best effort */ } });

  test('TC7: no active claims → exitCode 0, rows empty', () => {
    const { exitCode, rows } = runAuditClaims(root, {});
    assert.strictEqual(exitCode, 0);
    assert.strictEqual(rows.length, 0);
  });
});
