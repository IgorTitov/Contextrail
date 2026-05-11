/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose End-to-end integration tests for R2 / ADR-0017 — transport-branch enforcement at pre-commit and the marker-gated ceremony bump path; uses safeGit (R1, ADR-0015) for every git invocation.
 * @sidecar transport-branch-flow.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * R2 transport-branch enforcement integration tests.
 *
 * Every git invocation goes through safeGit / safeGitSpawn. Static + runtime
 * R1 guards reject inline execSync('git ...') here.
 *
 * The tests build small repos under tmpdir(), put them onto various branch
 * shapes (trunk, tx-<slice>, banned shapes), stage representative file sets
 * (code-only, ceremony-only, mixed), and call the exported runPreCommit
 * helper from scripts/checks/transport-branch-check.mjs with the tmp repo as
 * repoRoot. They assert on the returned result struct AND on filesystem
 * state (marker presence, branch existence after ff-push).
 *
 * @see docs/adr/0017-transport-branch-enforcement.md
 * @see docs/adr/0015-test-isolation-enforcement.md
 */

import { describe, test, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync, mkdirSync, writeFileSync, readFileSync,
  existsSync, rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import { spawnSync } from 'node:child_process';

import { safeGit, safeGitSpawn } from '../_setup/safe-git.mjs';
import {
  runPreCommit,
} from '../../scripts/checks/transport-branch-check.mjs';
import {
  mergingMarkerPath,
  mergingMarkerContent,
  isValidSliceId,
  transportBranchNameForSlice,
  parseWorktreeListPorcelain,
  findMainWorktree,
  checkUpdateInsteadConfig,
  classifyFfUpdateMethod,
  FF_UPDATE_METHODS,
  composeUpdateInsteadSetupHint,
} from '../../scripts/lib/transport-branch.mjs';
import {
  classifyCoaMergeMode,
} from '../../scripts/coa-merge.mjs';

// ---------------------------------------------------------------------------
// Fixture helpers — every git call goes through safeGit/safeGitSpawn (R1).
// ---------------------------------------------------------------------------

/**
 * Bare-style fixture: a git-init'd repo with one initial commit on main,
 * a small file set, and conventional config so safeGit invocations succeed
 * deterministically. Returns { root }.
 */
function createBaseRepo(label) {
  const root = mkdtempSync(join(tmpdir(), `r2-${label}-`));
  safeGitSpawn(root, ['init', '-b', 'main']);
  safeGitSpawn(root, ['config', 'user.email', 'test@r2.local']);
  safeGitSpawn(root, ['config', 'user.name', 'R2 Test']);
  safeGitSpawn(root, ['config', 'commit.gpgsign', 'false']);

  // .claims dir exists in real repos — the marker check uses
  // <repoRoot>/.claims/.coa-merging.lock, so make the parent dir
  // available even when no marker is written.
  mkdirSync(join(root, '.claims'), { recursive: true });

  // Seed file plus VERSION + CHANGELOG so we can stage ceremony-shaped
  // sets later without git complaining about missing files.
  writeFileSync(join(root, 'README.md'), '# fixture\n');
  writeFileSync(join(root, 'VERSION'), '0.0.1\n');
  writeFileSync(
    join(root, 'CHANGELOG.md'),
    '# Changelog\n\n## [Unreleased]\n\n- seed\n',
  );
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({ name: 'r2-fixture', version: '0.0.1' }, null, 2) + '\n',
  );
  safeGitSpawn(root, ['add', 'README.md', 'VERSION', 'CHANGELOG.md', 'package.json']);
  safeGitSpawn(root, ['commit', '-m', 'init']);
  return { root };
}

/**
 * Switch the fixture's primary worktree to a branch matching `branchName`,
 * creating it from main when needed. The integration tests stay inside
 * tmpdir so all writes remain R1-clean.
 */
function checkoutBranch(root, branchName) {
  safeGitSpawn(root, ['checkout', '-B', branchName, 'main']);
}

/**
 * Stage one or more existing files in the fixture. `git add` is called
 * through safeGitSpawn so cwd stays constrained.
 */
function stage(root, files) {
  safeGitSpawn(root, ['add', ...files]);
}

