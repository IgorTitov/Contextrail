/* @HEADER
 * @version 0.7.53 | 2026-05-03
 * @purpose Integration regression test for R8.1 — proves snapshot-coverage-check.mjs detects the bypass incident shape (CHANGELOG version with no .backups/ snapshot) and stays green when coverage is intact.
 * @sidecar snapshot-coverage-gap.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Integration test (R8.1 / TPL-247).
 *
 * Encodes the --no-verify bypass incident shape as a regression-first proof:
 * a temp repo whose CHANGELOG declares two versions but whose .backups/ only
 * has one of them MUST cause snapshot-coverage-check to exit non-zero, and
 * the failure message must name the missing version.
 *
 * Each scenario builds its own temp repo end-to-end so the test file stays
 * the single source of truth for what "the R8.1 invariant" means at runtime.
 *
 * Git calls use safeGit / safeGitSpawn (R1, ADR-0015) — never inline execSync.
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync, mkdirSync, writeFileSync, rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { safeGit, safeGitSpawn } from '../_setup/safe-git.mjs';

const REPO_ROOT = resolve(import.meta.dirname ?? '.', '..', '..');
const CHECK = join(REPO_ROOT, 'scripts', 'checks', 'snapshot-coverage-check.mjs');

function makeTempRepo(suffix) {
  const dir = mkdtempSync(join(tmpdir(), `r8-tpl247-${suffix}-`));
  // Minimal package.json so the check finds a name.
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ name: 'snap-test', version: '0.0.1' }, null, 2) + '\n',
  );
  mkdirSync(join(dir, '.backups'), { recursive: true });
  return dir;
}

function writeChangelog(dir, versions) {
  const lines = ['# CHANGELOG', '', '## [Unreleased]', ''];
  for (const v of versions) {
    lines.push(`## [${v}] - 2026-05-03 12:00:00 UTC+0`);
    lines.push('### Added');
    lines.push(`- entry for ${v}`);
    lines.push('');
  }
  writeFileSync(join(dir, 'CHANGELOG.md'), lines.join('\n'));
}

function placeBackup(dir, repoName, version, kinds) {
  for (const kind of kinds) {
    writeFileSync(
      join(dir, '.backups', `merge-${repoName}(${version}).${kind}`),
      `stub ${kind} for ${version}`,
    );
  }
}

function runCheck(cwd, extraArgs = []) {
  // Force a min-zip-version that pre-dates our test versions so the .zip
  // requirement always applies — keeps the test independent of the production
  // DEFAULT_MIN_ZIP_VERSION constant.
  const args = [CHECK, '--min-zip-version=0.0.1', '--json', ...extraArgs];
  const r = spawnSync(process.execPath, args, { cwd, encoding: 'utf8' });
  let payload = null;
  try { payload = JSON.parse(r.stdout || '{}'); } catch { /* leave null */ }
  return { code: r.status, stdout: r.stdout, stderr: r.stderr, payload };
}

describe('snapshot-coverage-check integration', () => {
  test('regression: detects bypass incident shape (one version uncovered)', () => {
    const dir = makeTempRepo('incident');
    try {
      // CHANGELOG declares two versions
      writeChangelog(dir, ['0.0.3', '0.0.2']);
      // Backups only cover 0.0.2 — exactly the incident
      placeBackup(dir, 'snap-test', '0.0.2', ['txt', 'zip']);

      const r = runCheck(dir);
      assert.equal(r.code, 1, 'check must exit 1 when a version is uncovered');
      assert.equal(r.payload?.ok, false);
      assert.equal(r.payload?.gaps?.length, 1);
      assert.equal(r.payload?.gaps?.[0]?.version, '0.0.3');
      assert.equal(r.payload?.gaps?.[0]?.missingTxt, true);
      assert.equal(r.payload?.gaps?.[0]?.missingZip, true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('happy path: passes when every CHANGELOG version has both .txt and .zip', () => {
    const dir = makeTempRepo('happy');
    try {
      writeChangelog(dir, ['0.0.3', '0.0.2']);
      placeBackup(dir, 'snap-test', '0.0.3', ['txt', 'zip']);
      placeBackup(dir, 'snap-test', '0.0.2', ['txt', 'zip']);

      const r = runCheck(dir);
      assert.equal(r.code, 0);
      assert.equal(r.payload?.ok, true);
      assert.equal(r.payload?.gaps?.length, 0);
      assert.equal(r.payload?.checked, 2);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('flags half-baked snapshot (.txt present, .zip missing)', () => {
    const dir = makeTempRepo('halfbaked');
    try {
      writeChangelog(dir, ['0.0.4']);
      placeBackup(dir, 'snap-test', '0.0.4', ['txt']); // no zip
      const r = runCheck(dir);
      assert.equal(r.code, 1);
      assert.equal(r.payload?.gaps?.length, 1);
      assert.equal(r.payload?.gaps?.[0]?.missingTxt, false);
      assert.equal(r.payload?.gaps?.[0]?.missingZip, true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('--since scopes the check to versions added between two refs', () => {
    const dir = makeTempRepo('since');
    try {
      // safeGitSpawn uses spawnSync with shell:false — multi-word args pass safely.
      safeGitSpawn(dir, ['init', '-q']);
      safeGitSpawn(dir, ['config', 'user.email', 't@t.test']);
      safeGitSpawn(dir, ['config', 'user.name', 'T']);
      safeGitSpawn(dir, ['config', 'commit.gpgsign', 'false']);

      // First commit: only 0.0.1 in CHANGELOG, fully covered
      writeChangelog(dir, ['0.0.1']);
      placeBackup(dir, 'snap-test', '0.0.1', ['txt', 'zip']);
      safeGitSpawn(dir, ['add', '.']);
      safeGitSpawn(dir, ['commit', '-q', '-m', 'v0.0.1']);
      const baseSha = safeGitSpawn(dir, ['rev-parse', 'HEAD']).stdout.trim();

      // Second commit: adds 0.0.2 to CHANGELOG but does NOT add the snapshot
      // (this is the --no-verify bypass incident shape)
      writeChangelog(dir, ['0.0.2', '0.0.1']);
      safeGitSpawn(dir, ['add', 'CHANGELOG.md']);
      safeGitSpawn(dir, ['commit', '-q', '-m', 'v0.0.2-no-backup']);

      // Without --since: full scan flags 0.0.2 as uncovered.
      const full = runCheck(dir);
      assert.equal(full.code, 1);
      assert.equal(full.payload?.checked, 2);
      assert.equal(full.payload?.gaps?.length, 1);

      // With --since=<baseSha>: only 0.0.2 is in scope (0.0.1 was already
      // there), and it is uncovered → still fails.
      const since = runCheck(dir, [`--since=${baseSha}`]);
      assert.equal(since.code, 1);
      assert.equal(since.payload?.checked, 1);
      assert.equal(since.payload?.gaps?.[0]?.version, '0.0.2');

      // If we then add the snapshot for 0.0.2, --since passes again.
      placeBackup(dir, 'snap-test', '0.0.2', ['txt', 'zip']);
      const recovered = runCheck(dir, [`--since=${baseSha}`]);
      assert.equal(recovered.code, 0);
      assert.equal(recovered.payload?.gaps?.length, 0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
