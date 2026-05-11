/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit proofs for header-backfill.mjs — last-content-change @version resolution and fail-soft fallbacks (ADR-0014 / TPL-233).
 * @sidecar header-backfill.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { resolveBackfillVersion } from '../../scripts/checks/header-backfill.mjs';
import { safeGitSpawn } from '../_setup/safe-git.mjs';

const REPO_ROOT = resolve(import.meta.dirname ?? '.', '..', '..');
const HEADER_BACKFILL = join(REPO_ROOT, 'scripts', 'checks', 'header-backfill.mjs');

// ---------------------------------------------------------------------------
// Pure-helper tests for resolveBackfillVersion. The script's run-mode plumbing
// (git, fs, report writer) is integration-tested separately below; these
// assertions pin the algorithm-level fallback contract of ADR-0014.
// ---------------------------------------------------------------------------

describe('resolveBackfillVersion() — TPL-233', () => {
  test('returns the VERSION at the last content-change commit when both git calls succeed', () => {
    const result = resolveBackfillVersion('scripts/foo.mjs', {
      currentVersion: '0.7.34',
      runResolveHash: () => 'abc1234',
      runResolveVersionAtHash: (hash) => {
        assert.equal(hash, 'abc1234', 'should pass the resolved hash to the version lookup');
        return '0.5.3';
      },
    });
    assert.deepEqual(result, { resolved: '0.5.3', hash: 'abc1234', fallback: null });
  });

  test('falls back to current VERSION when git log returns no hash (uncommitted file)', () => {
    const result = resolveBackfillVersion('scripts/never-committed.mjs', {
      currentVersion: '0.7.34',
      runResolveHash: () => null,
      runResolveVersionAtHash: () => {
        throw new Error('should not be called when there is no hash');
      },
    });
    assert.deepEqual(result, { resolved: '0.7.34', hash: null, fallback: 'no-history' });
  });

  test('falls back to current VERSION when git show <hash>:VERSION fails', () => {
    const result = resolveBackfillVersion('scripts/predates-version-file.mjs', {
      currentVersion: '0.7.34',
      runResolveHash: () => 'olderhash',
      runResolveVersionAtHash: () => null,
    });
    assert.deepEqual(result, {
      resolved: '0.7.34',
      hash: 'olderhash',
      fallback: 'no-version-file',
    });
  });

  test('returns hash from runResolveHash even when fallback fires (audit trail)', () => {
    const result = resolveBackfillVersion('scripts/x.mjs', {
      currentVersion: '0.7.34',
      runResolveHash: () => 'xyz',
      runResolveVersionAtHash: () => null,
    });
    assert.equal(result.hash, 'xyz');
    assert.equal(result.fallback, 'no-version-file');
  });
});

// ---------------------------------------------------------------------------
// End-to-end CLI proof on a temp git repo with multi-commit history. The
// load-bearing behaviour is: a file's @version after backfill matches the
// VERSION the repo had at the file's last content-change commit, NOT the
// current VERSION.
// ---------------------------------------------------------------------------

