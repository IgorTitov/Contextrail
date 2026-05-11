/* @HEADER
 * @version 0.7.61 | 2026-05-03
 * @purpose Integration test proving J5 auto-extend covers CHANGELOG.md when pre-staged + sidecar pairs (TPL-252).
 * @sidecar coa-merge-j5-auto-extend.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * TPL-252 — J5 auto-extend integration tests.
 *
 * Two regression scenarios:
 *
 * Test 1: CHANGELOG.md pre-staged by operator + claim covers only source file.
 *   Before fix: J5 filtered CHANGELOG.md from addPaths → Phase-3 claim-check
 *   blocked (CHANGELOG.md is a protected path). After fix: J5 always adds it.
 *
 * Test 2: Source file + sidecar both staged + claim covers only source file.
 *   Before fix: J5 didn't pair sidecars → sidecar not in claim. After fix:
 *   J5 detects sidecar exists, extends claim, commit succeeds.
 *
 * Both tests run a full coa-merge ceremony in an isolated git fixture so the
 * proof is end-to-end (J5 → claim-check --extend → claim-check --enforce).
 *
 * Every git invocation uses safeGit/safeGitSpawn (R1 / ADR-0015).
 */

import { describe, test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';

import { safeGitSpawn } from '../_setup/safe-git.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COA_MERGE = resolve(__dirname, '../../scripts/coa-merge.mjs');

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

/** Strip git plumbing env vars so the subprocess stays in the fixture. */
function subprocessEnv(fixtureRoot) {
  const env = { ...process.env };
  for (const key of [
    'GIT_DIR',
    'GIT_WORK_TREE',
    'GIT_INDEX_FILE',
    'GIT_OBJECT_DIRECTORY',
    'GIT_ALTERNATE_OBJECT_DIRECTORIES',
  ]) {
    delete env[key];
  }
  env.GIT_CEILING_DIRECTORIES = realpathSync(tmpdir());
  env.GIT_CONFIG_NOSYSTEM = '1';
  // Disable pre-commit hooks in the fixture (no .githooks present anyway,
  // but guard against any global hook path that might be set).
  env.GIT_HOOKS_DIR = '';
  return env;
}

/**
 * Bootstrap a minimal git repo with the required ceremony structure.
 * Returns the fixture root path.
 */
function createBaseFixture(label) {
  const root = mkdtempSync(join(tmpdir(), `coa-j5-${label}-`));

  safeGitSpawn(root, ['init', '-b', 'main']);
  safeGitSpawn(root, ['config', 'user.email', 'test@j5extend.local']);
  safeGitSpawn(root, ['config', 'user.name', 'J5 Extend Test']);
  safeGitSpawn(root, ['config', 'commit.gpgsign', 'false']);

  // .claims directory with config that treats CHANGELOG.md as a protected
  // blocked path — mirrors the real repo config so Phase-3 would block on
  // an uncovered pre-staged CHANGELOG.md.
  mkdirSync(join(root, '.claims'), { recursive: true });
  writeFileSync(
    join(root, '.claims', 'config.json'),
    JSON.stringify(
      {
        protectedPathMode: 'block',
        protectedPaths: ['CHANGELOG.md', 'VERSION', 'package.json'],
      },
      null,
      2,
    ) + '\n',
  );

  writeFileSync(join(root, 'VERSION'), '0.0.1\n');
  writeFileSync(join(root, 'CHANGELOG.md'), '# Changelog\n\n## [Unreleased]\n\n- initial\n');
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({ name: 'j5-extend-fixture', version: '0.0.1' }, null, 2) + '\n',
  );

  safeGitSpawn(root, ['add', 'VERSION', 'CHANGELOG.md', 'package.json', '.claims/config.json']);
  safeGitSpawn(root, ['commit', '-m', 'init']);

  return root;
}

/** Write a claim JSON file into the fixture's .claims/ directory. */
function writeClaim(root, claimId, agent, slice, targetPaths) {
  const now = new Date();
  const expires = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);
  writeFileSync(
    join(root, '.claims', `${claimId}.json`),
    JSON.stringify(
      {
        id: claimId,
        agent,
        slice,
        targets: targetPaths.map((path) => ({ path, action: 'modify' })),
        status: 'active',
        strategy: 'modify-in-place',
        created: now.toISOString(),
        expires: expires.toISOString(),
      },
      null,
      2,
    ) + '\n',
  );
}

