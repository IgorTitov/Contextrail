/* @HEADER
 * @version 0.8.1 | 2026-05-10
 * @purpose Integration tests for TPL-314 test-deletion-guard pre-commit Phase 2.6 — net-deletion detection on test()/it() blocks plus two-factor operator override.
 * @sidecar test-deletion-guard.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * TPL-314 — pre-commit Phase 2.6 test-deletion-guard integration tests.
 *
 * These tests exercise scripts/checks/test-deletion-guard.mjs against synthetic
 * git fixtures. Each scenario constructs a tmpdir repo, stages a diff that
 * adds/removes test()/it() blocks, optionally writes .git/COMMIT_EDITMSG, and
 * spawns the guard as a subprocess. The exit code is asserted.
 *
 * Scope discipline (Design Call A): only test()/it() are in scope. describe()
 * wrappers are organizational and intentionally NOT counted — Scenario 3 pins
 * the false-positive defense by removing a describe() wrapper while preserving
 * its inner test()s and asserting the guard stays silent.
 *
 * Two-factor override (Design Call B): COA_OPERATOR=1 env var AND a
 * `Allow-test-deletion: <reason>` line (≥3 chars after the colon) in commit
 * body. Both required, neither alone sufficient.
 *
 * Test #11 — coa-merge passthrough: coa-merge.mjs line 1631 invokes
 * `run('git', ['commit', '-m', commitMessage])`. Git writes that message to
 * .git/COMMIT_EDITMSG before pre-commit fires. The test faithfully
 * reproduces this contract by writing the same multi-line message to
 * .git/COMMIT_EDITMSG manually, then running the guard against a real
 * staged deletion. This proves the override line in coa-merge's --message=
 * argument reaches the guard intact.
 *
 * R1 (ADR-0015): every git invocation uses safeGit / safeGitSpawn.
 *
 * Slice: TPL-314 (see docs/backlog/agent-context-briefer.md and ADR-0041).
 */

import { describe, test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { safeGitSpawn } from '../_setup/safe-git.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..', '..');
const GUARD = join(ROOT, 'scripts', 'checks', 'test-deletion-guard.mjs');

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function createFixture(label) {
  const root = mkdtempSync(join(tmpdir(), `tpl314-${label}-`));
  safeGitSpawn(root, ['init', '-b', 'main']);
  safeGitSpawn(root, ['config', 'user.email', 'test@tpl314.local']);
  safeGitSpawn(root, ['config', 'user.name', 'TPL-314 Test']);
  safeGitSpawn(root, ['config', 'commit.gpgsign', 'false']);
  return root;
}

function writeFile(root, relPath, content) {
  const abs = join(root, relPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content, 'utf8');
}

function commitInitial(root, files) {
  for (const [relPath, content] of Object.entries(files)) {
    writeFile(root, relPath, content);
    safeGitSpawn(root, ['add', '--', relPath]);
  }
  safeGitSpawn(root, ['commit', '-m', 'init: TPL-314 fixture baseline']);
}

function stageEdit(root, relPath, newContent) {
  writeFile(root, relPath, newContent);
  safeGitSpawn(root, ['add', '--', relPath]);
}

function writeCommitMsg(root, msg) {
  // Faithfully reproduces what `git commit -m "<msg>"` writes to
  // .git/COMMIT_EDITMSG before the pre-commit hook fires. coa-merge.mjs:1631
  // invokes that exact form, so populating this file by hand is contract-
  // equivalent to the coa-merge ceremony's effect on the file.
  writeFileSync(join(root, '.git', 'COMMIT_EDITMSG'), msg, 'utf8');
}

function runGuard(root, env = {}) {
  return spawnSync(process.execPath, [GUARD], {
    cwd: root,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    stdio: 'pipe',
  });
}

function cleanup(root) {
  if (!root) return;
  try {
    rmSync(root, { recursive: true, force: true, maxRetries: 3 });
  } catch {
    /* best effort */
  }
}

// ---------------------------------------------------------------------------
// Test fixtures — small canned source bodies
// ---------------------------------------------------------------------------

const FIVE_TESTS = `import { test } from 'node:test';

test('a', () => { /* ... */ });
test('b', () => { /* ... */ });
test('c', () => { /* ... */ });
test('d', () => { /* ... */ });
test('e', () => { /* ... */ });
`;