/**
 * Modify a file in the fixture to make `git add` non-trivial (otherwise
 * staging an unchanged file is a no-op). Appends a small marker line.
 */
function touchFile(root, path, marker) {
  const full = join(root, path);
  const text = existsSync(full) ? readFileSync(full, 'utf8') : '';
  writeFileSync(full, text + (marker ? `\n# ${marker}\n` : '\n# touched\n'));
}

/**
 * Write a fresh, valid marker for a given branch with a chosen pid + ts.
 * Defaults to the current process pid and now (so the checker's
 * parent-PID heuristic is exercised under realistic conditions).
 */
function writeMarker(root, { branch, pid = process.pid, ts = Date.now() }) {
  mkdirSync(join(root, '.claims'), { recursive: true });
  writeFileSync(
    mergingMarkerPath(root),
    mergingMarkerContent({ pid, branch, ts }),
    'utf8',
  );
}

function removeMarker(root) {
  try { rmSync(mergingMarkerPath(root)); } catch { /* best-effort */ }
}

// ---------------------------------------------------------------------------
// Tests — pre-commit gate behaviour
// ---------------------------------------------------------------------------

describe('runPreCommit — branch-shape gate', () => {
  let fixture;
  beforeEach(() => { fixture = createBaseRepo('branch-shape'); });
  afterEach(() => { rmSync(fixture.root, { recursive: true, force: true }); });

  test('1. main branch + plain code commit → pass', () => {
    touchFile(fixture.root, 'README.md', 'code-edit');
    stage(fixture.root, ['README.md']);
    const { exitCode, result } = runPreCommit({
      repoRoot: fixture.root, silent: true,
    });
    assert.equal(exitCode, 0);
    assert.equal(result.ok, true);
    assert.equal(result.mode, 'trunk');
  });

  test('2. tx-TPL-234 + plain code commit → pass (transport-code)', () => {
    checkoutBranch(fixture.root, 'tx-TPL-234');
    touchFile(fixture.root, 'README.md', 'code-edit');
    stage(fixture.root, ['README.md']);
    const { exitCode, result } = runPreCommit({
      repoRoot: fixture.root, silent: true,
    });
    assert.equal(exitCode, 0);
    assert.equal(result.mode, 'transport-code');
  });

  test('3. feature/foo branch → REFUSE with banned-pattern reason', () => {
    checkoutBranch(fixture.root, 'feature/foo');
    touchFile(fixture.root, 'README.md');
    stage(fixture.root, ['README.md']);
    const { exitCode, result } = runPreCommit({
      repoRoot: fixture.root, silent: true,
    });
    assert.equal(exitCode, 1);
    assert.equal(result.ok, false);
    assert.match(result.reason, /trunk-based delivery/);
    assert.equal(result.banned, 'feature/ branches violate trunk-based delivery (ADR-0002)');
  });

  test('4. tpl234-backport branch → REFUSE with banned-pattern reason', () => {
    checkoutBranch(fixture.root, 'tpl234-backport');
    touchFile(fixture.root, 'README.md');
    stage(fixture.root, ['README.md']);
    const { exitCode, result } = runPreCommit({
      repoRoot: fixture.root, silent: true,
    });
    assert.equal(exitCode, 1);
    assert.match(result.reason, /anti-pattern/);
  });

  test('5. random non-tx, non-banned branch → REFUSE generic message', () => {
    checkoutBranch(fixture.root, 'experiments/local');
    touchFile(fixture.root, 'README.md');
    stage(fixture.root, ['README.md']);
    const { exitCode, result } = runPreCommit({
      repoRoot: fixture.root, silent: true,
    });
    assert.equal(exitCode, 1);
    assert.match(result.reason, /neither trunk.*nor a transport branch/);
  });

  test('6. tx-tpl-234 (lowercase project) → REFUSE (regex strict on case)', () => {
    checkoutBranch(fixture.root, 'tx-tpl-234');
    touchFile(fixture.root, 'README.md');
    stage(fixture.root, ['README.md']);
    const { exitCode, result } = runPreCommit({
      repoRoot: fixture.root, silent: true,
    });
    assert.equal(exitCode, 1);
    assert.match(result.reason, /neither trunk.*nor a transport branch/);
  });
});

