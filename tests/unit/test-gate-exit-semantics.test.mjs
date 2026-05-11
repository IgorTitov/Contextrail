/* @HEADER
 * @version 0.8.2 | 2026-05-10
 * @purpose Regression proofs for test-gate.mjs exit-code semantics (TPL-324 / ADR-0045).
 * @sidecar test-gate-exit-semantics.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// SpecRefs: TPL-324

/**
 * Regression suite: test-gate exit-code semantics.
 *
 * Root cause (TPL-319 incident): ordinary `git commit` failed at Phase 7 even
 * when `pnpm run test:integration` was green. Investigations pointed to three
 * bug classes, all fixed in TPL-324:
 *
 *   B1 — run-tests.mjs: concurrent node --test scheduling caused interference
 *        in integration suites that share git/worktree state. Fix: --test-concurrency=1.
 *   B2 — main-worktree-guard.mjs: unconditional main() call at module level
 *        exited the test process on import from main worktree. Fix: entry-module guard.
 *   B3 — readme-check.mjs: transient tests/.scratch/ dirs caused false-fail.
 *        Fix: segment-based IGNORED_SEGMENTS.
 *
 * Tests here cover the test-gate exit-code contract (B1 proxy) and prevent
 * future false-positive / false-negative regressions.
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TEST_GATE = join(REPO_ROOT, 'scripts', 'checks', 'test-gate.mjs');

/**
 * Create a minimal package.json in a temp dir with the given scripts map.
 * The temp dir has no scripts/checks/*.mjs so test-gate skips all check stages
 * and only exercises the provided package scripts.
 */
function makeTempPkg(scripts) {
  const dir = mkdtempSync(join(tmpdir(), 'test-gate-'));
  const pkg = { name: 'test-gate-mock', version: '1.0.0', scripts };
  writeFileSync(join(dir, 'package.json'), JSON.stringify(pkg, null, 2));
  return dir;
}

/**
 * Run test-gate.mjs with --json from the given cwd. Returns the spawnSync result
 * plus a parsed `output` object if stdout was valid JSON.
 */
function runTestGate(cwd) {
  const result = spawnSync(process.execPath, [TEST_GATE, '--json'], {
    cwd,
    encoding: 'utf8',
  });
  let output = null;
  try {
    output = JSON.parse(result.stdout || '{}');
  } catch {
    // leave output null for caller to diagnose
  }
  return { ...result, output };
}

describe('test-gate exit-code semantics (TPL-324 regression)', () => {
  test('all stages pass → exit 0, ok=true', () => {
    const dir = makeTempPkg({
      'test:integration': 'node -e "process.exit(0)"',
    });
    const { status, output, stderr } = runTestGate(dir);
    assert.equal(status, 0, `Expected exit 0.\nstderr: ${stderr}`);
    assert.ok(output, 'Expected JSON output from test-gate --json');
    assert.equal(output.ok, true, 'Expected ok=true when all stages pass');
    const stage = output.data?.stages?.find((s) => s.name === 'test:integration');
    assert.ok(stage, 'test:integration stage should appear in stages');
    assert.equal(stage.ok, true, 'test:integration stage should be ok=true');
    assert.equal(stage.code, 0, 'test:integration exit code should be 0');
  });

  test('stage failure → exit 1, ok=false, error message names the stage', () => {
    const dir = makeTempPkg({
      'test:integration': 'node -e "process.exit(1)"',
    });
    const { status, output, stderr } = runTestGate(dir);
    assert.equal(status, 1, `Expected exit 1.\nstderr: ${stderr}`);
    assert.ok(output, 'Expected JSON output from test-gate --json');
    assert.equal(output.ok, false, 'Expected ok=false when a stage fails');
    const stage = output.data?.stages?.find((s) => s.name === 'test:integration');
    assert.ok(stage, 'test:integration stage should appear in stages');
    assert.equal(stage.ok, false, 'test:integration stage should be ok=false');
    assert.ok(
      output.errors?.some((e) => e.message?.includes('test:integration')),
      `Error message should name the failing stage. Errors: ${JSON.stringify(output.errors)}`,
    );
  });

  test('stage writes to stderr but exits 0 → no false-positive, exit 0', () => {
    // Exercises the "stderr non-empty but process exits 0" class — test-gate
    // must not treat stderr content as a failure signal.
    const dir = makeTempPkg({
      'test:integration': 'node -e "process.stderr.write(\'deprecation warning\\n\'); process.exit(0)"',
    });
    const { status, output, stderr } = runTestGate(dir);
    assert.equal(status, 0, `Expected exit 0 despite non-empty stderr.\nstderr: ${stderr}`);
    assert.ok(output, 'Expected JSON output from test-gate --json');
    assert.equal(output.ok, true, 'test-gate must not false-positive on non-empty stderr');
    const stage = output.data?.stages?.find((s) => s.name === 'test:integration');
    assert.ok(stage, 'test:integration stage should appear in stages');
    assert.equal(stage.ok, true, 'stage should be ok=true when exit code is 0');
  });

  test('multiple stages — partial failure → exit 1, only failing stage listed in errors', () => {
    const dir = makeTempPkg({
      'test:unit': 'node -e "process.exit(0)"',
      'test:integration': 'node -e "process.exit(1)"',
    });
    const { status, output } = runTestGate(dir);
    assert.equal(status, 1, 'Expected exit 1 when at least one stage fails');
    assert.equal(output.ok, false);
    const failedNames = (output.errors ?? []).map((e) => e.message ?? '');
    assert.ok(
      failedNames.some((m) => m.includes('test:integration')),
      'test:integration should be in errors',
    );
    assert.ok(
      !failedNames.some((m) => m.includes('test:unit')),
      'test:unit should NOT be in errors (it passed)',
    );
  });
});
