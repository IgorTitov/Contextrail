/* @HEADER
 * @version 0.7.69 | 2026-05-03
 * @purpose Integration tests for scripts/checks/hook-integrity-check.mjs — proves tampered hooks are detected and --update is operator-gated.
 * @sidecar hook-integrity-check.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx hook-integrity
 * @public false
 * @edit careful
 */

/**
 * Integration test (R8.2 / TPL-256).
 *
 * Each scenario builds its own isolated tmp directory that mimics a minimal
 * .githooks/ layout with a pre-generated .fingerprints.json registry.
 * The check is invoked as a subprocess (spawnSync) — tests prove CLI behavior,
 * not internal function calls.
 *
 * R1 compliant: all temp dirs created under os.tmpdir(). No git operations
 * needed here (hook-integrity-check.mjs does not invoke git), so safeGit is
 * not imported — R1's constraint on git calls does not apply to subprocess
 * invocations of non-git scripts.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const REPO_ROOT = resolve(import.meta.dirname ?? '.', '..', '..');
const CHECK = join(REPO_ROOT, 'scripts', 'checks', 'hook-integrity-check.mjs');
const LIB = join(REPO_ROOT, 'scripts', 'lib', 'hook-integrity.mjs');

/** Run the check subprocess with the given cwd and env overrides. */
function runCheck(cwd, extraArgs = [], envOverrides = {}) {
  const env = { ...process.env, ...envOverrides };
  // Strip COA_OPERATOR from env unless explicitly provided via envOverrides
  if (!Object.prototype.hasOwnProperty.call(envOverrides, 'COA_OPERATOR')) {
    delete env.COA_OPERATOR;
  }
  const r = spawnSync(process.execPath, [CHECK, '--json', ...extraArgs], {
    cwd,
    env,
    encoding: 'utf8',
  });
  let payload = null;
  try { payload = JSON.parse(r.stdout || '{}'); } catch { /* leave null */ }
  return { code: r.status, stdout: r.stdout, stderr: r.stderr, payload };
}

/**
 * Build a minimal repo layout in a tmp dir with:
 *   .githooks/pre-commit  — mock content
 *   .githooks/pre-push    — mock content
 *   scripts/checks/hook-integrity-check.mjs  (symlinked from repo)
 *   scripts/lib/hook-integrity.mjs           (symlinked from repo)
 */
function makeTempWorkspace(suffix) {
  const dir = mkdtempSync(join(tmpdir(), `r8-tpl256-${suffix}-`));
  mkdirSync(join(dir, '.githooks'), { recursive: true });
  mkdirSync(join(dir, 'scripts', 'checks'), { recursive: true });
  mkdirSync(join(dir, 'scripts', 'lib'), { recursive: true });

  // Copy the scripts so the subprocess can require them with correct paths
  cpSync(CHECK, join(dir, 'scripts', 'checks', 'hook-integrity-check.mjs'));
  cpSync(LIB, join(dir, 'scripts', 'lib', 'hook-integrity.mjs'));

  // Write two mock hooks
  writeFileSync(join(dir, '.githooks', 'pre-commit'), '#!/usr/bin/env bash\n# mock pre-commit\necho ok\n');
  writeFileSync(join(dir, '.githooks', 'pre-push'), '#!/usr/bin/env bash\n# mock pre-push\necho ok\n');

  return dir;
}

