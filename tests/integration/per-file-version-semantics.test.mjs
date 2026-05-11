/* @HEADER
 * @version 0.7.47 | 2026-05-03
 * @purpose Integration tests for per-file @version semantics: convergence after commit (TPL-246) and last-content-change invariant (ADR-0014).
 * @sidecar per-file-version-semantics.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Per-file @version semantics integration tests (ADR-0014, TPL-246).
 *
 * CG-H2-1: edit file A, commit; verify @version on A bumped, @version on
 * unrelated B unchanged.
 *
 * TPL-246 convergence: after a full ceremony commit using
 * header-fix --use-current-version, `git status --porcelain` must be empty.
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { safeGit } from '../_setup/safe-git.mjs';

const REPO_ROOT = resolve(import.meta.dirname ?? '.', '..', '..');

function runHeaderFix(cwd, args = []) {
  return spawnSync(
    process.execPath,
    [join(REPO_ROOT, 'scripts', 'checks', 'header-fix.mjs'), ...args],
    { cwd, encoding: 'utf8', stdio: 'pipe', env: { ...process.env, COA_PRE_COMMIT: '1' } },
  );
}

function slimFile(name, version, body) {
  return [
    '/* @HEADER',
    ` * @version ${version} | 2026-01-01`,
    ` * @purpose ${name} fixture.`,
    ` * @sidecar ${name}.header.md`,
    ' * @layer tooling | @hex _none_ | @ctx _none_',
    ' * @public false',
    ' * @edit careful',
    ' */',
    '',
    body,
    '',
  ].join('\n');
}

function setupRepo(name) {
  const dir = mkdtempSync(join(tmpdir(), `coa-pfvs-${name}-`));
  safeGit(dir, 'init --quiet', { stdio: 'pipe' });
  safeGit(dir, 'config user.email "test@test.com"', { stdio: 'pipe' });
  safeGit(dir, 'config user.name "Test"', { stdio: 'pipe' });
  writeFileSync(join(dir, 'VERSION'), '0.1.0\n');
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ name: 'tmp', version: '0.1.0' }, null, 2) + '\n',
  );
  mkdirSync(join(dir, 'scripts'), { recursive: true });
  return dir;
}

// ---------------------------------------------------------------------------
// CG-H2-1 — last-content-change invariant
// ---------------------------------------------------------------------------