/** Run coa-merge in the fixture root and return the spawnSync result. */
function runCoaMerge(root, message, env) {
  return spawnSync(process.execPath, [COA_MERGE, `--message=${message}`, '--no-snapshot'], {
    cwd: root,
    encoding: 'utf8',
    stdio: 'pipe',
    env,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('coa-merge J5 auto-extend: integration (TPL-252)', () => {
  let fixtureRoot;
  afterEach(() => {
    if (fixtureRoot && existsSync(fixtureRoot)) {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
    fixtureRoot = undefined;
  });

  test('pre-staged CHANGELOG.md is auto-extended into claim — ceremony succeeds', () => {
    // Regression for TPL-249 gap: operator hand-edits CHANGELOG.md, stages it,
    // then runs coa-merge. Claim covers only the user's source file. Old J5
    // filtered CHANGELOG.md from addPaths → claim-check --enforce blocked.
    // Fixed in TPL-252: ceremony files never filtered from extend list.
    fixtureRoot = createBaseFixture('changelog');

    // Refresh CHANGELOG with new unreleased content.
    writeFileSync(
      join(fixtureRoot, 'CHANGELOG.md'),
      '# Changelog\n\n## [Unreleased]\n\n- new feature (TPL-252)\n',
    );

    // The user's implementation file.
    writeFileSync(join(fixtureRoot, 'src.mjs'), 'export const fix = 1;\n');

    // Stage BOTH the source and CHANGELOG.md (operator pre-staged changelog).
    safeGitSpawn(fixtureRoot, ['add', 'src.mjs', 'CHANGELOG.md']);

    // Claim covers only the source file — NOT CHANGELOG.md.
    writeClaim(fixtureRoot, 'clm-j5-changelog', 'test-agent', 'TPL-252', ['src.mjs']);

    const env = subprocessEnv(fixtureRoot);
    env.COA_AGENT = 'test-agent';
    // Skip pre-commit phases that need real repo infrastructure.
    env.COA_GATE = 'minimal';

    const result = runCoaMerge(
      fixtureRoot,
      'test(j5): pre-staged CHANGELOG auto-extend (TPL-252)',
      env,
    );

    assert.strictEqual(
      result.status,
      0,
      `coa-merge should succeed when J5 auto-extends CHANGELOG.md.\n` +
        `STDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`,
    );

    // Both files in HEAD commit.
    const show = safeGitSpawn(fixtureRoot, ['show', '--name-only', '--format=', 'HEAD']);
    const committed = show.stdout.trim().split('\n').filter(Boolean);
    assert.ok(
      committed.includes('src.mjs'),
      `src.mjs missing from HEAD commit. Committed: ${committed.join(', ')}`,
    );
    assert.ok(
      committed.includes('CHANGELOG.md'),
      `CHANGELOG.md missing from HEAD commit. Committed: ${committed.join(', ')}`,
    );
  });

  test('sidecar staged alongside source — J5 extends claim to cover sidecar', () => {
    // When operator stages both source.mjs and source.mjs.header.md but the
    // claim covers only source.mjs, J5 must detect the sidecar and extend.
    fixtureRoot = createBaseFixture('sidecar');

    // Refresh CHANGELOG content for ceremony.
    writeFileSync(
      join(fixtureRoot, 'CHANGELOG.md'),
      '# Changelog\n\n## [Unreleased]\n\n- sidecar pair fix (TPL-252)\n',
    );

    // Source file + its sidecar.
    writeFileSync(join(fixtureRoot, 'src.mjs'), 'export const value = 42;\n');
    writeFileSync(
      join(fixtureRoot, 'src.mjs.header.md'),
      '---\nname: src.mjs\ndescription: test sidecar\n---\n# src.mjs\n',
    );

    // Stage source + sidecar.
    safeGitSpawn(fixtureRoot, ['add', 'src.mjs', 'src.mjs.header.md']);

    // Claim covers only the source file.
    writeClaim(fixtureRoot, 'clm-j5-sidecar', 'test-agent', 'TPL-252', ['src.mjs']);

    const env = subprocessEnv(fixtureRoot);
    env.COA_AGENT = 'test-agent';
    env.COA_GATE = 'minimal';

    const result = runCoaMerge(fixtureRoot, 'test(j5): sidecar pair auto-extend (TPL-252)', env);

    assert.strictEqual(
      result.status,
      0,
      `coa-merge should succeed when J5 auto-extends sidecar.\n` +
        `STDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`,
    );

    const show = safeGitSpawn(fixtureRoot, ['show', '--name-only', '--format=', 'HEAD']);
    const committed = show.stdout.trim().split('\n').filter(Boolean);
    assert.ok(
      committed.includes('src.mjs'),
      `src.mjs missing from HEAD commit. Committed: ${committed.join(', ')}`,
    );
    assert.ok(
      committed.includes('src.mjs.header.md'),
      `src.mjs.header.md missing from HEAD commit. Committed: ${committed.join(', ')}`,
    );
  });
});