/** Generate a fingerprint registry for the current hooks in dir. */
function generateRegistry(dir) {
  const r = spawnSync(
    process.execPath,
    [join(dir, 'scripts', 'checks', 'hook-integrity-check.mjs'), '--update', '--slice=TEST'],
    { cwd: dir, env: { ...process.env, COA_OPERATOR: '1' }, encoding: 'utf8' },
  );
  if (r.status !== 0) {
    throw new Error(`Registry generation failed:\n${r.stderr}\n${r.stdout}`);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('hook-integrity-check integration', () => {
  it('passes (exit 0) when hooks match the registry', () => {
    const dir = makeTempWorkspace('happy');
    try {
      generateRegistry(dir);
      const r = runCheck(dir);
      assert.equal(r.code, 0, `Expected exit 0, got ${r.code}\nstdout: ${r.stdout}\nstderr: ${r.stderr}`);
      assert.equal(r.payload?.ok, true);
      assert.equal(r.payload?.mismatches?.length, 0);
      assert.equal(r.payload?.extras?.length, 0);
      assert.equal(r.payload?.missing?.length, 0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('fails (exit 1) when a hook is tampered (sha256 mismatch)', () => {
    const dir = makeTempWorkspace('tampered');
    try {
      generateRegistry(dir);

      // Tamper pre-commit by appending a byte
      const preCommitPath = join(dir, '.githooks', 'pre-commit');
      const orig = '#!/usr/bin/env bash\n# mock pre-commit\necho ok\n';
      writeFileSync(preCommitPath, orig + '# TAMPERED\n');

      const r = runCheck(dir);
      assert.equal(r.code, 1, 'tampered hook must cause exit 1');
      assert.equal(r.payload?.ok, false);
      assert.ok(
        r.payload?.mismatches?.includes('.githooks/pre-commit'),
        `mismatches should include pre-commit, got: ${JSON.stringify(r.payload?.mismatches)}`,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('fails (exit 1) when an extra hook is added (extras detection)', () => {
    const dir = makeTempWorkspace('extras');
    try {
      generateRegistry(dir);

      // Add a hook that was not in the registry
      writeFileSync(
        join(dir, '.githooks', 'post-merge'),
        '#!/usr/bin/env bash\n# unexpected hook\n',
      );

      const r = runCheck(dir);
      assert.equal(r.code, 1, 'extra hook must cause exit 1');
      assert.equal(r.payload?.ok, false);
      assert.ok(
        r.payload?.extras?.includes('.githooks/post-merge'),
        `extras should include post-merge, got: ${JSON.stringify(r.payload?.extras)}`,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('passes (exit 0) after restoring a tampered hook', () => {
    const dir = makeTempWorkspace('restore');
    try {
      const origContent = '#!/usr/bin/env bash\n# mock pre-commit\necho ok\n';
      generateRegistry(dir);

      // Tamper
      writeFileSync(join(dir, '.githooks', 'pre-commit'), origContent + '# TAMPERED\n');
      const r1 = runCheck(dir);
      assert.equal(r1.code, 1, 'tampered state must exit 1');

      // Restore
      writeFileSync(join(dir, '.githooks', 'pre-commit'), origContent);
      const r2 = runCheck(dir);
      assert.equal(r2.code, 0, 'restored state must exit 0');
      assert.equal(r2.payload?.ok, true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('refuses --update without COA_OPERATOR=1 (exits 1)', () => {
    const dir = makeTempWorkspace('no-operator');
    try {
      // No registry yet — shouldn't matter, it should refuse before reading
      const r = runCheck(dir, ['--update'], {}); // COA_OPERATOR stripped by runCheck default
      assert.equal(r.code, 1, '--update without COA_OPERATOR must exit 1');
      assert.equal(r.payload?.ok, false);
      assert.ok(
        r.payload?.error?.includes('COA_OPERATOR'),
        `error should mention COA_OPERATOR, got: ${r.payload?.error}`,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('--update with COA_OPERATOR=1 regenerates registry; subsequent check passes', () => {
    const dir = makeTempWorkspace('update-op');
    try {
      // First: tamper, then update — registry should reflect current state
      writeFileSync(
        join(dir, '.githooks', 'pre-commit'),
        '#!/usr/bin/env bash\n# v1\n',
      );
      writeFileSync(
        join(dir, '.githooks', 'pre-push'),
        '#!/usr/bin/env bash\n# v1\n',
      );

      // Generate initial registry
      generateRegistry(dir);

      // Tamper
      writeFileSync(
        join(dir, '.githooks', 'pre-commit'),
        '#!/usr/bin/env bash\n# v2 CHANGED\n',
      );

      // Verify tamper is detected
      const r1 = runCheck(dir);
      assert.equal(r1.code, 1);

      // Update with operator flag — this legitimizes the change
      const update = runCheck(dir, ['--update'], { COA_OPERATOR: '1' });
      assert.equal(update.code, 0, `--update should succeed, got: ${update.stdout} ${update.stderr}`);
      assert.equal(update.payload?.ok, true);
      assert.equal(update.payload?.action, 'updated');

      // Verify check now passes
      const r2 = runCheck(dir);
      assert.equal(r2.code, 0, 'after --update, check should pass');
      assert.equal(r2.payload?.ok, true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('fails (exit 1) when registry file is missing entirely', () => {
    const dir = makeTempWorkspace('no-registry');
    try {
      // Do NOT call generateRegistry — no .fingerprints.json exists
      const r = runCheck(dir);
      assert.equal(r.code, 1, 'missing registry must cause exit 1');
      assert.equal(r.payload?.ok, false);
      assert.ok(
        r.payload?.error?.toLowerCase().includes('registry') ||
        r.payload?.error?.toLowerCase().includes('fingerprint'),
        `error should mention registry, got: ${r.payload?.error}`,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