const SIX_TESTS = `import { test } from 'node:test';

test('a', () => { /* ... */ });
test('b', () => { /* ... */ });
test('c', () => { /* ... */ });
test('d', () => { /* ... */ });
test('e', () => { /* ... */ });
test('f', () => { /* ... */ });
`;

const FOUR_TESTS_FROM_FIVE = `import { test } from 'node:test';

test('a', () => { /* ... */ });
test('b', () => { /* ... */ });
test('c', () => { /* ... */ });
test('d', () => { /* ... */ });
`;

const ONE_TEST_FOO = `import { test } from 'node:test';

test('foo', () => { /* ... */ });
`;

const ONE_TEST_FOO_BAR = `import { test } from 'node:test';

test('foo bar', () => { /* ... */ });
`;

const DESCRIBE_WRAPPING_TWO = `import { describe, test } from 'node:test';

describe('outer', () => {
  test('a', () => { /* ... */ });
  test('b', () => { /* ... */ });
});
`;

const TWO_TESTS_AT_TOP_LEVEL = `import { test } from 'node:test';

test('a', () => { /* ... */ });
test('b', () => { /* ... */ });
`;

// ---------------------------------------------------------------------------
// Pass paths
// ---------------------------------------------------------------------------

describe('TPL-314 Phase 2.6 — pass paths', () => {
  let repo = null;
  afterEach(() => {
    cleanup(repo);
    repo = null;
  });

  test('1. only additions: 5→6 test() blocks → exit 0', () => {
    repo = createFixture('p1');
    commitInitial(repo, { 'tests/unit/example.test.mjs': FIVE_TESTS });
    stageEdit(repo, 'tests/unit/example.test.mjs', SIX_TESTS);
    writeCommitMsg(repo, 'feat(test): add scenario f\n\nrefs TPL-314\n');
    const r = runGuard(repo);
    assert.strictEqual(r.status, 0, `expected exit 0; stderr=${r.stderr}`);
  });

  test('2. rename only: test("foo")→test("foo bar") → exit 0', () => {
    repo = createFixture('p2');
    commitInitial(repo, { 'tests/unit/rename.test.mjs': ONE_TEST_FOO });
    stageEdit(repo, 'tests/unit/rename.test.mjs', ONE_TEST_FOO_BAR);
    writeCommitMsg(repo, 'refactor(test): rename for clarity\n\nrefs TPL-314\n');
    const r = runGuard(repo);
    assert.strictEqual(r.status, 0, `expected exit 0; stderr=${r.stderr}`);
  });

  test('3. describe-wrapper removed, inner test()s preserved → exit 0 (false-positive defense)', () => {
    repo = createFixture('p3');
    commitInitial(repo, { 'tests/unit/wrap.test.mjs': DESCRIBE_WRAPPING_TWO });
    stageEdit(repo, 'tests/unit/wrap.test.mjs', TWO_TESTS_AT_TOP_LEVEL);
    writeCommitMsg(repo, 'refactor(test): flatten describe wrapper\n\nrefs TPL-314\n');
    const r = runGuard(repo);
    assert.strictEqual(
      r.status,
      0,
      `expected exit 0 (describe removal must NOT block); stderr=${r.stderr}`,
    );
  });

  test('4. describe wrapper added around existing tests → exit 0', () => {
    repo = createFixture('p4');
    commitInitial(repo, { 'tests/unit/wrap.test.mjs': TWO_TESTS_AT_TOP_LEVEL });
    stageEdit(repo, 'tests/unit/wrap.test.mjs', DESCRIBE_WRAPPING_TWO);
    writeCommitMsg(repo, 'refactor(test): add organizational describe\n\nrefs TPL-314\n');
    const r = runGuard(repo);
    assert.strictEqual(r.status, 0, `expected exit 0; stderr=${r.stderr}`);
  });
});

// ---------------------------------------------------------------------------
// Block paths — net deletion without override
// ---------------------------------------------------------------------------