function git(cwd, args) {
  const out = safeGitSpawn(cwd, args, { encoding: 'utf8', stdio: 'pipe' });
  if (out.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${out.stderr}`);
  }
  return out.stdout;
}

function writeSlim(file, version, body) {
  writeFileSync(
    file,
    [
      '/* @HEADER',
      ` * @version ${version} | 2026-01-01`,
      ` * @purpose ${file} fixture for backfill test.`,
      ` * @sidecar ${file.split(/[\\/]/).pop()}.header.md`,
      ' * @layer tooling | @hex _none_ | @ctx _none_',
      ' * @public false',
      ' * @edit careful',
      ' */',
      '',
      body,
      '',
    ].join('\n'),
  );
}

function setupBackfillRepo(name) {
  const dir = mkdtempSync(join(tmpdir(), `coa-backfill-${name}-`));
  git(dir, ['init', '--quiet']);
  git(dir, ['config', 'user.email', 'test@test.com']);
  git(dir, ['config', 'user.name', 'Test']);

  writeFileSync(join(dir, 'VERSION'), '0.1.0\n');
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ name: 'tmp', version: '0.1.0' }, null, 2) + '\n',
  );
  mkdirSync(join(dir, 'scripts'), { recursive: true });

  // Commit 1 (VERSION 0.1.0): create a.mjs and b.mjs.
  writeSlim(join(dir, 'scripts', 'a.mjs'), '0.1.0', 'export const value = 1;');
  writeSlim(join(dir, 'scripts', 'b.mjs'), '0.1.0', 'export const value = 1;');
  git(dir, ['add', '-A']);
  git(dir, ['commit', '-m', 'init', '--quiet']);

  // Commit 2 (VERSION bumped to 0.2.0): edit a.mjs only.
  writeFileSync(join(dir, 'VERSION'), '0.2.0\n');
  writeSlim(join(dir, 'scripts', 'a.mjs'), '0.1.0', 'export const value = 2;');
  git(dir, ['add', '-A']);
  git(dir, ['commit', '-m', 'bump', '--quiet']);

  // Commit 3 (VERSION 0.3.0): edit a.mjs again, leave b.mjs alone, add c.mjs.
  writeFileSync(join(dir, 'VERSION'), '0.3.0\n');
  writeSlim(join(dir, 'scripts', 'a.mjs'), '0.1.0', 'export const value = 3;');
  writeSlim(join(dir, 'scripts', 'c.mjs'), '0.1.0', 'export const value = 99;');
  git(dir, ['add', '-A']);
  git(dir, ['commit', '-m', 'bump-c', '--quiet']);

  return dir;
}

describe('header-backfill CLI — TPL-233 integration', () => {
  test('a.mjs gets stamped with 0.3.0 (last content-change), b.mjs with 0.1.0', () => {
    const dir = setupBackfillRepo('multi-commit');
    try {
      const out = spawnSync(process.execPath, [HEADER_BACKFILL, '--json'], {
        cwd: dir,
        encoding: 'utf8',
        stdio: 'pipe',
      });
      assert.equal(out.status, 0, `header-backfill failed: ${out.stderr}\n${out.stdout}`);
      const json = JSON.parse(out.stdout);
      assert.equal(json.ok, true);

      const a = readFileSync(join(dir, 'scripts', 'a.mjs'), 'utf8');
      assert.match(a, /@version 0\.3\.0/, 'a.mjs last changed at v0.3.0');

      const b = readFileSync(join(dir, 'scripts', 'b.mjs'), 'utf8');
      assert.match(b, /@version 0\.1\.0/, 'b.mjs last changed at v0.1.0');

      const c = readFileSync(join(dir, 'scripts', 'c.mjs'), 'utf8');
      assert.match(c, /@version 0\.3\.0/, 'c.mjs added at v0.3.0');

      // Per-file report on disk for audit.
      const reportPath = join(dir, 'docs', '_generated', 'header-backfill-report.json');
      assert.ok(existsSync(reportPath), 'audit report should be written');
      const report = JSON.parse(readFileSync(reportPath, 'utf8'));
      assert.equal(report.schemaVersion, 1);
      const aEntry = report.files.find((f) => f.file === 'scripts/a.mjs');
      assert.ok(aEntry, 'report includes a.mjs entry');
      assert.equal(aEntry.resolvedVersion, '0.3.0');
      assert.equal(aEntry.fallback, null, 'clean resolution — no fallback');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('uncommitted file falls back to current VERSION with WARN tag', () => {
    const dir = setupBackfillRepo('uncommitted');
    try {
      // Bump VERSION in the working tree (not committed).
      writeFileSync(join(dir, 'VERSION'), '0.4.0\n');
      // Add a file that has never been committed.
      writeSlim(join(dir, 'scripts', 'wt-only.mjs'), '0.1.0', 'export const x = 1;');

      const out = spawnSync(process.execPath, [HEADER_BACKFILL, '--json'], {
        cwd: dir,
        encoding: 'utf8',
        stdio: 'pipe',
      });
      assert.equal(out.status, 0, `header-backfill failed: ${out.stderr}`);

      const wt = readFileSync(join(dir, 'scripts', 'wt-only.mjs'), 'utf8');
      assert.match(wt, /@version 0\.4\.0/, 'uncommitted file should fall back to current VERSION');

      const reportPath = join(dir, 'docs', '_generated', 'header-backfill-report.json');
      const report = JSON.parse(readFileSync(reportPath, 'utf8'));
      const entry = report.files.find((f) => f.file === 'scripts/wt-only.mjs');
      assert.ok(entry, 'report includes the uncommitted file');
      assert.equal(entry.fallback, 'no-history');
      assert.equal(entry.resolvedVersion, '0.4.0');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('idempotent re-run on a converged tree produces zero drifted writes', () => {
    const dir = setupBackfillRepo('idempotent');
    try {
      const first = spawnSync(process.execPath, [HEADER_BACKFILL, '--json'], {
        cwd: dir,
        encoding: 'utf8',
        stdio: 'pipe',
      });
      assert.equal(first.status, 0);
      const reportPath = join(dir, 'docs', '_generated', 'header-backfill-report.json');
      const firstReport = JSON.parse(readFileSync(reportPath, 'utf8'));
      assert.ok(firstReport.counts.drifted >= 1, 'first run should drift at least one file');

      const second = spawnSync(process.execPath, [HEADER_BACKFILL, '--json'], {
        cwd: dir,
        encoding: 'utf8',
        stdio: 'pipe',
      });
      assert.equal(second.status, 0);
      const secondReport = JSON.parse(readFileSync(reportPath, 'utf8'));
      assert.equal(
        secondReport.counts.drifted,
        0,
        'second run must drift nothing on a converged tree',
      );
      assert.equal(secondReport.counts.alreadyCorrect, firstReport.counts.walked);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('--dry-run does not write the audit report file', () => {
    const dir = setupBackfillRepo('dry-run');
    try {
      const out = spawnSync(process.execPath, [HEADER_BACKFILL, '--dry-run', '--json'], {
        cwd: dir,
        encoding: 'utf8',
        stdio: 'pipe',
      });
      assert.equal(out.status, 0, `header-backfill failed: ${out.stderr}`);
      const reportPath = join(dir, 'docs', '_generated', 'header-backfill-report.json');
      assert.ok(!existsSync(reportPath), 'dry-run must not produce the on-disk report');

      // a.mjs stays at the original 0.1.0 stamp — dry-run does not write to source files either.
      const a = readFileSync(join(dir, 'scripts', 'a.mjs'), 'utf8');
      assert.match(a, /@version 0\.1\.0/, 'dry-run must not modify source files');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
