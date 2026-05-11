/* @HEADER
 * @version 0.8.14 | 2026-05-11
 * @purpose Integration tests for coa-worktree auto-pick mode (TPL-280 / ADR-0029) — verifies next-free slice ID selection from history + active claims, prefix override, conflict rejection, and stdout announcement.
 * @sidecar coa-worktree-auto-pick.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Auto-pick integration tests (TPL-280).
 *
 * Tests cover: empty history, history-only scan, history+claims scan,
 * race-simulation retry, prefix override, --slice+--auto-pick conflict,
 * and stdout announcement line.
 *
 * All git setup uses safeGit / safeGitSpawn (R1, ADR-0015). The tests
 * call exported helpers directly rather than spawning subprocesses to
 * keep the suite fast and deterministic. claim-check --acquire is
 * bypassed via skipSliceCheck:true where the test objective is the
 * scan logic, not the claim atomicity.
 *
 * @see docs/adr/0029-coa-worktree-auto-pick.md
 */

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { safeGitSpawn } from '../_setup/safe-git.mjs';
import {
  autoPickNextSliceId,
  detectDefaultPrefix,
  runCreate,
  AUTO_PICK_ANOMALY_THRESHOLD,
} from '../../scripts/coa-worktree.mjs';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeRepo(label) {
  const root = mkdtempSync(join(tmpdir(), `ap-${label}-`));
  safeGitSpawn(root, ['init', '-b', 'main']);
  safeGitSpawn(root, ['config', 'user.email', 'test@ap.local']);
  safeGitSpawn(root, ['config', 'user.name', 'AP Test']);
  safeGitSpawn(root, ['config', 'commit.gpgsign', 'false']);
  writeFileSync(join(root, 'init.txt'), 'init\n');
  safeGitSpawn(root, ['add', 'init.txt']);
  safeGitSpawn(root, ['commit', '-m', 'chore: init']);
  mkdirSync(join(root, '.claims'), { recursive: true });
  writeFileSync(join(root, '.claims', '.gitkeep'), '');
  return root;
}

function addCommit(root, message) {
  writeFileSync(join(root, `c-${Date.now()}.txt`), message);
  safeGitSpawn(root, ['add', '.']);
  safeGitSpawn(root, ['commit', '-m', message]);
}

/** Write a minimal active claim JSON to simulate another session holding an ID. */
function writeActiveClaim(root, sliceId) {
  const claimsDir = join(root, '.claims');
  mkdirSync(claimsDir, { recursive: true });
  const id = `clm-ap-${sliceId.replace(/[^a-z0-9]/gi, '')}`;
  writeFileSync(join(claimsDir, `${id}.json`), JSON.stringify({
    id,
    agent: 'test-agent',
    slice: sliceId,
    targets: [],
    action: 'extend',
    status: 'active',
    createdAt: new Date().toISOString(),
  }, null, 2) + '\n');
  return id;
}

// ---------------------------------------------------------------------------
// Test 1: Empty history + no active claims → picks PREFIX-001
// ---------------------------------------------------------------------------

describe('autoPickNextSliceId: empty repo', () => {
  let root;
  before(() => { root = makeRepo('t1'); });
  after(() => { try { rmSync(root, { recursive: true, force: true }); } catch { /* best effort */ } });

  test('T1: picks PREFIX-001 when no history and no claims', () => {
    const id = autoPickNextSliceId(root, 'TST', join(root, '.claims'));
    assert.strictEqual(id, 'TST-001');
  });
});

// ---------------------------------------------------------------------------
// Test 2: History has TPL-100, no active claims → picks TPL-101
// ---------------------------------------------------------------------------

describe('autoPickNextSliceId: history scan', () => {
  let root;
  before(() => {
    root = makeRepo('t2');
    addCommit(root, 'feat(auth): implement login (TPL-100)');
  });
  after(() => { try { rmSync(root, { recursive: true, force: true }); } catch { /* best effort */ } });

  test('T2: picks max+1 from history when no active claims', () => {
    const id = autoPickNextSliceId(root, 'TPL', join(root, '.claims'));
    assert.strictEqual(id, 'TPL-101');
  });
});

// ---------------------------------------------------------------------------
// Test 3: History has TPL-100, active claim TPL-101 → picks TPL-102
// ---------------------------------------------------------------------------

describe('autoPickNextSliceId: history + active claim', () => {
  let root;
  before(() => {
    root = makeRepo('t3');
    addCommit(root, 'feat(auth): implement login (TPL-100)');
    writeActiveClaim(root, 'TPL-101');
  });
  after(() => { try { rmSync(root, { recursive: true, force: true }); } catch { /* best effort */ } });

  test('T3: picks max(history,claims)+1 when active claim exists', () => {
    const id = autoPickNextSliceId(root, 'TPL', join(root, '.claims'));
    assert.strictEqual(id, 'TPL-102');
  });

  test('T3b: second call with additional claim advances further', () => {
    writeActiveClaim(root, 'TPL-102');
    const id = autoPickNextSliceId(root, 'TPL', join(root, '.claims'));
    assert.strictEqual(id, 'TPL-103');
  });
});