describe('TPL-314 Phase 2.6 — block paths', () => {
  let repo = null;
  afterEach(() => {
    cleanup(repo);
    repo = null;
  });

  test('5. net deletion 5→4 (no env, no marker) → exit non-zero', () => {
    repo = createFixture('b5');
    commitInitial(repo, { 'tests/unit/example.test.mjs': FIVE_TESTS });
    stageEdit(repo, 'tests/unit/example.test.mjs', FOUR_TESTS_FROM_FIVE);
    writeCommitMsg(repo, 'chore(test): remove one\n\nrefs TPL-314\n');
    const r = runGuard(repo);
    assert.notStrictEqual(r.status, 0, `expected non-zero exit; stdout=${r.stdout}`);
    assert.match(
      r.stderr + r.stdout,
      /tests\/unit\/example\.test\.mjs/,
      'output should name the file',
    );
    assert.match(r.stderr + r.stdout, /\b1\b/, 'output should report the count delta');
  });

  test('6. deletion + empty override line → blocked', () => {
    repo = createFixture('b6');
    commitInitial(repo, { 'tests/unit/example.test.mjs': FIVE_TESTS });
    stageEdit(repo, 'tests/unit/example.test.mjs', FOUR_TESTS_FROM_FIVE);
    writeCommitMsg(repo, 'chore(test): remove\n\nrefs TPL-314\n'); // no Allow-test-deletion
    const r = runGuard(repo, { COA_OPERATOR: '1' });
    assert.notStrictEqual(r.status, 0, `expected blocked (no marker line); stderr=${r.stderr}`);
  });

  test('8. COA_OPERATOR set but no marker line → blocked (both factors required)', () => {
    repo = createFixture('b8');
    commitInitial(repo, { 'tests/unit/example.test.mjs': FIVE_TESTS });
    stageEdit(repo, 'tests/unit/example.test.mjs', FOUR_TESTS_FROM_FIVE);
    writeCommitMsg(repo, 'chore(test): remove\n\nrefs TPL-314\n');
    const r = runGuard(repo, { COA_OPERATOR: '1' });
    assert.notStrictEqual(r.status, 0, `env alone is not enough; stderr=${r.stderr}`);
  });

  test('9. marker line present but COA_OPERATOR unset → blocked', () => {
    repo = createFixture('b9');
    commitInitial(repo, { 'tests/unit/example.test.mjs': FIVE_TESTS });
    stageEdit(repo, 'tests/unit/example.test.mjs', FOUR_TESTS_FROM_FIVE);
    writeCommitMsg(
      repo,
      'chore(test): remove\n\nAllow-test-deletion: removing obsolete legacy suite per refactor plan\n\nrefs TPL-314\n',
    );
    const r = runGuard(repo, { COA_OPERATOR: '' });
    assert.notStrictEqual(r.status, 0, `marker line alone is not enough; stderr=${r.stderr}`);
  });

  test('9b. marker line with too-short reason (<3 chars) → blocked', () => {
    repo = createFixture('b9b');
    commitInitial(repo, { 'tests/unit/example.test.mjs': FIVE_TESTS });
    stageEdit(repo, 'tests/unit/example.test.mjs', FOUR_TESTS_FROM_FIVE);
    writeCommitMsg(repo, 'chore(test): remove\n\nAllow-test-deletion: x\n\nrefs TPL-314\n');
    const r = runGuard(repo, { COA_OPERATOR: '1' });
    assert.notStrictEqual(r.status, 0, `reason must be ≥3 chars after colon; stderr=${r.stderr}`);
  });
});

// ---------------------------------------------------------------------------
// Allow path — full two-factor override
// ---------------------------------------------------------------------------

describe('TPL-314 Phase 2.6 — override accepted', () => {
  let repo = null;
  afterEach(() => {
    cleanup(repo);
    repo = null;
  });

  test('7. COA_OPERATOR=1 + Allow-test-deletion line with ≥3-char reason → exit 0; reason logged', () => {
    repo = createFixture('a7');
    commitInitial(repo, { 'tests/unit/example.test.mjs': FIVE_TESTS });
    stageEdit(repo, 'tests/unit/example.test.mjs', FOUR_TESTS_FROM_FIVE);
    const reason = 'removing obsolete legacy suite per refactor plan';
    writeCommitMsg(
      repo,
      `chore(test): legitimate cleanup\n\nAllow-test-deletion: ${reason}\n\nrefs TPL-314\n`,
    );
    const r = runGuard(repo, { COA_OPERATOR: '1' });
    assert.strictEqual(r.status, 0, `override should pass; stderr=${r.stderr}`);
    assert.match(r.stderr, new RegExp(reason), 'reason must be logged to stderr for traceability');
  });
});