describe('runPreCommit — ceremony-marker gate', () => {
  let fixture;
  beforeEach(() => {
    fixture = createBaseRepo('marker');
    checkoutBranch(fixture.root, 'tx-TPL-234');
  });
  afterEach(() => { rmSync(fixture.root, { recursive: true, force: true }); });

  test('7. tx-* + VERSION staged but NO marker → REFUSE', () => {
    writeFileSync(join(fixture.root, 'VERSION'), '0.0.2\n');
    stage(fixture.root, ['VERSION']);
    const { exitCode, result } = runPreCommit({
      repoRoot: fixture.root, silent: true,
    });
    assert.equal(exitCode, 1);
    assert.match(result.reason, /Refusing to commit ceremony files/);
    assert.match(result.markerError, /no .*\.coa-merging\.lock marker/);
  });

  test('8. tx-* + ceremony staged + valid fresh marker → PASS', () => {
    writeFileSync(join(fixture.root, 'VERSION'), '0.0.2\n');
    stage(fixture.root, ['VERSION']);
    writeMarker(fixture.root, { branch: 'tx-TPL-234' });
    const { exitCode, result } = runPreCommit({
      repoRoot: fixture.root, silent: true,
    });
    assert.equal(exitCode, 0);
    assert.equal(result.mode, 'transport-ceremony');
    assert.deepEqual(result.ceremonyHits, ['VERSION']);
    removeMarker(fixture.root);
  });

  test('9. tx-* + ceremony staged + marker for DIFFERENT branch → REFUSE', () => {
    writeFileSync(join(fixture.root, 'VERSION'), '0.0.2\n');
    stage(fixture.root, ['VERSION']);
    writeMarker(fixture.root, { branch: 'tx-TPL-999' });
    const { exitCode, result } = runPreCommit({
      repoRoot: fixture.root, silent: true,
    });
    assert.equal(exitCode, 1);
    assert.match(result.markerError, /marker is for branch.*tx-TPL-999/);
    removeMarker(fixture.root);
  });

  test('10. tx-* + ceremony staged + marker > 5 minutes old → REFUSE', () => {
    writeFileSync(join(fixture.root, 'VERSION'), '0.0.2\n');
    stage(fixture.root, ['VERSION']);
    writeMarker(fixture.root, {
      branch: 'tx-TPL-234',
      ts: Date.now() - 10 * 60 * 1000, // 10 min ago
    });
    const { exitCode, result } = runPreCommit({
      repoRoot: fixture.root, silent: true,
    });
    assert.equal(exitCode, 1);
    assert.match(result.markerError, /marker is \d+s old/);
    removeMarker(fixture.root);
  });

  test('11. tx-* + ceremony staged + corrupt marker → REFUSE', () => {
    writeFileSync(join(fixture.root, 'VERSION'), '0.0.2\n');
    stage(fixture.root, ['VERSION']);
    writeFileSync(mergingMarkerPath(fixture.root), 'not json');
    const { exitCode, result } = runPreCommit({
      repoRoot: fixture.root, silent: true,
    });
    assert.equal(exitCode, 1);
    assert.match(result.markerError, /malformed/);
    removeMarker(fixture.root);
  });

  test('12. tx-* + plain code commit (no ceremony) → PASS without needing marker', () => {
    touchFile(fixture.root, 'README.md', 'wip');
    stage(fixture.root, ['README.md']);
    // Importantly, no marker is written — code-only commits don't need one.
    assert.equal(existsSync(mergingMarkerPath(fixture.root)), false);
    const { exitCode, result } = runPreCommit({
      repoRoot: fixture.root, silent: true,
    });
    assert.equal(exitCode, 0);
    assert.equal(result.mode, 'transport-code');
  });

  test('13. tx-* + ceremony with marker.pid not in PID chain → REFUSE', () => {
    // 1 is init on POSIX, system-idle on Windows — guaranteed not to be
    // a parent of the test process.
    writeFileSync(join(fixture.root, 'VERSION'), '0.0.2\n');
    stage(fixture.root, ['VERSION']);
    writeMarker(fixture.root, { branch: 'tx-TPL-234', pid: 1 });
    const { exitCode, result } = runPreCommit({
      repoRoot: fixture.root, silent: true,
    });
    // ancestorPids() may fail on the test platform — when the chain
    // probe fails the checker soft-passes with a stderr warning. The
    // negative case requires the chain to be observable AND mismatched.
    // We accept either outcome — both are documented behaviours — but
    // assert that a refusal carries the correct message shape.
    if (exitCode === 1) {
      assert.match(result.markerError, /marker's pid \d+ is not an ancestor/);
    } else {
      assert.equal(result.note, 'pid-chain-unknown');
    }
    removeMarker(fixture.root);
  });
});

describe('runPreCommit — main + ceremony stays the trunk-direct path', () => {
  let fixture;
  beforeEach(() => { fixture = createBaseRepo('main-ceremony'); });
  afterEach(() => { rmSync(fixture.root, { recursive: true, force: true }); });

  test('14. main + VERSION staged WITHOUT marker → PASS (trunk-direct preserved)', () => {
    writeFileSync(join(fixture.root, 'VERSION'), '0.0.2\n');
    stage(fixture.root, ['VERSION']);
    const { exitCode, result } = runPreCommit({
      repoRoot: fixture.root, silent: true,
    });
    assert.equal(exitCode, 0);
    assert.equal(result.mode, 'trunk');
  });
});

// ---------------------------------------------------------------------------
// Tests — coa-worktree --slice= autogeneration
// ---------------------------------------------------------------------------

describe('coa-worktree slice helpers (pure logic surface)', () => {
  test('15. transportBranchNameForSlice("TPL-234") → "tx-TPL-234"', () => {
    assert.equal(transportBranchNameForSlice('TPL-234'), 'tx-TPL-234');
  });
  test('16. transportBranchNameForSlice on bad input throws', () => {
    assert.throws(() => transportBranchNameForSlice('foo'));
    assert.throws(() => transportBranchNameForSlice('tpl-234'));
    assert.throws(() => transportBranchNameForSlice(null));
  });
  test('17. isValidSliceId accepts standard + suffixed forms', () => {
    assert.equal(isValidSliceId('TPL-234'), true);
    assert.equal(isValidSliceId('TPL-227-interim'), true);
    assert.equal(isValidSliceId('AIC-088'), true);
    assert.equal(isValidSliceId('tpl-234'), false);
    assert.equal(isValidSliceId('TPL'), false);
    assert.equal(isValidSliceId(''), false);
  });
});

// ---------------------------------------------------------------------------
// Tests — coa-merge mode classification (pure)
// ---------------------------------------------------------------------------

describe('coa-merge classifyCoaMergeMode', () => {
  test('18. main → trunk', () => {
    assert.equal(classifyCoaMergeMode('main'), 'trunk');
  });
  test('19. master → trunk', () => {
    assert.equal(classifyCoaMergeMode('master'), 'trunk');
  });
  test('20. tx-TPL-234 → transport', () => {
    assert.equal(classifyCoaMergeMode('tx-TPL-234'), 'transport');
  });
  test('21. tx-TPL-227-interim → transport', () => {
    assert.equal(classifyCoaMergeMode('tx-TPL-227-interim'), 'transport');
  });
  test('22. feature/foo → unknown', () => {
    assert.equal(classifyCoaMergeMode('feature/foo'), 'unknown');
  });
  test('23. tpl234-backport → unknown', () => {
    assert.equal(classifyCoaMergeMode('tpl234-backport'), 'unknown');
  });
  test('24. invalid → unknown', () => {
    assert.equal(classifyCoaMergeMode(''), 'unknown');
    assert.equal(classifyCoaMergeMode(null), 'unknown');
  });
});

// ---------------------------------------------------------------------------
// Tests — anti-evasion: concurrent coa-merge marker race
// ---------------------------------------------------------------------------

describe('marker as mutex — second concurrent coa-merge sees existing marker', () => {
  let fixture;
  beforeEach(() => {
    fixture = createBaseRepo('marker-race');
    checkoutBranch(fixture.root, 'tx-TPL-234');
  });
  afterEach(() => { rmSync(fixture.root, { recursive: true, force: true }); });

  test('25. existing marker is observable to a second runPreCommit', () => {
    // First run writes a marker for the ceremony; second run reads it.
    writeMarker(fixture.root, { branch: 'tx-TPL-234' });
    const { exitCode, result } = runPreCommit({
      repoRoot: fixture.root, silent: true,
    });
    // No ceremony files staged → marker presence doesn't gate the
    // simple code-commit case, but it stays on disk for the race
    // semantics.
    assert.equal(exitCode, 0);
    assert.ok(existsSync(mergingMarkerPath(fixture.root)),
      'marker file should still exist after pre-commit check');
    // Now stage a ceremony file and confirm the same marker authorizes.
    writeFileSync(join(fixture.root, 'VERSION'), '0.0.2\n');
    stage(fixture.root, ['VERSION']);
    const second = runPreCommit({ repoRoot: fixture.root, silent: true });
    assert.equal(second.exitCode, 0);
    assert.equal(second.result.mode, 'transport-ceremony');
    removeMarker(fixture.root);
  });
});

// ---------------------------------------------------------------------------
// F12 (TPL-237) — repo-shape-aware ff-update integration tests.
//
// These tests exercise the git-level invariant the F12 patch depends on:
// `git push --force-with-lease` against a non-bare destination with
// `receive.denyCurrentBranch=updateInstead` set MUST atomically advance
// the trunk ref AND sync the destination's working tree, refusing
// outright when the destination is dirty.
//
// The original R2 ceremony used `git update-ref` which advanced the ref
// without touching any other worktree's working tree — the F12 incident
// shape (90 files diverged, 16 R2 files missing from main worktree).
//
// Each test stands up a tmpdir-isolated fixture: a non-bare repo with
// main checked out + a sibling "transport" worktree on tx-<slice>, OR a
// bare central repo with one transport clone. Every git invocation
// stays inside tmpdir per R1 / ADR-0015.
// ---------------------------------------------------------------------------

/**
 * Helper: read git output as trimmed string via safeGitSpawn, asserting
 * the command succeeded. Wraps the spawnSync return-shape boilerplate so
 * tests stay readable. safeGit itself returns a Buffer (no .stdout), so
 * we use safeGitSpawn for any case that needs string output.
 */
function gitText(cwd, args) {
  const r = safeGitSpawn(cwd, args, { stdio: 'pipe', encoding: 'utf8' });
  if (r.status !== 0) {
    throw new Error(
      `git ${args.join(' ')} failed (status=${r.status}): ${(r.stderr || '').toString()}`,
    );
  }
  return (r.stdout || '').toString().trim();
}

/**
 * Build the F12 fixture shape:
 *   <root>/main-wt        — non-bare clone with main checked out
 *   <root>/tx-wt          — second worktree on tx-TPL-237 created from
 *                            main-wt, simulating the transport worktree
 *
 * Returns absolute paths to both worktrees plus the initial main SHA.
 */
function createF12Fixture(label, { setUpdateInstead = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), `r2-f12-${label}-`));
  const mainWt = join(root, 'main-wt');
  mkdirSync(mainWt, { recursive: true });
  safeGitSpawn(mainWt, ['init', '-b', 'main']);
  safeGitSpawn(mainWt, ['config', 'user.email', 'test@r2.local']);
  safeGitSpawn(mainWt, ['config', 'user.name', 'R2 Test']);
  safeGitSpawn(mainWt, ['config', 'commit.gpgsign', 'false']);
  if (setUpdateInstead) {
    safeGitSpawn(mainWt, ['config', 'receive.denyCurrentBranch', 'updateInstead']);
  }
  mkdirSync(join(mainWt, '.claims'), { recursive: true });

  writeFileSync(join(mainWt, 'README.md'), '# fixture\n');
  writeFileSync(join(mainWt, 'VERSION'), '0.0.1\n');
  writeFileSync(
    join(mainWt, 'CHANGELOG.md'),
    '# Changelog\n\n## [Unreleased]\n\n- seed\n',
  );
  safeGitSpawn(mainWt, ['add', 'README.md', 'VERSION', 'CHANGELOG.md']);
  safeGitSpawn(mainWt, ['commit', '-m', 'init']);

  const initialSha = gitText(mainWt, ['rev-parse', 'HEAD']);

  // Add a transport worktree using `git worktree add` — exactly how
  // coa-worktree --create --slice= would do it.
  const txWt = join(root, 'tx-wt');
  safeGitSpawn(mainWt, ['worktree', 'add', '-b', 'tx-TPL-237', txWt]);

  // From the transport worktree, make a code change + commit so HEAD
  // advances past initialSha. This is what coa-merge would have done
  // by step 8 (ceremony commit).
  writeFileSync(join(txWt, 'CHANGED.md'), '# from tx\n');
  safeGitSpawn(txWt, ['add', 'CHANGED.md']);
  safeGitSpawn(txWt, ['commit', '-m', 'feat(test): F12 fixture commit']);
  const txSha = gitText(txWt, ['rev-parse', 'HEAD']);

  return { root, mainWt, txWt, initialSha, txSha };
}

