/* @HEADER
 * @version 0.8.9 | 2026-05-11
 * @purpose Unit proofs for header-fix.mjs disk-wear discipline — narrow `--since=<ref>` selector, content-idempotent writes (TPL-231/TPL-232), and pre-commit self-rewrite guard (TPL-331).
 * @sidecar header-fix.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync, mkdirSync, writeFileSync, readFileSync, statSync, existsSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { changedFilesSinceRef } from '../../scripts/lib/header.mjs';
import { ensureWriteIfChanged } from '../../scripts/lib/fs-helpers.mjs';
import { safeGitSpawn } from '../_setup/safe-git.mjs';

const REPO_ROOT = resolve(import.meta.dirname ?? '.', '..', '..');
const HEADER_FIX = join(REPO_ROOT, 'scripts', 'checks', 'header-fix.mjs');

// ---------------------------------------------------------------------------
// TPL-231 — `--since=<ref>` selector picks the correct file subset and does
// NOT silently fall back to the entire repository when the diff is empty.
// ---------------------------------------------------------------------------

describe('changedFilesSinceRef() — TPL-231', () => {
  test('returns meaningful files reported by git diff, sorted', async () => {
    const runGit = (args) => {
      assert.deepEqual(args, ['diff', '--name-only', '--diff-filter=AMR', 'HEAD']);
      return ['scripts/checks/zeta.mjs', 'scripts/checks/alpha.mjs'];
    };
    const result = await changedFilesSinceRef('HEAD', { runGit });
    assert.deepEqual(result, ['scripts/checks/alpha.mjs', 'scripts/checks/zeta.mjs']);
  });

  test('filters out non-meaningful files (pnpm-lock.yaml, dist/, _generated/)', async () => {
    const runGit = () => [
      'scripts/checks/keep.mjs',
      'pnpm-lock.yaml',
      'modules/foo/dist/bundle.js',
      'docs/_generated/index.md',
    ];
    const result = await changedFilesSinceRef('HEAD', { runGit });
    assert.deepEqual(result, ['scripts/checks/keep.mjs']);
  });

  test('returns empty array when git diff is empty — no silent fallback to whole repo', async () => {
    const runGit = () => [];
    const result = await changedFilesSinceRef('HEAD', { runGit });
    assert.deepEqual(result, []);
  });

  test('returns empty array when every diff entry is non-meaningful — no fallback', async () => {
    const runGit = () => ['pnpm-lock.yaml', 'docs/_generated/x.md'];
    const result = await changedFilesSinceRef('HEAD', { runGit });
    assert.deepEqual(result, []);
  });

  test('rejects empty/missing ref so the script cannot diff against ""', async () => {
    await assert.rejects(() => changedFilesSinceRef('', { runGit: () => [] }));
    await assert.rejects(() => changedFilesSinceRef(undefined, { runGit: () => [] }));
    await assert.rejects(() => changedFilesSinceRef(null, { runGit: () => [] }));
  });

  test('passes the ref through verbatim (works for branches, SHAs, HEAD~1)', async () => {
    let captured = null;
    const runGit = (args) => {
      captured = args;
      return [];
    };
    await changedFilesSinceRef('origin/main', { runGit });
    assert.deepEqual(captured, ['diff', '--name-only', '--diff-filter=AMR', 'origin/main']);
  });
});

// ---------------------------------------------------------------------------
// TPL-232 — Content-idempotent writes via ensureWriteIfChanged. Header-fix's
// re-stamp pipeline funnels every write through this helper, so proving
// the helper guards content equality is the load-bearing assertion.
// ---------------------------------------------------------------------------

describe('ensureWriteIfChanged() — TPL-232', () => {
  // ensureWriteIfChanged resolves paths relative to the helper's ROOT
  // (process.cwd() captured at module load). Tests use a unique repo-relative
  // scratch dir so the helper sees real files via its real path resolver, and
  // every test cleans up its own scratch on the way out.
  function scratchDir(label) {
    const rel = join('tests', '.scratch', `header-fix-${label}-${process.pid}-${Date.now()}`);
    const abs = join(REPO_ROOT, rel);
    mkdirSync(abs, { recursive: true });
    return { rel, abs };
  }

  test('skips the write when on-disk content matches the proposed content', async () => {
    const { rel, abs } = scratchDir('idem-skip');
    try {
      const relFile = join(rel, 'sample.txt');
      const absFile = join(abs, 'sample.txt');
      writeFileSync(absFile, 'identical bytes\n', 'utf8');
      const beforeMtime = statSync(absFile).mtimeMs;

      const wrote = await ensureWriteIfChanged(relFile, 'identical bytes\n');
      assert.equal(wrote, false, 'should report skipped write');

      // mtime must not advance — no write happened.
      const afterMtime = statSync(absFile).mtimeMs;
      assert.equal(afterMtime, beforeMtime, 'mtime must not advance when content is identical');
    } finally {
      rmSync(abs, { recursive: true, force: true });
    }
  });

  test('writes when on-disk content differs from the proposed content', async () => {
    const { rel, abs } = scratchDir('idem-write');
    try {
      const relFile = join(rel, 'sample.txt');
      const absFile = join(abs, 'sample.txt');
      writeFileSync(absFile, 'old\n', 'utf8');

      const wrote = await ensureWriteIfChanged(relFile, 'new\n');
      assert.equal(wrote, true, 'should report performed write');
      assert.equal(readFileSync(absFile, 'utf8'), 'new\n');
    } finally {
      rmSync(abs, { recursive: true, force: true });
    }
  });

  test('two consecutive identical-content runs perform exactly one disk write', async () => {
    const { rel, abs } = scratchDir('idem-twice');
    try {
      const relFile = join(rel, 'sample.txt');
      const absFile = join(abs, 'sample.txt');

      const first = await ensureWriteIfChanged(relFile, 'final\n');
      assert.equal(first, true, 'first run must write (file did not exist)');
      const second = await ensureWriteIfChanged(relFile, 'final\n');
      assert.equal(second, false, 'second run must skip (content already on disk)');

      assert.ok(existsSync(absFile));
    } finally {
      rmSync(abs, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// End-to-end CLI proof — `header-fix.mjs --since=HEAD` operates only on
// files that actually differ from HEAD. This is the load-bearing assertion
// for the pre-commit Phase 5 narrow-fallback fix (TPL-231): a cross-cutting
// commit with a small staged set must re-stamp ≤ a small number of files,
// not the entire ~1968-file repository.
// ---------------------------------------------------------------------------

function git(cwd, args) {
  const out = safeGitSpawn(cwd, args, { encoding: 'utf8', stdio: 'pipe' });
  if (out.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${out.stderr}`);
  }
  return out.stdout;
}

function createTempRepo(name) {
  const dir = mkdtempSync(join(tmpdir(), `coa-hf-${name}-`));
  git(dir, ['init', '--quiet']);
  git(dir, ['config', 'user.email', 'test@test.com']);
  git(dir, ['config', 'user.name', 'Test']);
  // Minimal repo metadata header-fix walks/inspects.
  writeFileSync(join(dir, 'VERSION'), '0.1.0\n');
  writeFileSync(join(dir, 'package.json'), JSON.stringify({
    name: 'tmp', version: '0.1.0',
  }, null, 2) + '\n');
  // A few files with slim headers so re-stamp paths are exercised.
  mkdirSync(join(dir, 'scripts'), { recursive: true });
  for (const name of ['a.mjs', 'b.mjs', 'c.mjs']) {
    writeFileSync(join(dir, 'scripts', name), [
      '/* @HEADER',
      ' * @version 0.1.0 | 2026-01-01',
      ` * @purpose ${name} fixture for header-fix --since test.`,
      ` * @sidecar ${name}.header.md`,
      ' * @layer tooling | @hex _none_ | @ctx _none_',
      ' * @public false',
      ' * @edit careful',
      ' */',
      '',
      'export const value = 1;',
      '',
    ].join('\n'));
  }
  git(dir, ['add', '-A']);
  git(dir, ['commit', '-m', 'init', '--quiet']);
  return dir;
}