// ---------------------------------------------------------------------------
// Test 4: Race simulation — auto-pick retries when initial candidate is
// already claimed (claims accumulate between scan and acquire).
// ---------------------------------------------------------------------------

describe('autoPickNextSliceId: retry on collision (race simulation)', () => {
  let root;
  before(() => {
    root = makeRepo('t4');
  });
  after(() => { try { rmSync(root, { recursive: true, force: true }); } catch { /* best effort */ } });

  test('T4: two sequential auto-picks see different IDs when claims accumulate', () => {
    // First auto-pick: no history, no claims → TST-001
    const id1 = autoPickNextSliceId(root, 'TST', join(root, '.claims'));
    assert.strictEqual(id1, 'TST-001');

    // Simulate that id1 was claimed by another session
    writeActiveClaim(root, id1);

    // Second auto-pick: sees TST-001 as active → picks TST-002
    const id2 = autoPickNextSliceId(root, 'TST', join(root, '.claims'));
    assert.strictEqual(id2, 'TST-002');
    assert.notEqual(id2, id1, 'second pick must differ from first');
  });
});

// ---------------------------------------------------------------------------
// Test 5: --auto-pick-prefix=AIC override works
// ---------------------------------------------------------------------------

describe('autoPickNextSliceId: prefix override', () => {
  let root;
  before(() => {
    root = makeRepo('t5');
    // Config declares prefix 'TPL'; detectDefaultPrefix reads config, not git history
    mkdirSync(join(root, '.coa'), { recursive: true });
    writeFileSync(join(root, '.coa', 'slice-id-config.json'), JSON.stringify({ prefix: 'TPL' }, null, 2) + 
'', 'utf8');
    addCommit(root, 'feat: initial (TPL-100)');
  });
  after(() => { try { rmSync(root, { recursive: true, force: true }); } catch { /* best effort */ } });

  test('T5: --auto-pick-prefix=AIC overrides config TPL prefix', () => {
    // Config declares TPL; detectDefaultPrefix reads from config
    const detected = detectDefaultPrefix(root);
    assert.strictEqual(detected, 'TPL', 'pre-condition: config prefix is TPL');

    const id = autoPickNextSliceId(root, 'AIC', join(root, '.claims'));
    assert.ok(id.startsWith('AIC-'), `expected AIC- prefix, got ${id}`);
    assert.strictEqual(id, 'AIC-001');
  });

  test('T5b: runCreate with autoPickPrefix=AIC picks AIC-001', () => {
    const { exitCode, result } = runCreate(root, {
      autoPick: true,
      autoPickPrefix: 'AIC',
      skipSliceCheck: true,
      silent: true,
    });
    assert.strictEqual(exitCode, 0, `runCreate failed: ${result?.error}`);
    assert.ok(result.autoPicked, 'result must have autoPicked field');
    assert.ok(result.autoPicked.startsWith('AIC-'), `expected AIC- prefix, got ${result.autoPicked}`);
  });
});

// ---------------------------------------------------------------------------
// Test 6: --slice= AND --auto-pick → refused with clear error
// ---------------------------------------------------------------------------

describe('runCreate: --slice + --auto-pick conflict', () => {
  let root;
  before(() => { root = makeRepo('t6'); });
  after(() => { try { rmSync(root, { recursive: true, force: true }); } catch { /* best effort */ } });

  test('T6: refused when both --slice and --auto-pick are set', () => {
    const { exitCode, result } = runCreate(root, {
      sliceId: 'TPL-100',
      autoPick: true,
      skipSliceCheck: true,
      silent: true,
    });
    assert.strictEqual(exitCode, 1);
    assert.ok(
      result.error.includes('mutually exclusive'),
      `expected "mutually exclusive" in error, got: ${result.error}`,
    );
  });
});

// ---------------------------------------------------------------------------
// Test 7: stdout includes [coa-worktree] auto-picked: <ID> line
// ---------------------------------------------------------------------------