/**
 * Run `git push --force-with-lease=main:<lease> <main-wt-path>
 * HEAD:refs/heads/main` from inside the transport worktree, using
 * safeGitSpawn. Returns { ok, status, stdout, stderr } so the caller
 * can assert on success or specific error strings — no throw on
 * non-zero so the dirty-main-refused case can be observed.
 */
function pushUpdateInstead(txWt, mainWtPath, leaseSha) {
  const result = safeGitSpawn(txWt, [
    'push',
    `--force-with-lease=main:${leaseSha}`,
    mainWtPath,
    'HEAD:refs/heads/main',
  ], { stdio: 'pipe', encoding: 'utf8' });
  return {
    ok: result.status === 0,
    status: result.status,
    stdout: (result.stdout || '').toString(),
    stderr: (result.stderr || '').toString(),
  };
}

describe('F12 — non-bare repo, main checked out, updateInstead set', () => {
  let fx;
  beforeEach(() => { fx = createF12Fixture('happy'); });
  afterEach(() => { rmSync(fx.root, { recursive: true, force: true }); });

  test('F12.1. push-update-instead succeeds; main worktree synced to new HEAD', () => {
    // Pre-condition: main is at initialSha; transport at txSha.
    assert.equal(gitText(fx.mainWt, ['rev-parse', 'HEAD']), fx.initialSha);

    const push = pushUpdateInstead(fx.txWt, fx.mainWt, fx.initialSha);
    assert.equal(push.ok, true,
      `expected push to succeed; got: ${push.stderr}`);

    // Main ref advanced to txSha.
    const mainSha = gitText(fx.mainWt, ['rev-parse', 'main']);
    assert.equal(mainSha, fx.txSha, 'main ref should equal tx-branch HEAD');

    // Main worktree's working tree was synced — CHANGED.md must exist.
    assert.ok(
      existsSync(join(fx.mainWt, 'CHANGED.md')),
      'CHANGED.md must be present in main worktree after updateInstead push',
    );

    // And `git diff HEAD` is clean (no stale tracked files).
    const diff = gitText(fx.mainWt, ['diff', 'HEAD', '--stat']);
    assert.equal(diff, '',
      'main worktree must be clean post-push');
  });

  test('F12.2. dirty main worktree → push refused; ref does NOT advance', () => {
    // Make main worktree dirty (modify a tracked file).
    writeFileSync(
      join(fx.mainWt, 'README.md'),
      '# fixture (dirty)\n',
    );

    const push = pushUpdateInstead(fx.txWt, fx.mainWt, fx.initialSha);
    assert.equal(push.ok, false,
      'push must refuse against dirty main worktree');

    // Stderr mentions "uncommitted changes" / "working" — git's
    // updateInstead refusal text. Accept either pattern.
    const refusal = push.stderr.toLowerCase();
    assert.ok(
      /uncommitted|working|push the current branch|denied|denycurrentbranch/.test(refusal),
      `stderr should describe the refusal; got: ${push.stderr}`,
    );

    // Main ref did NOT move.
    const mainSha = gitText(fx.mainWt, ['rev-parse', 'main']);
    assert.equal(mainSha, fx.initialSha,
      'main ref must NOT advance when main worktree is dirty');
  });
});

