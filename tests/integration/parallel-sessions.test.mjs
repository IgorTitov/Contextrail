/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Integration tests proving parallel-session safety: worktree isolation, claim enforcement, VERSION race protection, merge wrapper correctness, and TPL-222 atomicity (half-baked detect-and-resume + claim --extend before enforce).
 * @sidecar parallel-sessions.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Parallel-session integration tests (TPL-192).
 *
 * Uses temporary git repos to simulate multi-agent scenarios.
 * Does not require actual parallel processes — sequential simulation
 * with controlled worktree state is sufficient to prove invariants.
 */

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync, execSync } from 'node:child_process';
import {
  mkdtempSync, mkdirSync, writeFileSync, readFileSync,
  existsSync, rmSync, symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { safeGit, safeGitSpawn } from '../_setup/safe-git.mjs';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const REPO_ROOT = resolve(import.meta.dirname ?? '.', '..', '..');

function createTempGitRepo(name) {
  const dir = mkdtempSync(join(tmpdir(), `coa-ps-${name}-`));
  safeGit(dir, 'init', { stdio: 'pipe'});
  safeGit(dir, 'config user.email "test@test.com"', { stdio: 'pipe' });
  safeGit(dir, 'config user.name "Test"', { stdio: 'pipe' });

  // Minimal repo structure
  writeFileSync(join(dir, 'VERSION'), '0.1.0\n');
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'test', version: '0.1.0' }, null, 2) + '\n');
  writeFileSync(join(dir, 'CHANGELOG.md'), [
    '# CHANGELOG',
    '',
    '## [Unreleased]',
    '',
    '_Nothing yet._',
    '',
  ].join('\n'));

  mkdirSync(join(dir, '.claims'), { recursive: true });
  writeFileSync(join(dir, '.claims', 'config.json'), JSON.stringify({
    protectedPathMode: 'block',
    protectedPaths: ['VERSION', 'CHANGELOG.md', 'package.json'],
  }, null, 2) + '\n');

  mkdirSync(join(dir, 'modules', 'auth'), { recursive: true });
  writeFileSync(join(dir, 'modules', 'auth', 'index.mjs'), '// auth module\n');
  mkdirSync(join(dir, 'modules', 'gantt'), { recursive: true });
  writeFileSync(join(dir, 'modules', 'gantt', 'index.mjs'), '// gantt module\n');

  safeGit(dir, 'add -A', { stdio: 'pipe'});
  safeGit(dir, 'commit -m "init"', { stdio: 'pipe' });

  return dir;
}

function writeClaim(dir, claim) {
  mkdirSync(join(dir, '.claims'), { recursive: true });
  writeFileSync(
    join(dir, '.claims', `${claim.id}.json`),
    JSON.stringify(claim, null, 2) + '\n',
  );
}

function farFuture() {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
}

function pastDate() {
  return new Date(Date.now() - 60 * 60 * 1000).toISOString();
}

function runScript(cwd, scriptPath, args = []) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
  });
}