describe('runCreate: auto-pick stdout announcement', () => {
  let root;
  before(() => { root = makeRepo('t7'); });
  after(() => { try { rmSync(root, { recursive: true, force: true }); } catch { /* best effort */ } });

  test('T7: result.autoPicked is set when auto-pick mode fires', () => {
    const { exitCode, result } = runCreate(root, {
      autoPick: true,
      autoPickPrefix: 'TST',
      skipSliceCheck: true,
      silent: true,
    });
    assert.strictEqual(exitCode, 0, `runCreate failed: ${result?.error}`);
    assert.ok(result.autoPicked, 'result must have autoPicked field');
    assert.ok(
      result.autoPicked.startsWith('TST-'),
      `expected TST- prefix, got ${result.autoPicked}`,
    );
  });

  test('T7b: stdout line emitted in non-silent mode', () => {
    const lines = [];
    const origWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = (chunk, ...rest) => {
      lines.push(String(chunk));
      return origWrite(chunk, ...rest);
    };
    try {
      const { exitCode } = runCreate(root, {
        autoPick: true,
        autoPickPrefix: 'ANN',
        skipSliceCheck: true,
        silent: false,
      });
      assert.strictEqual(exitCode, 0);
    } finally {
      process.stdout.write = origWrite;
    }
    const autoPickLine = lines.find((l) => l.includes('[coa-worktree] auto-picked:'));
    assert.ok(
      autoPickLine,
      `expected "[coa-worktree] auto-picked:" in stdout. Got:\n${lines.join('')}`,
    );
  });

  test('T7c: default create (no --slice, no --name) auto-picks', () => {
    const { exitCode, result } = runCreate(root, {
      autoPickPrefix: 'DEF',
      skipSliceCheck: true,
      silent: true,
    });
    assert.strictEqual(exitCode, 0, `runCreate failed: ${result?.error}`);
    assert.ok(result.autoPicked, 'result.autoPicked must be set for default create');
    assert.ok(result.autoPicked.startsWith('DEF-'), `expected DEF- prefix, got ${result.autoPicked}`);
  });
});

// ---------------------------------------------------------------------------
// Test 8: Anomaly threshold guard (TPL-335 / ADR-0051)
// ---------------------------------------------------------------------------

describe('autoPickNextSliceId: anomaly threshold guard', () => {
  let root;
  before(() => {
    root = makeRepo('t8');
    // git history: TST-164
    addCommit(root, 'feat(auth): something (TST-164)');
  });
  after(() => { try { rmSync(root, { recursive: true, force: true }); } catch { /* best effort */ } });

  test('T8a: gap within threshold (claim=214, git=164, diff=50) accepts', () => {
    // claimMaxN = gitLogMaxN + ANOMALY_THRESHOLD → exactly at boundary (not over)
    writeActiveClaim(root, `TST-${164 + AUTO_PICK_ANOMALY_THRESHOLD}`);
    const id = autoPickNextSliceId(root, 'TST', join(root, '.claims'));
    assert.ok(id.startsWith('TST-'), `expected TST- prefix, got ${id}`);
    const num = Number(id.split('-')[1]);
    assert.ok(num > 164, `expected num > 164, got ${num}`);
  });

  test('T8b: gap over threshold (claim=999, git=164, diff=835) throws anomaly error', () => {
    writeActiveClaim(root, 'TST-999');
    assert.throws(
      () => autoPickNextSliceId(root, 'TST', join(root, '.claims')),
      (err) => {
        assert.ok(err.anomaly === true, 'err.anomaly must be true');
        assert.ok(err.message.includes('auto-pick refused'), `unexpected message: ${err.message}`);
        assert.ok(err.message.includes('TST-999'), `message must include claim max: ${err.message}`);
        return true;
      },
    );
  });

  test('T8c: --allow-claim-bump opts override bypasses anomaly guard', () => {
    // TST-999 claim still present from T8b
    const id = autoPickNextSliceId(root, 'TST', join(root, '.claims'), { allowClaimBump: true });
    assert.ok(id.startsWith('TST-'), `expected TST- prefix, got ${id}`);
    const num = Number(id.split('-')[1]);
    assert.ok(num > 999, `expected num > 999 (claim-derived), got ${num}`);
  });

  test('T8d: COA_ALLOW_CLAIM_BUMP=1 env bypasses anomaly guard', () => {
    const orig = process.env.COA_ALLOW_CLAIM_BUMP;
    process.env.COA_ALLOW_CLAIM_BUMP = '1';
    try {
      const id = autoPickNextSliceId(root, 'TST', join(root, '.claims'));
      assert.ok(id.startsWith('TST-'), `expected TST- prefix, got ${id}`);
    } finally {
      if (orig === undefined) delete process.env.COA_ALLOW_CLAIM_BUMP;
      else process.env.COA_ALLOW_CLAIM_BUMP = orig;
    }
  });

  test('T8e: runCreate surfaces anomaly error as exitCode=1', () => {
    // TST-999 claim still present; anomaly guard fires in runCreate
    const { exitCode, result } = runCreate(root, {
      autoPick: true,
      autoPickPrefix: 'TST',
      skipSliceCheck: true,
      silent: true,
    });
    assert.strictEqual(exitCode, 1, 'runCreate must fail when anomaly detected');
    assert.ok(
      result.error.includes('auto-pick refused'),
      `expected anomaly message, got: ${result.error}`,
    );
  });

  test('T8f: runCreate with allowClaimBump:true succeeds despite anomaly', () => {
    const { exitCode, result } = runCreate(root, {
      autoPick: true,
      autoPickPrefix: 'TST',
      skipSliceCheck: true,
      silent: true,
      allowClaimBump: true,
    });
    assert.strictEqual(exitCode, 0, `runCreate must succeed with allowClaimBump: ${result?.error}`);
    assert.ok(result.autoPicked, 'result.autoPicked must be set');
    const num = Number(result.autoPicked.split('-')[1]);
    assert.ok(num > 999, `expected num > 999 (claim-derived), got ${num}`);
  });
});