describe('header-fix CLI --since=HEAD — TPL-231 integration', () => {
  test('--since=HEAD only walks files differing from HEAD', () => {
    const dir = createTempRepo('since');
    try {
      // Modify exactly one file vs HEAD.
      writeFileSync(join(dir, 'scripts', 'a.mjs'), [
        '/* @HEADER',
        ' * @version 0.1.0 | 2026-01-01',
        ' * @purpose a.mjs fixture — edited.',
        ' * @sidecar a.mjs.header.md',
        ' * @layer tooling | @hex _none_ | @ctx _none_',
        ' * @public false',
        ' * @edit careful',
        ' */',
        '',
        'export const value = 2;',
        '',
      ].join('\n'));

      const out = spawnSync(process.execPath, [HEADER_FIX, '--since=HEAD', '--json'], {
        cwd: dir, encoding: 'utf8', stdio: 'pipe',
      });
      assert.equal(out.status, 0, `header-fix failed: ${out.stderr}\n${out.stdout}`);
      const json = JSON.parse(out.stdout);
      assert.equal(json.ok, true);
      assert.equal(json.data.mode, 'since:HEAD');
      // The "changed" array reports actual writes. Whether a.mjs is re-written
      // depends on header-stamp version drift; the load-bearing claim is that
      // the candidate set is bounded, not that any specific file is rewritten.
      // Independently verify that b.mjs and c.mjs (unchanged vs HEAD) are NOT
      // touched: their on-disk contents must remain byte-identical to the
      // committed version.
      const headBytes = git(dir, ['show', 'HEAD:scripts/b.mjs']);
      assert.equal(readFileSync(join(dir, 'scripts', 'b.mjs'), 'utf8'), headBytes);
      const headBytesC = git(dir, ['show', 'HEAD:scripts/c.mjs']);
      assert.equal(readFileSync(join(dir, 'scripts', 'c.mjs'), 'utf8'), headBytesC);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('--since=HEAD on a clean working tree reports zero work — no whole-repo fallback', () => {
    const dir = createTempRepo('clean');
    try {
      const out = spawnSync(process.execPath, [HEADER_FIX, '--since=HEAD', '--json'], {
        cwd: dir, encoding: 'utf8', stdio: 'pipe',
      });
      assert.equal(out.status, 0, `header-fix failed: ${out.stderr}\n${out.stdout}`);
      const json = JSON.parse(out.stdout);
      assert.equal(json.ok, true);
      assert.equal(json.data.mode, 'since:HEAD');
      assert.deepEqual(json.data.changed, [], 'clean working tree must produce zero writes');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('idempotent run: invoking --since=HEAD twice in a row produces zero writes the second time', () => {
    const dir = createTempRepo('idem');
    try {
      // Edit one file so first run has work to do.
      writeFileSync(join(dir, 'scripts', 'a.mjs'), [
        '/* @HEADER',
        ' * @version 0.1.0 | 2026-01-01',
        ' * @purpose a.mjs fixture — edited.',
        ' * @sidecar a.mjs.header.md',
        ' * @layer tooling | @hex _none_ | @ctx _none_',
        ' * @public false',
        ' * @edit careful',
        ' */',
        '',
        'export const value = 2;',
        '',
      ].join('\n'));

      const first = spawnSync(process.execPath, [HEADER_FIX, '--since=HEAD', '--json'], {
        cwd: dir, encoding: 'utf8', stdio: 'pipe',
      });
      assert.equal(first.status, 0, `first run failed: ${first.stderr}`);

      const second = spawnSync(process.execPath, [HEADER_FIX, '--since=HEAD', '--json'], {
        cwd: dir, encoding: 'utf8', stdio: 'pipe',
      });
      assert.equal(second.status, 0, `second run failed: ${second.stderr}`);
      const json = JSON.parse(second.stdout);
      // Second run sees the same file contents as the first run produced;
      // ensureWriteIfChanged must short-circuit every candidate.
      assert.deepEqual(json.data.changed, [], 'second consecutive run must perform zero writes');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Manual-run safety — without an explicit selector, header-fix refuses to
// run so a parallel session cannot accidentally re-stamp the entire repo.
// ---------------------------------------------------------------------------

describe('header-fix CLI safety gate', () => {
  test('rejects manual invocation with no selector flags', () => {
    const dir = createTempRepo('safety');
    try {
      const out = spawnSync(process.execPath, [HEADER_FIX, '--json'], {
        cwd: dir,
        encoding: 'utf8',
        stdio: 'pipe',
        env: { ...process.env, COA_PRE_COMMIT: '' },
      });
      assert.equal(out.status, 1, 'manual run without selector must exit 1');
      assert.match(out.stderr, /--since=<ref>/, 'error message must mention the new --since flag');
      assert.match(out.stderr, /--all/, 'error message must mention --all opt-in');
      assert.match(out.stderr, /--files-from/, 'error message must mention --files-from');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// TPL-233 — `--lazy-stamp` preserves @version on existing slim headers, so
// the eager stamping that pre-fix re-wrote 1968 files per commit is now
// owned by the post-commit hook (which sees only HEAD's actual diff-tree).
// Pre-commit Phase 5 still runs structural fixes for new/legacy files.
// ---------------------------------------------------------------------------

describe('header-fix CLI --lazy-stamp — TPL-233', () => {
  test('preserves @version on a file with an existing slim header', () => {
    const dir = createTempRepo('lazy-preserve');
    try {
      // Bump the repo VERSION so default eager mode would re-stamp.
      writeFileSync(join(dir, 'VERSION'), '0.5.0\n');
      // Edit a file's body (not its header). @version should stay 0.1.0.
      writeFileSync(join(dir, 'scripts', 'a.mjs'), [
        '/* @HEADER',
        ' * @version 0.1.0 | 2026-01-01',
        ' * @purpose a.mjs fixture for lazy-stamp.',
        ' * @sidecar a.mjs.header.md',
        ' * @layer tooling | @hex _none_ | @ctx _none_',
        ' * @public false',
        ' * @edit careful',
        ' */',
        '',
        'export const value = 999;',
        '',
      ].join('\n'));

      const out = spawnSync(process.execPath, [HEADER_FIX, '--since=HEAD', '--lazy-stamp', '--json'], {
        cwd: dir, encoding: 'utf8', stdio: 'pipe',
      });
      assert.equal(out.status, 0, `header-fix failed: ${out.stderr}`);
      const json = JSON.parse(out.stdout);
      assert.equal(json.ok, true);
      assert.equal(json.data.lazyStamp, true);

      const after = readFileSync(join(dir, 'scripts', 'a.mjs'), 'utf8');
      assert.match(after, /@version 0\.1\.0/, '@version 0.1.0 must be preserved under --lazy-stamp');
      assert.doesNotMatch(after, /@version 0\.5\.0/, 'must NOT have been re-stamped to current VERSION');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('default (eager) mode still re-stamps @version to current VERSION', () => {
    const dir = createTempRepo('lazy-eager-baseline');
    try {
      writeFileSync(join(dir, 'VERSION'), '0.5.0\n');
      writeFileSync(join(dir, 'scripts', 'a.mjs'), [
        '/* @HEADER',
        ' * @version 0.1.0 | 2026-01-01',
        ' * @purpose a.mjs eager baseline.',
        ' * @sidecar a.mjs.header.md',
        ' * @layer tooling | @hex _none_ | @ctx _none_',
        ' * @public false',
        ' * @edit careful',
        ' */',
        '',
        'export const value = 7;',
        '',
      ].join('\n'));

      const out = spawnSync(process.execPath, [HEADER_FIX, '--since=HEAD', '--json'], {
        cwd: dir, encoding: 'utf8', stdio: 'pipe',
      });
      assert.equal(out.status, 0, `header-fix failed: ${out.stderr}`);
      const json = JSON.parse(out.stdout);
      assert.equal(json.data.lazyStamp, false);

      const after = readFileSync(join(dir, 'scripts', 'a.mjs'), 'utf8');
      assert.match(after, /@version 0\.5\.0/, 'eager mode bumps @version to current repo VERSION');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('lazy-stamp still creates slim header on a brand-new file (no header yet)', () => {
    const dir = createTempRepo('lazy-new-file');
    try {
      writeFileSync(join(dir, 'VERSION'), '0.5.0\n');
      // Brand-new file with no header at all. lazy-stamp should still create
      // one with the current VERSION — the "preserve" rule only protects
      // existing slim headers, not the absence of a header.
      // Stage the file so `git diff HEAD` (--since=HEAD) sees it as Added.
      writeFileSync(join(dir, 'scripts', 'fresh.mjs'), 'export const fresh = 1;\n');
      git(dir, ['add', 'scripts/fresh.mjs']);

      const out = spawnSync(process.execPath, [HEADER_FIX, '--since=HEAD', '--lazy-stamp', '--json'], {
        cwd: dir, encoding: 'utf8', stdio: 'pipe',
      });
      assert.equal(out.status, 0, `header-fix failed: ${out.stderr}`);

      const after = readFileSync(join(dir, 'scripts', 'fresh.mjs'), 'utf8');
      // lazy-stamp must still inject SOME header (slim or legacy heavy depending
      // on whether a sidecar exists) — the rule only protects an existing slim
      // @version, not the absence of a header.
      assert.match(after, /@?HEADER/, 'new file should get a header injected');
      // Whichever format is used, the version line must reflect the current
      // repo VERSION (lazy-stamp has nothing prior to preserve).
      assert.match(after, /(?:@)?version 0\.5\.0/, 'new-file version should be the current repo VERSION');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// TPL-233 — `--files-from=<path|->` constrains the walk to the listed paths,
// honouring isMeaningfulFile filtering. The post-commit hook feeds
// `git diff-tree` into stdin via this flag (no fallback to the whole repo).
// ---------------------------------------------------------------------------

describe('header-fix CLI --files-from — TPL-233', () => {
  test('reads paths from stdin and walks ONLY those files', () => {
    const dir = createTempRepo('files-from-stdin');
    try {
      // Bump VERSION so eager stamping would have something to do.
      writeFileSync(join(dir, 'VERSION'), '0.9.0\n');
      // Constrain walk to a.mjs only — b.mjs and c.mjs must remain untouched.
      const out = spawnSync(
        process.execPath,
        [HEADER_FIX, '--files-from=-', '--json'],
        {
          cwd: dir,
          encoding: 'utf8',
          stdio: 'pipe',
          input: 'scripts/a.mjs\n',
        },
      );
      assert.equal(out.status, 0, `header-fix failed: ${out.stderr}`);
      const json = JSON.parse(out.stdout);
      assert.equal(json.data.mode, 'files-from:-');

      const a = readFileSync(join(dir, 'scripts', 'a.mjs'), 'utf8');
      assert.match(a, /@version 0\.9\.0/, 'a.mjs should be re-stamped (eager mode)');

      const b = readFileSync(join(dir, 'scripts', 'b.mjs'), 'utf8');
      assert.match(b, /@version 0\.1\.0/, 'b.mjs must NOT be touched (not in --files-from)');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('empty stdin produces zero work — no whole-repo fallback', () => {
    const dir = createTempRepo('files-from-empty');
    try {
      writeFileSync(join(dir, 'VERSION'), '0.9.0\n');
      const out = spawnSync(
        process.execPath,
        [HEADER_FIX, '--files-from=-', '--json'],
        { cwd: dir, encoding: 'utf8', stdio: 'pipe', input: '' },
      );
      assert.equal(out.status, 0, `header-fix failed: ${out.stderr}`);
      const json = JSON.parse(out.stdout);
      assert.deepEqual(json.data.changed, [], 'empty stdin must produce zero writes');
      // a/b/c must remain at their initial @version 0.1.0 — empty input did NOT
      // fall back to the whole repo.
      for (const name of ['a.mjs', 'b.mjs', 'c.mjs']) {
        const text = readFileSync(join(dir, 'scripts', name), 'utf8');
        assert.match(text, /@version 0\.1\.0/, `${name} must remain at 0.1.0 — no fallback walk`);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('filters out non-meaningful paths in --files-from input', () => {
    const dir = createTempRepo('files-from-filter');
    try {
      writeFileSync(join(dir, 'VERSION'), '0.9.0\n');
      // Mix in non-meaningful entries (sidecar files, _generated paths) — they
      // must be filtered out before any walk happens.
      const stdin = [
        'scripts/a.mjs',
        'scripts/a.mjs.header.md',  // sidecar — must be skipped
        'docs/_generated/something.json',  // _generated — must be skipped
        '',
      ].join('\n');
      const out = spawnSync(
        process.execPath,
        [HEADER_FIX, '--files-from=-', '--json'],
        { cwd: dir, encoding: 'utf8', stdio: 'pipe', input: stdin },
      );
      assert.equal(out.status, 0, `header-fix failed: ${out.stderr}`);
      const json = JSON.parse(out.stdout);
      assert.equal(json.ok, true);

      const a = readFileSync(join(dir, 'scripts', 'a.mjs'), 'utf8');
      assert.match(a, /@version 0\.9\.0/, 'meaningful path was walked');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// TPL-331 — pre-commit self-rewrite guard
//
// When header-fix runs as Phase 5 of the pre-commit hook (COA_PRE_COMMIT=1)
// with --use-current-version, it must NOT include .githooks/pre-commit in the
// stamp pass. Rewriting the hook file while the shell is executing it can
// invalidate bash parsing mid-flight on some platforms/worktrees.
//
// Pre-fix: selectFiles() had no filter — .githooks/pre-commit was processed.
// Post-fix: files = files.filter(f => toPosix(f) !== '.githooks/pre-commit').
// ---------------------------------------------------------------------------

describe('header-fix pre-commit self-rewrite guard — TPL-331', () => {
  test('.githooks/pre-commit is excluded when COA_PRE_COMMIT=1 and --use-current-version', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tpl-331-hf-guard-'));
    try {
      const git = (args) => {
        const out = safeGitSpawn(dir, args, { encoding: 'utf8', stdio: 'pipe' });
        if (out.status !== 0) throw new Error(`git ${args.join(' ')} failed:\n${out.stderr}`);
        return out.stdout;
      };

      git(['init', '--quiet']);
      git(['config', 'user.email', 'test@test.com']);
      git(['config', 'user.name', 'Test']);

      writeFileSync(join(dir, 'VERSION'), '0.9.9\n');

      // A regular file that SHOULD be stamped by the pass.
      mkdirSync(join(dir, 'scripts'), { recursive: true });
      writeFileSync(join(dir, 'scripts', 'sample.mjs'), [
        '/* @HEADER',
        ' * @version 0.1.0 | 2026-01-01',
        ' * @purpose TPL-331 guard fixture — regular file.',
        ' * @sidecar sample.mjs.header.md',
        ' * @layer util | @hex _none_ | @ctx _none_',
        ' * @public false',
        ' * @edit rewrite-ok',
        ' */',
        '',
        'export const x = 1;',
        '',
      ].join('\n'));

      // .githooks/pre-commit — must NOT be stamped when guard is active.
      mkdirSync(join(dir, '.githooks'), { recursive: true });
      writeFileSync(join(dir, '.githooks', 'pre-commit'), [
        '#!/usr/bin/env bash',
        '# @HEADER',
        '# @version 0.1.0 | 2026-01-01',
        '# @purpose TPL-331 guard fixture — hook file.',
        '# @sidecar pre-commit.header.md',
        '# @layer git-hooks | @hex _none_ | @ctx _none_',
        '# @public false',
        '# @edit careful',
        'echo hello',
        '',
      ].join('\n'));

      git(['add', 'VERSION', 'scripts/sample.mjs', '.githooks/pre-commit']);
      git(['commit', '-m', 'init', '--quiet']);

      const env = { ...process.env, COA_PRE_COMMIT: '1' };

      // Run with --all so both files are in scope regardless of git diff.
      const out = spawnSync(
        process.execPath,
        [HEADER_FIX, '--all', '--use-current-version', '--json'],
        { cwd: dir, env, encoding: 'utf8', stdio: 'pipe' },
      );
      assert.equal(out.status, 0, `header-fix exited ${out.status}:\n${out.stderr}\n${out.stdout}`);

      const json = JSON.parse(out.stdout);
      assert.equal(json.ok, true, 'header-fix must report ok:true');

      // The regular file must have been stamped (stale @version).
      assert.ok(
        json.data.changed.some((f) => f.includes('sample.mjs')),
        `expected sample.mjs in changed list, got: ${JSON.stringify(json.data.changed)}`,
      );

      // .githooks/pre-commit must NOT appear in the changed list.
      assert.ok(
        !json.data.changed.some((f) => f.includes('pre-commit')),
        `.githooks/pre-commit must be excluded from Phase 5 stamp pass, got: ${JSON.stringify(json.data.changed)}`,
      );

      // Verify the hook file content is unchanged on disk.
      const hookContent = readFileSync(join(dir, '.githooks', 'pre-commit'), 'utf8');
      assert.match(hookContent, /@version 0\.1\.0/, '.githooks/pre-commit must not have been re-stamped');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