function claimCheckPath() {
  return join(REPO_ROOT, 'scripts', 'checks', 'claim-check.mjs');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('parallel-sessions: claim-check --acquire blocks second agent', () => {
  test('second acquire on same file is blocked when first agent holds modify claim', () => {
    const repo = createTempGitRepo('acquire-block');
    try {
      // Agent A acquires claim on auth module
      const agentAClaim = {
        id: 'clm-aaa111',
        agent: 'agent-a',
        slice: 'TPL-100',
        created: new Date().toISOString(),
        expires: farFuture(),
        status: 'active',
        targets: [{ path: 'modules/auth/index.mjs', action: 'modify', surface: 'domain', description: 'refactor' }],
        strategy: 'modify-in-place',
        dependsOn: [],
        notes: '',
      };
      writeClaim(repo, agentAClaim);

      // Agent B tries to acquire on same file
      const result = runScript(repo, claimCheckPath(), [
        '--acquire',
        '--agent=agent-b',
        '--slice=TPL-101',
        '--targets=modules/auth/index.mjs',
        '--action=modify',
        '--json',
      ]);

      assert.equal(result.status, 1, 'Should exit with code 1 (blocked)');
      const output = JSON.parse(result.stdout);
      assert.equal(output.ok, false);
      assert.ok(output.data.conflictCount > 0);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  test('acquire on different module succeeds', () => {
    const repo = createTempGitRepo('acquire-ok');
    try {
      const agentAClaim = {
        id: 'clm-aaa222',
        agent: 'agent-a',
        slice: 'TPL-100',
        created: new Date().toISOString(),
        expires: farFuture(),
        status: 'active',
        targets: [{ path: 'modules/auth/index.mjs', action: 'modify', surface: 'domain', description: 'refactor' }],
        strategy: 'modify-in-place',
        dependsOn: [],
        notes: '',
      };
      writeClaim(repo, agentAClaim);

      // Agent B acquires on gantt (different module) — should succeed
      const result = runScript(repo, claimCheckPath(), [
        '--acquire',
        '--agent=agent-b',
        '--slice=TPL-102',
        '--targets=modules/gantt/index.mjs',
        '--action=modify',
        '--json',
      ]);

      assert.equal(result.status, 0, 'Should exit with code 0 (allowed)');
      const output = JSON.parse(result.stdout);
      assert.equal(output.ok, true);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });
});

describe('parallel-sessions: stale claims are auto-expired', () => {
  test('auto-expire clears stale claim, allowing next agent to proceed', () => {
    const repo = createTempGitRepo('stale-expire');
    try {
      // Agent A crashed — left a stale claim (already expired)
      const staleClaim = {
        id: 'clm-stale1',
        agent: 'crashed-agent',
        slice: 'TPL-200',
        created: pastDate(),
        expires: pastDate(), // Already expired
        status: 'active',
        targets: [{ path: 'modules/auth/index.mjs', action: 'modify', surface: 'domain', description: 'work' }],
        strategy: 'modify-in-place',
        dependsOn: [],
        notes: '',
      };
      writeClaim(repo, staleClaim);

      // Run auto-expire
      const expire = runScript(repo, claimCheckPath(), ['--auto-expire', '--json']);
      assert.equal(expire.status, 0);
      const expireOutput = JSON.parse(expire.stdout);
      assert.equal(expireOutput.data.expiredCount, 1);

      // Now Agent B can acquire
      const acquire = runScript(repo, claimCheckPath(), [
        '--acquire',
        '--agent=agent-b',
        '--slice=TPL-201',
        '--targets=modules/auth/index.mjs',
        '--action=modify',
        '--json',
      ]);
      assert.equal(acquire.status, 0, 'Agent B should be able to acquire after stale claim expired');
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });
});

describe('parallel-sessions: VERSION race protection', () => {
  test('release-discipline-check rejects same version as HEAD', () => {
    const repo = createTempGitRepo('version-race');
    try {
      // VERSION is 0.1.0 at HEAD and also in working tree (no bump)
      const result = runScript(repo, join(REPO_ROOT, 'scripts', 'checks', 'release-discipline-check.mjs'));
      // Should fail because VERSION not bumped
      assert.equal(result.status, 1, 'Should reject un-bumped VERSION');
      assert.ok(result.stderr.includes('not bumped'), `Expected "not bumped" in: ${result.stderr}`);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  test('release-discipline-check rejects version jump > 1', () => {
    const repo = createTempGitRepo('version-jump');
    try {
      // Jump VERSION from 0.1.0 to 0.1.5 (should be 0.1.1)
      writeFileSync(join(repo, 'VERSION'), '0.1.5\n');
      writeFileSync(join(repo, 'CHANGELOG.md'), [
        '# CHANGELOG',
        '',
        '## [Unreleased]',
        '',
        '_Nothing yet._',
        '',
        '## [0.1.5] — 2026-04-27',
        '',
        '- Something',
        '',
      ].join('\n'));

      const result = runScript(repo, join(REPO_ROOT, 'scripts', 'checks', 'release-discipline-check.mjs'));
      assert.equal(result.status, 1, 'Should reject VERSION jump > 1');
      assert.ok(result.stderr.includes('jump') || result.stderr.includes('Expected'), `Expected jump error in: ${result.stderr}`);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });
});

describe('parallel-sessions: coa-worktree lifecycle', () => {
  test('generateSessionName produces unique names', async () => {
    const { generateSessionName } = await import('../../scripts/coa-worktree.mjs');
    const names = new Set(Array.from({ length: 100 }, () => generateSessionName()));
    assert.equal(names.size, 100, 'All 100 generated names should be unique');
  });
});

describe('parallel-sessions: coa-merge changelog validation', () => {
  test('changelogHasContent rejects empty Unreleased', async () => {
    const { changelogHasContent } = await import('../../scripts/coa-merge.mjs');
    const empty = '## [Unreleased]\n\n_Nothing yet._\n\n## [0.1.0]\n';
    assert.ok(!changelogHasContent(empty), 'Should reject empty Unreleased');
  });

  test('changelogHasContent accepts real content', async () => {
    const { changelogHasContent } = await import('../../scripts/coa-merge.mjs');
    const real = '## [Unreleased]\n\n### Added\n\n- New feature\n\n## [0.1.0]\n';
    assert.ok(changelogHasContent(real), 'Should accept real content');
  });
});

describe('parallel-sessions: dep-graph regenerates on demand (TPL-220)', () => {
  // Reproduces the failure mode that motivated TPL-220:
  //   1. Session A commits and updates docs/_generated/dependency-graph.json.
  //   2. Session B's working tree still holds the old graph.
  //   3. Pre-commit Phase 6 runs `dependency-graph.mjs --check` and fails on
  //      stale local state, blocking Session B's commit until manual regen.
  //
  // The fix moves regeneration into Phase 5 (run before Phase 6 validates).
  // This test isolates the underlying invariant: running the script with no
  // flags brings a stale file back to "fresh" state so a follow-up --check
  // passes. Full pre-commit-hook integration is verified manually — see the
  // recipe in docs/backlog/inter-agent-coordination.md TPL-220 notes.
  function setupDepGraphRepo(name) {
    const dir = mkdtempSync(join(tmpdir(), `coa-depg-${name}-`));
    mkdirSync(join(dir, 'modules', 'foo'), { recursive: true });
    writeFileSync(
      join(dir, 'modules', 'foo', 'manifest.json'),
      JSON.stringify({ name: 'foo', dependencies: { modules: [] } }, null, 2) + '\n',
    );
    return dir;
  }

  function runDepGraph(cwd, args = []) {
    return spawnSync(
      process.execPath,
      [join(REPO_ROOT, 'scripts', 'checks', 'dependency-graph.mjs'), ...args],
      { cwd, encoding: 'utf8', stdio: 'pipe' },
    );
  }

  test('plain run regenerates a stale graph so --check passes', () => {
    const repo = setupDepGraphRepo('regen');
    try {
      // 1. Bootstrap a fresh graph.
      const initial = runDepGraph(repo);
      assert.equal(initial.status, 0, `initial generation failed: ${initial.stderr}`);

      const graphPath = join(repo, 'docs', '_generated', 'dependency-graph.json');
      assert.ok(existsSync(graphPath), 'graph artefact should exist after first run');

      // 2. Mutate the artefact to simulate a sibling worktree's stale state.
      const fresh = JSON.parse(readFileSync(graphPath, 'utf8'));
      const stale = { ...fresh, moduleCount: fresh.moduleCount + 99 };
      writeFileSync(graphPath, JSON.stringify(stale, null, 2) + '\n');

      // 3. --check must fail on stale content.
      const staleCheck = runDepGraph(repo, ['--check']);
      assert.equal(staleCheck.status, 1, '--check should reject stale graph');

      // 4. Plain run regenerates (the Phase 5 behaviour TPL-220 relies on).
      const regen = runDepGraph(repo);
      assert.equal(regen.status, 0, `regen failed: ${regen.stderr}`);

      // 5. --check passes against the freshly regenerated artefact.
      const freshCheck = runDepGraph(repo, ['--check']);
      assert.equal(freshCheck.status, 0, `--check should accept fresh graph: ${freshCheck.stderr}`);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });
});

describe('parallel-sessions: header-fix --since=HEAD narrow fallback (TPL-231)', () => {
  // Reproduces the disk-wear failure mode the pre-commit Phase 5 fallback
  // change addresses: when SCOPE auto-detect produces empty (cross-cutting
  // commit with no `modules/*` paths), the previous `header-fix --changed`
  // invocation fell back to `collectRepoFiles()` and re-stamped ~1968 files
  // on every commit. The new `--since=HEAD` selector has NO silent fallback
  // — empty diff means zero work — so a typical cross-cutting commit only
  // walks the small set of files that actually differ from HEAD.

  function setupHeaderFixRepo(name) {
    const dir = mkdtempSync(join(tmpdir(), `coa-hf-narrow-${name}-`));
    safeGit(dir, 'init --quiet', { stdio: 'pipe'});
    safeGit(dir, 'config user.email "test@test.com"', { stdio: 'pipe' });
    safeGit(dir, 'config user.name "Test"', { stdio: 'pipe' });
    writeFileSync(join(dir, 'VERSION'), '0.1.0\n');
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'tmp', version: '0.1.0' }, null, 2) + '\n',
    );
    mkdirSync(join(dir, 'scripts'), { recursive: true });
    // Seed 12 files with slim headers stamped at the same baseline version.
    // The number stands in for the broader repo's ~1968-file population.
    for (let i = 0; i < 12; i++) {
      writeFileSync(join(dir, 'scripts', `f${i}.mjs`), [
        '/* @HEADER',
        ' * @version 0.1.0 | 2026-01-01',
        ` * @purpose f${i}.mjs fixture for TPL-231 narrow fallback test.`,
        ` * @sidecar f${i}.mjs.header.md`,
        ' * @layer tooling | @hex _none_ | @ctx _none_',
        ' * @public false',
        ' * @edit careful',
        ' */',
        '',
        `export const value = ${i};`,
        '',
      ].join('\n'));
    }
    safeGit(dir, 'add -A', { stdio: 'pipe'});
    safeGit(dir, 'commit -m "init" --quiet', { stdio: 'pipe' });
    return dir;
  }

  test('cross-cutting commit only walks files differing from HEAD, not the whole repo', () => {
    const repo = setupHeaderFixRepo('cross-cutting');
    try {
      // Simulate a cross-cutting commit: stage exactly one file (no module
      // SCOPE auto-detect, mirroring the pre-fix failure shape).
      writeFileSync(join(repo, 'scripts', 'f0.mjs'), [
        '/* @HEADER',
        ' * @version 0.1.0 | 2026-01-01',
        ' * @purpose f0.mjs fixture — edited.',
        ' * @sidecar f0.mjs.header.md',
        ' * @layer tooling | @hex _none_ | @ctx _none_',
        ' * @public false',
        ' * @edit careful',
        ' */',
        '',
        'export const value = 99;',
        '',
      ].join('\n'));
      safeGit(repo, 'add scripts/f0.mjs', { stdio: 'pipe'});

      const result = spawnSync(
        process.execPath,
        [join(REPO_ROOT, 'scripts', 'checks', 'header-fix.mjs'), '--since=HEAD', '--json'],
        { cwd: repo, encoding: 'utf8', stdio: 'pipe' },
      );
      assert.equal(result.status, 0, `header-fix failed: ${result.stderr}`);
      const json = JSON.parse(result.stdout);
      assert.equal(json.ok, true);
      assert.equal(json.data.mode, 'since:HEAD');

      // Load-bearing assertion: the eleven untouched fixtures (f1..f11) MUST
      // remain byte-identical to their committed copies, regardless of any
      // header-stamp drift between the harness and the temp repo.
      for (let i = 1; i < 12; i++) {
        const onDisk = readFileSync(join(repo, 'scripts', `f${i}.mjs`), 'utf8');
        const atHead = safeGit(repo, `show HEAD:scripts/f${i}.mjs`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'],});
        assert.equal(onDisk, atHead, `scripts/f${i}.mjs must not be touched`);
      }

      // And `git status` post-run must show ≤ 5 modified entries (well below
      // the ~1968 the pre-fix invocation churned). The bound is generous
      // because header-fix may legitimately re-stamp the staged file plus
      // sidecars; the point is that it is NOT proportional to the repo size.
      const status = safeGit(repo, 'status --porcelain', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'],});
      const modifiedCount = status.split('\n').filter((l) => l.trim().length > 0).length;
      assert.ok(
        modifiedCount <= 5,
        `git status should show ≤ 5 modified entries after header-fix; saw ${modifiedCount}: ${status}`,
      );
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });
});

describe('parallel-sessions: TPL-233 lazy-stamp does not churn unrelated files', () => {
  // Reproduces the disk-wear failure mode the post-commit / lazy-stamp split
  // closes: a small commit must not modify @version on the dozens-to-thousands
  // of header-bearing files that did not change in the commit. Pre-fix (and
  // even after TPL-231) Phase 5 still re-stamped the @version of every file
  // differing from HEAD, so a single staged file plus a VERSION bump in the
  // working tree could pull every other slim-header file into the stamp set.
  // After TPL-233 lazy-stamp, only files whose content actually changed get
  // their @version touched — and that work happens in post-commit, not in
  // pre-commit Phase 5.

  function setupLazyStampRepo(name) {
    const dir = mkdtempSync(join(tmpdir(), `coa-tpl233-${name}-`));
    safeGit(dir, 'init --quiet', { stdio: 'pipe'});
    safeGit(dir, 'config user.email "test@test.com"', { stdio: 'pipe' });
    safeGit(dir, 'config user.name "Test"', { stdio: 'pipe' });
    writeFileSync(join(dir, 'VERSION'), '0.1.0\n');
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'tmp', version: '0.1.0' }, null, 2) + '\n',
    );
    mkdirSync(join(dir, 'scripts'), { recursive: true });
    for (let i = 0; i < 12; i++) {
      writeFileSync(join(dir, 'scripts', `f${i}.mjs`), [
        '/* @HEADER',
        ' * @version 0.1.0 | 2026-01-01',
        ` * @purpose f${i}.mjs fixture for TPL-233 lazy-stamp test.`,
        ` * @sidecar f${i}.mjs.header.md`,
        ' * @layer tooling | @hex _none_ | @ctx _none_',
        ' * @public false',
        ' * @edit careful',
        ' */',
        '',
        `export const value = ${i};`,
        '',
      ].join('\n'));
    }
    safeGit(dir, 'add -A', { stdio: 'pipe'});
    safeGit(dir, 'commit -m "init" --quiet', { stdio: 'pipe' });
    return dir;
  }

  test('lazy-stamp leaves unrelated files\' @version untouched', () => {
    const repo = setupLazyStampRepo('lazy-noop');
    try {
      // Bump VERSION in the working tree (simulating a slice's release ceremony).
      writeFileSync(join(repo, 'VERSION'), '0.2.0\n');
      // Edit exactly one fixture's BODY (no header change).
      writeFileSync(join(repo, 'scripts', 'f0.mjs'), [
        '/* @HEADER',
        ' * @version 0.1.0 | 2026-01-01',
        ' * @purpose f0.mjs fixture for TPL-233 lazy-stamp test.',
        ' * @sidecar f0.mjs.header.md',
        ' * @layer tooling | @hex _none_ | @ctx _none_',
        ' * @public false',
        ' * @edit careful',
        ' */',
        '',
        'export const value = 999;',
        '',
      ].join('\n'));
      safeGit(repo, 'add scripts/f0.mjs VERSION', { stdio: 'pipe'});

      const result = spawnSync(
        process.execPath,
        [
          join(REPO_ROOT, 'scripts', 'checks', 'header-fix.mjs'),
          '--since=HEAD', '--lazy-stamp', '--json',
        ],
        { cwd: repo, encoding: 'utf8', stdio: 'pipe' },
      );
      assert.equal(result.status, 0, `header-fix failed: ${result.stderr}`);
      const json = JSON.parse(result.stdout);
      assert.equal(json.data.lazyStamp, true);

      // Even f0 — the file we edited — should still carry its OLD @version 0.1.0.
      // The post-commit hook (not Phase 5) is what stamps current VERSION onto
      // files that actually changed.
      const f0 = readFileSync(join(repo, 'scripts', 'f0.mjs'), 'utf8');
      assert.match(f0, /@version 0\.1\.0/, 'lazy-stamp must preserve f0.mjs @version even though its body changed');
      assert.doesNotMatch(f0, /@version 0\.2\.0/, 'lazy-stamp must NOT bump f0 to current VERSION (post-commit owns that)');

      // f1..f11 are completely untouched.
      for (let i = 1; i < 12; i++) {
        const onDisk = readFileSync(join(repo, 'scripts', `f${i}.mjs`), 'utf8');
        const atHead = safeGit(repo, `show HEAD:scripts/f${i}.mjs`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'],});
        assert.equal(onDisk, atHead, `scripts/f${i}.mjs must remain byte-identical to HEAD`);
      }
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  test('post-commit hook trail: --files-from=- on diff-tree set stamps just those files', () => {
    // Simulates what .githooks/post-commit does: feed `git diff-tree
    // --no-commit-id --name-only -r HEAD` into header-fix --files-from=- and
    // trust the eager default to stamp current VERSION onto exactly those files.
    const repo = setupLazyStampRepo('post-commit-trail');
    try {
      // Land a real commit that bumps VERSION + edits f0.mjs body.
      writeFileSync(join(repo, 'VERSION'), '0.5.0\n');
      writeFileSync(join(repo, 'scripts', 'f0.mjs'), [
        '/* @HEADER',
        ' * @version 0.1.0 | 2026-01-01',
        ' * @purpose f0.mjs fixture for TPL-233 lazy-stamp test.',
        ' * @sidecar f0.mjs.header.md',
        ' * @layer tooling | @hex _none_ | @ctx _none_',
        ' * @public false',
        ' * @edit careful',
        ' */',
        '',
        'export const value = 4242;',
        '',
      ].join('\n'));
      safeGit(repo, 'add VERSION scripts/f0.mjs', { stdio: 'pipe'});
      safeGit(repo, 'commit -m "edit f0" --quiet', { stdio: 'pipe' });

      // Now run the post-commit equivalent: diff-tree → header-fix --files-from=-.
      const diffTree = safeGit(
        repo,
        'diff-tree --no-commit-id --name-only -r HEAD',
        { encoding: 'utf8' },
      );
      const result = spawnSync(
        process.execPath,
        [
          join(REPO_ROOT, 'scripts', 'checks', 'header-fix.mjs'),
          '--files-from=-', '--json',
        ],
        { cwd: repo, encoding: 'utf8', stdio: 'pipe', input: diffTree },
      );
      assert.equal(result.status, 0, `header-fix failed: ${result.stderr}`);

      // f0 is in the diff-tree set → eager stamp bumps @version to 0.5.0.
      const f0 = readFileSync(join(repo, 'scripts', 'f0.mjs'), 'utf8');
      assert.match(f0, /@version 0\.5\.0/, 'post-commit hook should stamp 0.5.0 onto f0 (was in diff-tree)');

      // f1..f11 are NOT in the diff-tree set → byte-identical to HEAD.
      for (let i = 1; i < 12; i++) {
        const onDisk = readFileSync(join(repo, 'scripts', `f${i}.mjs`), 'utf8');
        const atHead = safeGit(repo, `show HEAD:scripts/f${i}.mjs`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'],});
        assert.equal(onDisk, atHead, `scripts/f${i}.mjs must remain at its prior @version (not in HEAD diff-tree)`);
      }
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  test('header-backfill on multi-commit history resolves last-content-change VERSION per file', () => {
    const repo = mkdtempSync(join(tmpdir(), 'coa-tpl233-backfill-int-'));
    try {
      safeGit(repo, 'init --quiet', { stdio: 'pipe'});
      safeGit(repo, 'config user.email "test@test.com"', { stdio: 'pipe' });
      safeGit(repo, 'config user.name "Test"', { stdio: 'pipe' });
      writeFileSync(join(repo, 'VERSION'), '0.1.0\n');
      writeFileSync(
        join(repo, 'package.json'),
        JSON.stringify({ name: 'tmp', version: '0.1.0' }, null, 2) + '\n',
      );
      mkdirSync(join(repo, 'scripts'), { recursive: true });
      const slim = (n, v, body) => [
        '/* @HEADER',
        ` * @version ${v} | 2026-01-01`,
        ` * @purpose ${n}.mjs.`,
        ` * @sidecar ${n}.mjs.header.md`,
        ' * @layer tooling | @hex _none_ | @ctx _none_',
        ' * @public false',
        ' * @edit careful',
        ' */',
        '',
        body,
        '',
      ].join('\n');

      // c1: 0.1.0 — create both. c2: 0.2.0 — edit a only. c3: 0.5.0 — leave both alone, bump VERSION via package.json.
      writeFileSync(join(repo, 'scripts', 'a.mjs'), slim('a', '0.1.0', 'export const v = 1;'));
      writeFileSync(join(repo, 'scripts', 'b.mjs'), slim('b', '0.1.0', 'export const v = 1;'));
      safeGit(repo, 'add -A', { stdio: 'pipe'});
      safeGit(repo, 'commit -m "c1" --quiet', { stdio: 'pipe' });

      writeFileSync(join(repo, 'VERSION'), '0.2.0\n');
      writeFileSync(join(repo, 'scripts', 'a.mjs'), slim('a', '0.1.0', 'export const v = 2;'));
      safeGit(repo, 'add -A', { stdio: 'pipe'});
      safeGit(repo, 'commit -m "c2" --quiet', { stdio: 'pipe' });

      writeFileSync(join(repo, 'VERSION'), '0.5.0\n');
      safeGit(repo, 'add -A', { stdio: 'pipe'});
      safeGit(repo, 'commit -m "c3 (no script changes)" --quiet', { stdio: 'pipe' });

      const result = spawnSync(
        process.execPath,
        [join(REPO_ROOT, 'scripts', 'checks', 'header-backfill.mjs'), '--json'],
        { cwd: repo, encoding: 'utf8', stdio: 'pipe' },
      );
      assert.equal(result.status, 0, `header-backfill failed: ${result.stderr}`);

      const a = readFileSync(join(repo, 'scripts', 'a.mjs'), 'utf8');
      assert.match(a, /@version 0\.2\.0/, 'a last changed at 0.2.0 (commit c2)');
      const b = readFileSync(join(repo, 'scripts', 'b.mjs'), 'utf8');
      assert.match(b, /@version 0\.1\.0/, 'b last changed at 0.1.0 (commit c1) — c3 must NOT pull it forward');
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });
});

describe('parallel-sessions: protected paths enforcement', () => {
  test('enforce blocks staging VERSION without claim', () => {
    const repo = createTempGitRepo('protected-path');
    try {
      // Modify VERSION without a claim
      writeFileSync(join(repo, 'VERSION'), '0.1.1\n');
      safeGit(repo, 'add VERSION', { stdio: 'pipe'});

      // Run enforce --staged with config that blocks protected paths
      const result = runScript(repo, claimCheckPath(), ['--enforce', '--staged', '--json']);

      // Should block because VERSION is protected and no claim exists
      assert.equal(result.status, 1, 'Should block VERSION without claim');
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// TPL-222 — atomicity + auto-extend integration
// ---------------------------------------------------------------------------

function coaMergePath() {
  return join(REPO_ROOT, 'scripts', 'coa-merge.mjs');
}

describe('parallel-sessions: TPL-222 J2 — pre-flight detect-and-resume', () => {
  test('coa-merge refuses to start when working tree is in half-baked state', () => {
    const repo = createTempGitRepo('half-baked-preflight');
    try {
      // Simulate the Entry-010 residue: VERSION is one ahead of HEAD,
      // CHANGELOG already has [0.1.1] section, [Unreleased] is empty,
      // but no commit exists at 0.1.1.
      writeFileSync(join(repo, 'VERSION'), '0.1.1\n');
      writeFileSync(join(repo, 'CHANGELOG.md'), [
        '# CHANGELOG',
        '',
        '## [Unreleased]',
        '',
        '_Nothing yet._',
        '',
        '## [0.1.1] — 2026-04-27 12:00:00 UTC+0',
        '',
        '- previous run never committed',
        '',
      ].join('\n'));
      // Stage some user file so step 1 doesn't bail before step 0 fires.
      writeFileSync(join(repo, 'modules', 'auth', 'index.mjs'), '// edited\n');
      safeGit(repo, 'add modules/auth/index.mjs', { stdio: 'pipe'});

      const result = runScript(repo, coaMergePath(), [
        '--message=fix(auth): noop',
        '--no-snapshot',
        '--json',
      ]);

      assert.equal(result.status, 1, 'pre-flight should refuse to start');
      const out = result.stdout.trim();
      // First line of stdout should be the JSON failure record
      const firstJsonLine = out.split('\n').find((l) => l.startsWith('{'));
      assert.ok(firstJsonLine, `expected JSON line in stdout, got:\n${out}`);
      const parsed = JSON.parse(firstJsonLine);
      assert.equal(parsed.ok, false);
      assert.equal(parsed.failedStep, 0, 'failure should be at step 0 (pre-flight)');
      assert.match(parsed.error, /Detected partial state/);
      assert.match(parsed.error, /HEAD VERSION = 0\.1\.0/);
      assert.match(parsed.error, /Working tree VERSION = 0\.1\.1/);
      assert.match(parsed.error, /git restore VERSION/);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  test('coa-merge proceeds normally when working tree matches HEAD', () => {
    const repo = createTempGitRepo('half-baked-normal');
    try {
      // VERSION matches HEAD; pre-flight should pass to step 1.
      // We stop at step 1 (no staged files) — that's fine. The point of
      // this test is that step 0 does NOT trigger.
      const result = runScript(repo, coaMergePath(), [
        '--message=fix(auth): noop',
        '--no-snapshot',
        '--json',
      ]);
      assert.equal(result.status, 1, 'will fail at step 1 (no staged files)');
      const firstJsonLine = result.stdout
        .split('\n')
        .find((l) => l.startsWith('{'));
      const parsed = JSON.parse(firstJsonLine);
      assert.notEqual(parsed.failedStep, 0, 'pre-flight should NOT trigger when state is normal');
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });
});

describe('parallel-sessions: TPL-222 J5 — claim-check --extend before enforce', () => {
  test('--extend appends new targets to caller\'s active claim (same-agent)', () => {
    const repo = createTempGitRepo('extend-same-agent');
    try {
      const claim = {
        id: 'clm-extend1',
        agent: 'tpl-222-claude',
        slice: 'TPL-222',
        created: new Date().toISOString(),
        expires: farFuture(),
        status: 'active',
        targets: [
          {
            path: 'modules/auth/index.mjs',
            action: 'modify',
            surface: 'domain',
            description: 'work',
          },
        ],
        strategy: 'modify-in-place',
        dependsOn: [],
        notes: '',
      };
      writeClaim(repo, claim);

      const result = runScript(repo, claimCheckPath(), [
        '--extend',
        '--id=clm-extend1',
        '--agent=tpl-222-claude',
        '--add-targets=VERSION,CHANGELOG.md,package.json',
        '--action=modify',
        '--json',
      ]);
      assert.equal(result.status, 0);
      const out = JSON.parse(result.stdout);
      assert.equal(out.ok, true);
      assert.equal(out.data.addedCount, 3);
      // Verify the claim file was rewritten with the new targets.
      const updated = JSON.parse(
        readFileSync(join(repo, '.claims', 'clm-extend1.json'), 'utf8'),
      );
      const paths = updated.targets.map((t) => t.path);
      assert.ok(paths.includes('modules/auth/index.mjs'));
      assert.ok(paths.includes('VERSION'));
      assert.ok(paths.includes('CHANGELOG.md'));
      assert.ok(paths.includes('package.json'));
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  test('--extend rejects cross-agent caller', () => {
    const repo = createTempGitRepo('extend-cross-agent');
    try {
      const claim = {
        id: 'clm-extend2',
        agent: 'tpl-222-claude',
        slice: 'TPL-222',
        created: new Date().toISOString(),
        expires: farFuture(),
        status: 'active',
        targets: [
          { path: 'modules/auth/index.mjs', action: 'modify', surface: 'domain' },
        ],
        strategy: 'modify-in-place',
        dependsOn: [],
        notes: '',
      };
      writeClaim(repo, claim);
      const result = runScript(repo, claimCheckPath(), [
        '--extend',
        '--id=clm-extend2',
        '--agent=different-agent',
        '--add-targets=VERSION',
        '--json',
      ]);
      assert.equal(result.status, 1);
      const out = JSON.parse(result.stdout);
      assert.equal(out.ok, false);
      assert.ok(out.errors.some((e) => /cross-agent extend not allowed/.test(e)));
      // Claim file must NOT have been mutated
      const onDisk = JSON.parse(
        readFileSync(join(repo, '.claims', 'clm-extend2.json'), 'utf8'),
      );
      assert.equal(onDisk.targets.length, 1);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  test('--extend writes audit-log event with addedTargets', () => {
    const repo = createTempGitRepo('extend-audit');
    try {
      const claim = {
        id: 'clm-extend3',
        agent: 'tpl-222-claude',
        slice: 'TPL-222',
        created: new Date().toISOString(),
        expires: farFuture(),
        status: 'active',
        targets: [
          { path: 'modules/auth/index.mjs', action: 'modify', surface: 'domain' },
        ],
        strategy: 'modify-in-place',
        dependsOn: [],
        notes: '',
      };
      writeClaim(repo, claim);
      const result = runScript(repo, claimCheckPath(), [
        '--extend',
        '--id=clm-extend3',
        '--agent=tpl-222-claude',
        '--add-targets=VERSION,CHANGELOG.md',
        '--json',
      ]);
      assert.equal(result.status, 0);

      const auditPath = join(repo, '.claims', 'audit.log');
      assert.ok(existsSync(auditPath), 'audit.log should be written');
      const lines = readFileSync(auditPath, 'utf8')
        .split('\n')
        .filter((l) => l.trim());
      const lastEvent = JSON.parse(lines[lines.length - 1]);
      assert.equal(lastEvent.event, 'extend');
      assert.equal(lastEvent.claimId, 'clm-extend3');
      assert.equal(lastEvent.callerAgent, 'tpl-222-claude');
      assert.deepStrictEqual(lastEvent.addedTargets.sort(), ['CHANGELOG.md', 'VERSION']);
      assert.equal(lastEvent.crossAgent, false);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  test('coa-merge auto-extends caller\'s claim before pre-commit Phase 3 enforces', () => {
    const repo = createTempGitRepo('auto-extend-flow');
    try {
      // Write a claim that covers ONLY the user file (not VERSION/CHANGELOG/etc.)
      const claim = {
        id: 'clm-flow',
        agent: 'tpl-222-claude',
        slice: 'TPL-222',
        created: new Date().toISOString(),
        expires: farFuture(),
        status: 'active',
        targets: [
          {
            path: 'modules/auth/index.mjs',
            action: 'modify',
            surface: 'domain',
            description: 'flow',
          },
        ],
        strategy: 'modify-in-place',
        dependsOn: [],
        notes: '',
      };
      writeClaim(repo, claim);

      // Stage a user-file edit; add a CHANGELOG entry so step 5 passes.
      writeFileSync(join(repo, 'modules', 'auth', 'index.mjs'), '// edited\n');
      writeFileSync(join(repo, 'CHANGELOG.md'), [
        '# CHANGELOG',
        '',
        '## [Unreleased]',
        '',
        '- something real for the auto-extend flow test',
        '',
      ].join('\n'));
      safeGit(repo, 'add modules/auth/index.mjs', { stdio: 'pipe'});

      // Run coa-merge in dry-run so it doesn't try to commit (the temp
      // repo lacks the full pre-commit infrastructure). dry-run still
      // exercises step 2.5 in its log path, but skips the actual extend.
      // To prove auto-extend resolution works end-to-end against the real
      // CLI, we run coa-merge to step 2.5 *non* dry-run and expect it to
      // succeed; subsequent steps may fail, but the claim should be
      // extended.
      const result = runScript(repo, coaMergePath(), [
        '--message=feat(auth): flow test',
        '--no-snapshot',
      ]);
      // We don't care about success here — only that the claim file was
      // rewritten with the new ceremony+regen paths before any later
      // failure.
      const updated = JSON.parse(
        readFileSync(join(repo, '.claims', 'clm-flow.json'), 'utf8'),
      );
      const paths = new Set(updated.targets.map((t) => t.path));
      assert.ok(paths.has('modules/auth/index.mjs'), 'original target preserved');
      assert.ok(paths.has('VERSION'), 'VERSION auto-added by step 2.5');
      assert.ok(paths.has('package.json'), 'package.json auto-added by step 2.5');
      assert.ok(paths.has('CHANGELOG.md'), 'CHANGELOG.md auto-added by step 2.5');
      // Regen paths added too — at least one to prove the resolver wired up
      assert.ok(paths.has('AGENTS.md'));
      // Capture exit code so failures get reported but don't fail this test
      assert.ok(result.status !== null, `coa-merge ran: status=${result.status}`);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  test('coa-merge fails at step 2.5 with helpful message when no claim covers staged files', () => {
    const repo = createTempGitRepo('no-claim');
    try {
      writeFileSync(join(repo, 'modules', 'auth', 'index.mjs'), '// edited\n');
      safeGit(repo, 'add modules/auth/index.mjs', { stdio: 'pipe'});

      const result = runScript(repo, coaMergePath(), [
        '--message=feat(auth): no claim',
        '--no-snapshot',
        '--json',
      ]);
      assert.equal(result.status, 1);
      const firstJsonLine = result.stdout
        .split('\n')
        .find((l) => l.startsWith('{'));
      const parsed = JSON.parse(firstJsonLine);
      assert.equal(parsed.failedStep, 2.5);
      assert.match(parsed.error, /No active claim/);
      assert.match(parsed.error, /claim-check\.mjs --acquire/);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });
});