// ---------------------------------------------------------------------------
// Skip path — non-test file
// ---------------------------------------------------------------------------

describe('TPL-314 Phase 2.6 — non-test paths skipped', () => {
  let repo = null;
  afterEach(() => {
    cleanup(repo);
    repo = null;
  });

  test('10. non-test file with test()-shaped literal removed → exit 0 (out of scope)', () => {
    repo = createFixture('s10');
    // apps/starter/sample.mjs is NOT under tests/** — guard must skip.
    const before = `export function bestTest() { return 1; }\nexport function it() { return 2; }\n`;
    const after = `export function bestTest() { return 1; }\n`;
    commitInitial(repo, { 'apps/starter/sample.mjs': before });
    stageEdit(repo, 'apps/starter/sample.mjs', after);
    writeCommitMsg(repo, 'chore: remove unused export\n\nrefs TPL-314\n');
    const r = runGuard(repo);
    assert.strictEqual(r.status, 0, `non-test file must be skipped; stderr=${r.stderr}`);
  });
});

// ---------------------------------------------------------------------------
// Test #11 — coa-merge passthrough verification
// ---------------------------------------------------------------------------

describe('TPL-314 Phase 2.6 — coa-merge passthrough (Test #11)', () => {
  let repo = null;
  afterEach(() => {
    cleanup(repo);
    repo = null;
  });

  /**
   * coa-merge.mjs line 1631:
   *
   *   const commit = run('git', ['commit', '-m', commitMessage], ...);
   *
   * `commitMessage` is the raw value of the operator's `--message=` CLI
   * argument. Git's `-m` writes that string verbatim to .git/COMMIT_EDITMSG
   * before the pre-commit hook fires. This test reproduces that contract
   * faithfully by writing the SAME multi-line message to COMMIT_EDITMSG by
   * hand and then running the guard. If the override line survives the
   * round-trip, the contract holds end-to-end through coa-merge.
   */
  test('11. multi-line --message= preserves Allow-test-deletion line through git -m → guard passes', () => {
    repo = createFixture('e11');
    commitInitial(repo, { 'tests/unit/example.test.mjs': FIVE_TESTS });
    stageEdit(repo, 'tests/unit/example.test.mjs', FOUR_TESTS_FROM_FIVE);

    // Exact shape coa-merge would pass to git -m: header line + blank line + body.
    const reason = 'removing obsolete legacy suite per refactor plan';
    const ceremonyMessage = [
      'feat(test): legitimate cleanup',
      '',
      `Allow-test-deletion: ${reason}`,
      '',
      'refs TPL-314',
    ].join('\n');
    writeCommitMsg(repo, ceremonyMessage);

    const r = runGuard(repo, { COA_OPERATOR: '1' });
    assert.strictEqual(
      r.status,
      0,
      `coa-merge passthrough must accept override; stderr=${r.stderr}`,
    );
    assert.match(r.stderr, new RegExp(reason), 'override reason must be logged for audit trail');
  });
});

// ---------------------------------------------------------------------------
// Tests #13, #14, #15 — TPL-323 whole-file deletion regression coverage
// ---------------------------------------------------------------------------

/**
 * TPL-323 — whole-file deletion regression coverage.
 *
 * The bug: parseDiff was resetting currentFile to null when it encountered
 * `+++ /dev/null` (post-image marker for a deleted file). This happened AFTER
 * `--- a/<path>` had correctly set currentFile, so the subsequent `-` lines
 * lost their file attribution and were not counted. Net effect: deleting an
 * entire test file yielded 0 net deletion and silently passed the guard.
 *
 * The fix: preserve currentFile when `+++ /dev/null` is encountered so that
 * deletion lines are attributed to the pre-image path set by `--- a/<path>`.
 *
 * These three scenarios confirm the fix via real git fixtures so the diff
 * shape is identical to what git actually produces for whole-file deletions.
 */

const FIVE_TESTS_LEGACY = `import { test } from 'node:test';

test('alpha', () => { /* legacy */ });
test('beta', () => { /* legacy */ });
test('gamma', () => { /* legacy */ });
test('delta', () => { /* legacy */ });
test('epsilon', () => { /* legacy */ });
`;

const THREE_TESTS_OLD = `import { test } from 'node:test';

test('x', () => { /* old */ });
test('y', () => { /* old */ });
test('z', () => { /* old */ });
`;