describe('per-file-version-semantics: last-content-change invariant (CG-H2-1)', () => {
  test('--use-current-version stamps A (changed) but leaves B (unchanged) unmodified in its commit blob', () => {
    const repo = setupRepo('cg-h2-1');
    try {
      writeFileSync(
        join(repo, 'scripts', 'a.mjs'),
        slimFile('a.mjs', '0.1.0', 'export const v = 1;'),
      );
      writeFileSync(
        join(repo, 'scripts', 'b.mjs'),
        slimFile('b.mjs', '0.1.0', 'export const v = 1;'),
      );
      safeGit(repo, 'add -A', { stdio: 'pipe' });
      safeGit(repo, 'commit -m "init" --quiet', { stdio: 'pipe' });

      // Bump VERSION and edit only a.mjs body.
      writeFileSync(join(repo, 'VERSION'), '0.2.0\n');
      writeFileSync(
        join(repo, 'scripts', 'a.mjs'),
        slimFile('a.mjs', '0.1.0', 'export const v = 2;'),
      );
      safeGit(repo, 'add VERSION scripts/a.mjs', { stdio: 'pipe' });

      // Simulate Phase 5 with --use-current-version.
      const result = runHeaderFix(repo, ['--since=HEAD', '--use-current-version', '--json']);
      assert.equal(result.status, 0, `header-fix failed: ${result.stderr}`);
      const json = JSON.parse(result.stdout);
      assert.equal(json.ok, true);
      assert.equal(json.data.useCurrentVersion, true);

      // a.mjs should have @version 0.2.0 stamped.
      const aOnDisk = readFileSync(join(repo, 'scripts', 'a.mjs'), 'utf8');
      assert.match(aOnDisk, /@version 0\.2\.0/, 'a.mjs should be stamped with 0.2.0');

      // b.mjs is NOT in the --since=HEAD scope — must be byte-identical to HEAD.
      const bOnDisk = readFileSync(join(repo, 'scripts', 'b.mjs'), 'utf8');
      const bAtHead = safeGit(repo, 'show HEAD:scripts/b.mjs', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      assert.equal(
        bOnDisk,
        bAtHead,
        'b.mjs must remain byte-identical to HEAD (not in changed set)',
      );
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// TPL-246 — working-tree convergence after commit
// ---------------------------------------------------------------------------

describe('per-file-version-semantics: working-tree convergence after commit (TPL-246)', () => {
  test('git status --porcelain is empty after ceremony commit with --use-current-version', () => {
    const repo = setupRepo('convergence');
    try {
      // Scaffold: two slim-header files + hooks pointing to the real scripts.
      writeFileSync(
        join(repo, 'scripts', 'a.mjs'),
        slimFile('a.mjs', '0.1.0', 'export const v = 1;'),
      );
      writeFileSync(
        join(repo, 'scripts', 'b.mjs'),
        slimFile('b.mjs', '0.1.0', 'export const v = 1;'),
      );

      // Install the real pre-commit and post-commit hooks so the git commit
      // invokes them. We copy the hook bodies and point them at REPO_ROOT's
      // scripts (the tmp repo has no scripts/ of its own).
      mkdirSync(join(repo, '.git', 'hooks'), { recursive: true });

      // Minimal pre-commit: only Phase 5 (header-fix) + re-stage.
      // Full hook requires many scripts not present in the tmp repo.
      const preCommitBody = [
        '#!/usr/bin/env bash',
        'set -uo pipefail',
        'ORIG_STAGED=$(git diff --cached --name-only)',
        `export COA_PRE_COMMIT=1`,
        // Run header-fix from the real repo root using the tmp repo as cwd.
        `node "${join(REPO_ROOT, 'scripts', 'checks', 'header-fix.mjs').replace(/\\/g, '/')}" --since=HEAD --use-current-version || exit 1`,
        // Re-stage originally-staged files.
        'echo "$ORIG_STAGED" | while IFS= read -r f; do',
        '  [ -n "$f" ] && git add "$f" 2>/dev/null',
        'done',
        'exit 0',
      ].join('\n');
      writeFileSync(join(repo, '.git', 'hooks', 'pre-commit'), preCommitBody, { mode: 0o755 });

      // Post-commit is a no-op (TPL-246).
      writeFileSync(join(repo, '.git', 'hooks', 'post-commit'), '#!/usr/bin/env bash\nexit 0\n', {
        mode: 0o755,
      });

      safeGit(repo, 'add -A', { stdio: 'pipe' });
      safeGit(repo, 'commit -m "init" --quiet', { stdio: 'pipe' });

      // Simulate a ceremony: bump VERSION + edit a.mjs body, stage both.
      writeFileSync(join(repo, 'VERSION'), '0.2.0\n');
      writeFileSync(
        join(repo, 'scripts', 'a.mjs'),
        slimFile('a.mjs', '0.1.0', 'export const v = 99;'),
      );
      safeGit(repo, 'add VERSION scripts/a.mjs', { stdio: 'pipe' });

      // Commit triggers the pre-commit hook which stamps + re-stages.
      safeGit(repo, 'commit -m "bump to 0.2.0" --quiet', { stdio: 'pipe' });

      // Working tree MUST be clean after the commit.
      const status = safeGit(repo, 'status --porcelain', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      assert.equal(status.trim(), '', `Expected empty git status after commit; got:\n${status}`);

      // And a.mjs in HEAD should carry @version 0.2.0.
      const aInHead = safeGit(repo, 'show HEAD:scripts/a.mjs', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      assert.match(aInHead, /@version 0\.2\.0/, 'a.mjs in HEAD commit should have @version 0.2.0');
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  test('--use-current-version result: useCurrentVersion flag is true in JSON output', () => {
    const repo = setupRepo('json-flag');
    try {
      writeFileSync(
        join(repo, 'scripts', 'a.mjs'),
        slimFile('a.mjs', '0.1.0', 'export const v = 1;'),
      );
      safeGit(repo, 'add -A', { stdio: 'pipe' });
      safeGit(repo, 'commit -m "init" --quiet', { stdio: 'pipe' });

      writeFileSync(join(repo, 'VERSION'), '0.2.0\n');
      writeFileSync(
        join(repo, 'scripts', 'a.mjs'),
        slimFile('a.mjs', '0.1.0', 'export const v = 2;'),
      );
      safeGit(repo, 'add VERSION scripts/a.mjs', { stdio: 'pipe' });

      const result = runHeaderFix(repo, ['--since=HEAD', '--use-current-version', '--json']);
      assert.equal(result.status, 0);
      const json = JSON.parse(result.stdout);
      assert.equal(
        json.data.useCurrentVersion,
        true,
        'JSON output should report useCurrentVersion: true',
      );
      assert.equal(
        json.data.lazyStamp,
        false,
        'lazyStamp should be false when --use-current-version is used alone',
      );
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });
});