describe('F12 — receive.denyCurrentBranch NOT set to updateInstead', () => {
  let fx;
  beforeEach(() => { fx = createF12Fixture('no-config', { setUpdateInstead: false }); });
  afterEach(() => { rmSync(fx.root, { recursive: true, force: true }); });

  test('F12.3. classify under no config → REFUSE_NEEDS_CONFIG; ref does NOT advance', () => {
    // Probe the config the same way coa-merge step 9c would.
    const wtListRaw = gitText(fx.txWt, ['worktree', 'list', '--porcelain']);
    const mainWt = findMainWorktree(wtListRaw);
    assert.ok(mainWt, 'fixture should expose a main worktree to the parser');

    const denyProbe = safeGitSpawn(mainWt.path,
      ['config', '--get', 'receive.denyCurrentBranch'],
      { stdio: 'pipe', encoding: 'utf8' },
    );
    // git config exits 1 when the key is unset — denyValue stays null.
    const denyValue = denyProbe.status === 0
      ? (denyProbe.stdout || '').toString().trim()
      : null;
    assert.equal(denyValue, null,
      'fixture configured without updateInstead should expose null');

    const verdict = classifyFfUpdateMethod({
      isBare: false,
      mainWorktree: mainWt,
      denyCurrentBranchValue: denyValue,
    });
    assert.equal(verdict, FF_UPDATE_METHODS.REFUSE_NEEDS_CONFIG,
      'classifier must refuse when updateInstead is not set');

    // The setup-hint surfaces the operator-actionable command.
    const hint = composeUpdateInsteadSetupHint(mainWt.path);
    assert.match(hint, /receive\.denyCurrentBranch updateInstead/);
    assert.ok(hint.includes(`git -C ${mainWt.path} config`),
      `hint should include the exact one-time command for ${mainWt.path}; got:\n${hint}`);

    // Ref did NOT advance — coa-merge would have refused before push.
    // We don't push here because that's the whole point: the gate.
    const mainSha = gitText(fx.mainWt, ['rev-parse', 'main']);
    assert.equal(mainSha, fx.initialSha,
      'main ref must remain at initial when ceremony refuses pre-push');
  });
});