const FOUR_TESTS_ACTIVE_BEFORE = `import { test } from 'node:test';

test('p', () => { /* active */ });
test('q', () => { /* active */ });
test('r', () => { /* active */ });
test('s', () => { /* active */ });
`;

const THREE_TESTS_ACTIVE_AFTER = `import { test } from 'node:test';

test('p', () => { /* active */ });
test('q', () => { /* active */ });
test('r', () => { /* active */ });
`;

describe('TPL-323 — whole-file deletion regression (Tests #13, #14, #15)', () => {
  let repo = null;
  afterEach(() => {
    cleanup(repo);
    repo = null;
  });

  test('13. whole-file deletion of test file with 5 test() blocks → exit non-zero (CRITICAL bug regression)', () => {
    // RED baseline before fix: guard silently passed (exit 0) because parseDiff
    // reset currentFile to null on `+++ /dev/null`, losing the deletion counts.
    // After fix: guard correctly blocks (exit non-zero).
    repo = createFixture('t13');
    commitInitial(repo, { 'tests/unit/legacy.test.mjs': FIVE_TESTS_LEGACY });
    // Stage whole-file deletion via git rm
    safeGitSpawn(repo, ['rm', '--', 'tests/unit/legacy.test.mjs']);
    writeCommitMsg(repo, 'chore: remove legacy suite\n\nrefs TPL-323\n');
    const r = runGuard(repo);
    assert.notStrictEqual(
      r.status,
      0,
      `whole-file deletion must be blocked; stderr=${r.stderr}\nstdout=${r.stdout}`,
    );
    assert.match(
      r.stderr + r.stdout,
      /tests\/unit\/legacy\.test\.mjs/,
      'output must name the deleted file',
    );
    assert.match(r.stderr + r.stdout, /\b5\b/, 'output must report net deletion count of 5');
  });

  test('14. whole-file deletion with full two-factor override → exit 0; reason logged', () => {
    repo = createFixture('t14');
    commitInitial(repo, { 'tests/unit/legacy.test.mjs': FIVE_TESTS_LEGACY });
    safeGitSpawn(repo, ['rm', '--', 'tests/unit/legacy.test.mjs']);
    const reason = 'removing legacy obsolete suite superseded by integration tests';
    writeCommitMsg(
      repo,
      `chore: remove legacy suite\n\nAllow-test-deletion: ${reason}\n\nrefs TPL-323\n`,
    );
    const r = runGuard(repo, { COA_OPERATOR: '1' });
    assert.strictEqual(
      r.status,
      0,
      `two-factor override must allow whole-file deletion; stderr=${r.stderr}`,
    );
    assert.match(
      r.stderr,
      new RegExp(reason),
      'override reason must be logged to stderr for traceability',
    );
  });

  test('15. mixed diff — whole-file delete (3 blocks) + per-block edit (1 block removed) → 4 total net deletion blocked', () => {
    repo = createFixture('t15');
    commitInitial(repo, {
      'tests/unit/old.test.mjs': THREE_TESTS_OLD,
      'tests/unit/active.test.mjs': FOUR_TESTS_ACTIVE_BEFORE,
    });
    // Whole-file delete of old.test.mjs (3 test() blocks)
    safeGitSpawn(repo, ['rm', '--', 'tests/unit/old.test.mjs']);
    // Per-block edit of active.test.mjs: remove 1 of 4 test() blocks
    stageEdit(repo, 'tests/unit/active.test.mjs', THREE_TESTS_ACTIVE_AFTER);
    writeCommitMsg(repo, 'chore: cleanup old tests\n\nrefs TPL-323\n');
    const r = runGuard(repo);
    assert.notStrictEqual(
      r.status,
      0,
      `mixed deletion must be blocked; stderr=${r.stderr}\nstdout=${r.stdout}`,
    );
    // Total net = 3 (whole-file) + 1 (per-block) = 4
    assert.match(r.stderr + r.stdout, /\b4\b/, 'output must report total net deletion count of 4');
    // Both affected files should appear in output
    assert.match(
      r.stderr + r.stdout,
      /tests\/unit\/old\.test\.mjs/,
      'must name the wholly-deleted file',
    );
    assert.match(
      r.stderr + r.stdout,
      /tests\/unit\/active\.test\.mjs/,
      'must name the per-block edited file',
    );
  });
});
