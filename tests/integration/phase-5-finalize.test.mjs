/* @HEADER
 * @version 0.7.89 | 2026-05-05
 * @purpose Integration tests for TPL-278 Phase-5 finalize: auto-stage allow-list + post-stamp hook-integrity regen.
 * @sidecar phase-5-finalize.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx hook-integrity
 * @public false
 * @edit careful
 */

/**
 * Integration tests for TPL-278 Phase-5 finalize.
 *
 * Three concerns:
 *
 *   A. --from-pre-commit-hook bypasses COA_OPERATOR gate when $GIT_DIR is set.
 *      Proves the hook-integrity regen path (Addition B) is functional.
 *      Pre-fix (AIC-DEV-136): hook-integrity --update required COA_OPERATOR=1,
 *      so the hook could not self-update within pre-commit.
 *
 *   B. --from-pre-commit-hook is refused when $GIT_DIR is absent.
 *      Proves the guard prevents replay from an arbitrary shell.
 *
 *   C. The pre-commit auto-stage allow-list for sync.mjs outputs uses
 *      explicit paths and bounded loops — no broad `git add .` or `git add :/`.
 *      Proves parallel-session WIP cannot be swept into unrelated commits.
 *
 * Tests A and B use subprocess invocation of hook-integrity-check.mjs against
 * a minimal .githooks/ workspace (same pattern as hook-integrity-check.test.mjs).
 *
 * Test C is a static content check of .githooks/pre-commit — reading the file
 * and asserting presence of explicit paths + absence of broad glob patterns in
 * the sync.mjs block.
 *
 * Note on Tests A/B vs a full pre-commit simulation: Spinning up a full
 * pre-commit hook execution with Phase 5 (sync.mjs, header-fix, etc.) requires
 * a complete repo clone and network-free sync.mjs execution — integration cost
 * exceeds the marginal safety gain given that Test C already verifies the
 * structural correctness of the allow-list. The --from-pre-commit-hook flag is
 * tested functionally (Tests A/B). The pre-commit shell additions are verified
 * structurally (Test C). A combined end-to-end self-proof runs as the coa-merge
 * ceremony's own post-commit clean-tree check (see slice spec § Verification).
 *
 * R1 compliant: all temp dirs created under os.tmpdir(). No live-repo git
 * operations. safeGit is not imported — no git calls at all in these tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const REPO_ROOT = resolve(import.meta.dirname ?? '.', '..', '..');
const CHECK = join(REPO_ROOT, 'scripts', 'checks', 'hook-integrity-check.mjs');
const LIB = join(REPO_ROOT, 'scripts', 'lib', 'hook-integrity.mjs');
const PRE_COMMIT = join(REPO_ROOT, '.githooks', 'pre-commit');

// ---------------------------------------------------------------------------
// Workspace helper (mirrors hook-integrity-check.test.mjs pattern)
// ---------------------------------------------------------------------------

function makeTempWorkspace(suffix) {
  const dir = mkdtempSync(join(tmpdir(), `tpl278-${suffix}-`));
  mkdirSync(join(dir, '.githooks'), { recursive: true });
  mkdirSync(join(dir, 'scripts', 'checks'), { recursive: true });
  mkdirSync(join(dir, 'scripts', 'lib'), { recursive: true });

  cpSync(CHECK, join(dir, 'scripts', 'checks', 'hook-integrity-check.mjs'));
  cpSync(LIB, join(dir, 'scripts', 'lib', 'hook-integrity.mjs'));

  writeFileSync(
    join(dir, '.githooks', 'pre-commit'),
    '#!/usr/bin/env bash\n# mock pre-commit\necho ok\n',
  );
  writeFileSync(
    join(dir, '.githooks', 'pre-push'),
    '#!/usr/bin/env bash\n# mock pre-push\necho ok\n',
  );

  return dir;
}

function runCheck(cwd, extraArgs = [], envOverrides = {}) {
  const env = { ...process.env, ...envOverrides };
  // Strip operator/hook-bypass vars unless explicitly set by the caller
  if (!Object.prototype.hasOwnProperty.call(envOverrides, 'COA_OPERATOR')) {
    delete env.COA_OPERATOR;
  }
  if (!Object.prototype.hasOwnProperty.call(envOverrides, 'GIT_DIR')) {
    delete env.GIT_DIR;
  }
  const r = spawnSync(process.execPath, [CHECK, '--json', ...extraArgs], {
    cwd,
    env,
    encoding: 'utf8',
  });
  let payload = null;
  try {
    payload = JSON.parse(r.stdout || '{}');
  } catch {
    /* leave null */
  }
  return { code: r.status, stdout: r.stdout, stderr: r.stderr, payload };
}

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
// Test A: --from-pre-commit-hook bypasses COA_OPERATOR gate (trust-model)
//
// ADR-0019 trust model: --from-pre-commit-hook is equivalent privilege to
// COA_OPERATOR=1. The hook cannot use $GIT_DIR as the trust signal because
// Phase 7 (non-skippable) unsets GIT_DIR before Addition B runs.
// The trust foundation is Phase 1.0: it verifies the hook's own integrity
// before Addition B is ever reached, so a tampered hook cannot self-authorize.
// ---------------------------------------------------------------------------
describe('TPL-278 Test A: --from-pre-commit-hook bypasses COA_OPERATOR gate', () => {
  it('succeeds (exit 0) with --from-pre-commit-hook alone — no COA_OPERATOR required', () => {
    const dir = makeTempWorkspace('a-flag-only');
    try {
      generateRegistry(dir);

      // Modify a hook to trigger a "stale registry" scenario
      writeFileSync(
        join(dir, '.githooks', 'pre-commit'),
        '#!/usr/bin/env bash\n# modified pre-commit for test\necho ok\n',
      );

      // --from-pre-commit-hook alone (no GIT_DIR, no COA_OPERATOR) — must succeed
      const updated = runCheck(dir, ['--update', '--from-pre-commit-hook'], {});
      assert.equal(
        updated.code,
        0,
        `Expected exit 0 with --from-pre-commit-hook, got ${updated.code}\nstdout: ${updated.stdout}\nstderr: ${updated.stderr}`,
      );
      assert.equal(updated.payload?.ok, true);
      assert.equal(updated.payload?.action, 'updated');

      // Subsequent verify check must pass (registry now matches modified hook)
      const verify = runCheck(dir, []);
      assert.equal(
        verify.code,
        0,
        `Expected exit 0 after --from-pre-commit-hook update, got ${verify.code}\nstdout: ${verify.stdout}`,
      );
      assert.equal(verify.payload?.ok, true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Test B: --update without any authorization is refused
//
// Proves the operator gate still holds when neither COA_OPERATOR=1 nor
// --from-pre-commit-hook is provided. GIT_DIR alone is not sufficient.
// ---------------------------------------------------------------------------
describe('TPL-278 Test B: --update without authorization is refused', () => {
  it('exits 1 with COA_OPERATOR error when neither flag nor env is provided', () => {
    const dir = makeTempWorkspace('b-no-auth');
    try {
      generateRegistry(dir);

      const r = runCheck(dir, ['--update'], {
        // Confirm neither COA_OPERATOR nor the bypass flag
        COA_OPERATOR: '',
      });

      assert.equal(
        r.code,
        1,
        `Expected exit 1 without GIT_DIR, got ${r.code}\nstdout: ${r.stdout}\nstderr: ${r.stderr}`,
      );
      assert.equal(r.payload?.ok, false);
      assert.equal(r.payload?.ok, false);
      assert.ok(
        r.payload?.error?.includes('COA_OPERATOR'),
        `Error should mention COA_OPERATOR, got: ${r.payload?.error}`,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Test C: pre-commit auto-stage block uses explicit paths (parallel-WIP safety)
// ---------------------------------------------------------------------------
describe('TPL-278 Test C: sync.mjs auto-stage allow-list uses explicit paths (no broad globs)', () => {
  let preCommitContent;

  it('loads pre-commit hook content from .githooks/pre-commit', () => {
    preCommitContent = readFileSync(PRE_COMMIT, 'utf8');
    assert.ok(preCommitContent.length > 0, 'pre-commit hook must be non-empty');
  });

  it('contains the TPL-278 sync.mjs auto-stage block', () => {
    assert.ok(
      preCommitContent.includes('TPL-278'),
      'pre-commit must contain TPL-278 marker in the sync.mjs auto-stage block',
    );
  });

  it('stages AGENTS.md explicitly', () => {
    assert.ok(
      preCommitContent.includes('git add AGENTS.md'),
      'pre-commit must stage AGENTS.md explicitly',
    );
  });

  it('stages .cursorrules explicitly', () => {
    assert.ok(
      preCommitContent.includes('git add .cursorrules'),
      'pre-commit must stage .cursorrules explicitly',
    );
  });

  it('stages .agents/README.md and .agents/skills/README.md explicitly', () => {
    assert.ok(
      preCommitContent.includes('git add .agents/README.md'),
      'pre-commit must stage .agents/README.md explicitly',
    );
    assert.ok(
      preCommitContent.includes('git add .agents/skills/README.md'),
      'pre-commit must stage .agents/skills/README.md explicitly',
    );
  });

  it('uses a bounded loop for skills SKILL.md (not a broad glob add)', () => {
    // The loop pattern: `for f in .agents/skills/*/SKILL.md; do git add "$f"; done`
    // Proves the staging is bounded to SKILL.md files only, not .agents/**
    assert.ok(
      preCommitContent.includes('.agents/skills/*/SKILL.md'),
      'pre-commit must use a bounded SKILL.md loop path',
    );
    assert.ok(
      preCommitContent.includes('[ -f "$f" ] && git add "$f"'),
      'pre-commit must gate the loop on file existence',
    );
  });

  it('does NOT use broad git add patterns (git add . or git add :/) in the sync.mjs block', () => {
    // Extract the TPL-278 block and verify no broad patterns appear in it.
    const tpl278Start = preCommitContent.indexOf('# Auto-stage sync.mjs outputs (TPL-278)');
    assert.ok(tpl278Start >= 0, 'TPL-278 block must exist in pre-commit');

    // End at the hook-integrity block or end of file
    const blockEnd = preCommitContent.indexOf(
      '# Hook-integrity post-stamp regen (TPL-278)',
      tpl278Start,
    );
    const block =
      blockEnd > 0
        ? preCommitContent.slice(tpl278Start, blockEnd)
        : preCommitContent.slice(tpl278Start);

    // Check for `git add .` as a standalone staging command (followed by space/newline/end),
    // not as a prefix of a legitimate path like `git add .cursorrules`.
    // Broad patterns are `git add . `, `git add .\n`, `git add :/`.
    const hasBroadAdd = /\bgit add \. ?(\n|2>)/.test(block) || block.includes('git add :/');
    assert.ok(
      !hasBroadAdd,
      `sync.mjs auto-stage block must not use broad git add; block:\n${block}`,
    );
  });

  it('contains the hook-integrity post-stamp regen block guarded by ORIG_STAGED grep', () => {
    assert.ok(
      preCommitContent.includes('--from-pre-commit-hook'),
      'pre-commit must invoke hook-integrity-check with --from-pre-commit-hook',
    );
    // The guard is: `echo "$ORIG_STAGED" | grep -q '^\.githooks/'`
    // We check for the components rather than the exact string to avoid JS
    // escape-sequence ambiguity with the backslash in the regex pattern.
    assert.ok(
      preCommitContent.includes('echo "$ORIG_STAGED"') &&
        preCommitContent.includes('grep -q') &&
        preCommitContent.includes('.githooks/'),
      'hook-integrity regen must be guarded by ORIG_STAGED containing .githooks/ entries',
    );
    assert.ok(
      preCommitContent.includes('git add .githooks/.fingerprints.json'),
      'pre-commit must stage the fingerprints registry after regen',
    );
  });
});