describe('F12 — bare repo path unchanged from R2 baseline', () => {
  let root, bareDir, txWt;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'r2-f12-bare-'));
    bareDir = join(root, 'central.git');
    safeGitSpawn(root, ['init', '--bare', '-b', 'main', bareDir]);
    // Seed via a temp clone, push to the bare to build initial state.
    const seedWt = join(root, 'seed-wt');
    safeGitSpawn(root, ['clone', bareDir, seedWt]);
    safeGitSpawn(seedWt, ['config', 'user.email', 'test@r2.local']);
    safeGitSpawn(seedWt, ['config', 'user.name', 'R2 Test']);
    safeGitSpawn(seedWt, ['config', 'commit.gpgsign', 'false']);
    writeFileSync(join(seedWt, 'README.md'), '# bare-seeded\n');
    safeGitSpawn(seedWt, ['checkout', '-b', 'main']);
    safeGitSpawn(seedWt, ['add', 'README.md']);
    safeGitSpawn(seedWt, ['commit', '-m', 'init']);
    safeGitSpawn(seedWt, ['push', '-u', 'origin', 'main']);
    rmSync(seedWt, { recursive: true, force: true });

    // Add a transport worktree directly off the bare ref.
    txWt = join(root, 'tx-wt');
    safeGitSpawn(bareDir, ['worktree', 'add', '-b', 'tx-TPL-237', txWt, 'main']);
    safeGitSpawn(txWt, ['config', 'user.email', 'test@r2.local']);
    safeGitSpawn(txWt, ['config', 'user.name', 'R2 Test']);
    safeGitSpawn(txWt, ['config', 'commit.gpgsign', 'false']);
    writeFileSync(join(txWt, 'CHANGED.md'), '# bare\n');
    safeGitSpawn(txWt, ['add', 'CHANGED.md']);
    safeGitSpawn(txWt, ['commit', '-m', 'feat(test): bare F12 fixture commit']);
  });
  afterEach(() => { rmSync(root, { recursive: true, force: true }); });

  test('F12.4. bare repo classifies as update-ref-bare; update-ref advances ref cleanly', () => {
    // The bare flag is on the central .git dir; coa-merge cross-checks
    // core.bare on the enclosing git dir. From inside a worktree of a
    // bare repo, `--is-bare-repository` returns false (the worktree
    // itself is not bare).
    const coreBare = gitText(bareDir, ['config', '--get', 'core.bare']);
    assert.equal(coreBare, 'true', 'central git dir must be bare');

    const wtListRaw = gitText(txWt, ['worktree', 'list', '--porcelain']);
    const parsed = parseWorktreeListPorcelain(wtListRaw);
    // The bare entry appears with `bare` flag. findMainWorktree skips it.
    assert.ok(parsed.some((e) => e.bare === true),
      'porcelain parser must mark bare entry');
    const mainWt = findMainWorktree(wtListRaw);
    // No main worktree (bare + transport only).
    assert.equal(mainWt, null);

    const verdict = classifyFfUpdateMethod({
      isBare: true,
      mainWorktree: null,
      denyCurrentBranchValue: null,
    });
    assert.equal(verdict, FF_UPDATE_METHODS.UPDATE_REF_BARE);

    // R2-baseline update-ref still works against bare's main ref.
    const initial = gitText(bareDir, ['rev-parse', 'main']);
    const txSha = gitText(txWt, ['rev-parse', 'HEAD']);
    const update = safeGitSpawn(txWt, [
      'update-ref', 'refs/heads/main', txSha, initial,
    ], { stdio: 'pipe', encoding: 'utf8' });
    assert.equal(update.status, 0,
      `update-ref against bare must succeed; status=${update.status}, stderr=${update.stderr}`);
    const finalMain = gitText(bareDir, ['rev-parse', 'main']);
    assert.equal(finalMain, txSha);
  });
});

describe('F12 — non-bare orphan setup (main not checked out anywhere)', () => {
  let root, repoDir, txWt;
  beforeEach(() => {
    // Create a non-bare repo where main is detached from any worktree.
    // Approach: init normal, commit, then create + check out tx-TPL-237
    // and detach main from the only worktree by force.
    root = mkdtempSync(join(tmpdir(), 'r2-f12-orphan-'));
    repoDir = join(root, 'repo');
    mkdirSync(repoDir, { recursive: true });
    safeGitSpawn(repoDir, ['init', '-b', 'main']);
    safeGitSpawn(repoDir, ['config', 'user.email', 'test@r2.local']);
    safeGitSpawn(repoDir, ['config', 'user.name', 'R2 Test']);
    safeGitSpawn(repoDir, ['config', 'commit.gpgsign', 'false']);
    writeFileSync(join(repoDir, 'README.md'), '# orphan\n');
    safeGitSpawn(repoDir, ['add', 'README.md']);
    safeGitSpawn(repoDir, ['commit', '-m', 'init']);

    // Move the only worktree off main to tx- branch — main now has no
    // worktree but the branch still exists.
    txWt = repoDir;
    safeGitSpawn(repoDir, ['checkout', '-b', 'tx-TPL-237']);
    writeFileSync(join(repoDir, 'CHANGED.md'), '# orphan-tx\n');
    safeGitSpawn(repoDir, ['add', 'CHANGED.md']);
    safeGitSpawn(repoDir, ['commit', '-m', 'feat(test): orphan F12 fixture commit']);
  });
  afterEach(() => { rmSync(root, { recursive: true, force: true }); });

  test('F12.5. no main worktree → classify as update-ref-no-main; update-ref still works', () => {
    const wtListRaw = gitText(txWt, ['worktree', 'list', '--porcelain']);
    const mainWt = findMainWorktree(wtListRaw);
    assert.equal(mainWt, null,
      'main is not checked out anywhere in this fixture');

    const verdict = classifyFfUpdateMethod({
      isBare: false,
      mainWorktree: null,
      denyCurrentBranchValue: null,
    });
    assert.equal(verdict, FF_UPDATE_METHODS.UPDATE_REF_NO_MAIN);

    // update-ref path still advances the ref (no working tree to sync).
    const initial = gitText(txWt, ['rev-parse', 'main']);
    const txSha = gitText(txWt, ['rev-parse', 'HEAD']);
    const update = safeGitSpawn(txWt, [
      'update-ref', 'refs/heads/main', txSha, initial,
    ], { stdio: 'pipe', encoding: 'utf8' });
    assert.equal(update.status, 0);
    const finalSha = gitText(txWt, ['rev-parse', 'main']);
    assert.equal(finalSha, txSha);
  });
});
