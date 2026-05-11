/* @HEADER
 * @version 0.7.80 | 2026-05-04
 * @purpose Unit tests for coa-merge.mjs pure helpers — semver, changelog gates, partial-state detection (TPL-222 J2), and ceremony+regen path resolution (TPL-222 J5).
 * @sidecar coa-merge.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import {
  parseSemver,
  bumpPatch,
  isValidBump,
  changelogHasContent,
  parseMergeArgs,
  shouldAttemptPull,
  shouldWriteSnapshot,
  detectPartialState,
  hasVersionedSection,
  resolveAutoExtendPaths,
  propagateBackupsToMainRepo,
  propagateSummariesToMainRepo,
  DEFAULT_CEREMONY_FILES,
  DEFAULT_REGEN_PATHS,
} from '../../scripts/coa-merge.mjs';

describe('coa-merge: parseSemver', () => {
  test('parses standard semver', () => {
    assert.deepStrictEqual(parseSemver('1.2.3'), { major: 1, minor: 2, patch: 3 });
  });

  test('parses 0.7.0', () => {
    assert.deepStrictEqual(parseSemver('0.7.0'), { major: 0, minor: 7, patch: 0 });
  });

  test('handles missing parts', () => {
    assert.deepStrictEqual(parseSemver('1'), { major: 1, minor: 0, patch: 0 });
  });
});

describe('coa-merge: bumpPatch', () => {
  test('bumps patch by 1', () => {
    assert.equal(bumpPatch('0.7.0'), '0.7.1');
  });

  test('bumps from 0.6.9', () => {
    assert.equal(bumpPatch('0.6.9'), '0.6.10');
  });

  test('bumps from 1.0.0', () => {
    assert.equal(bumpPatch('1.0.0'), '1.0.1');
  });
});

describe('coa-merge: isValidBump', () => {
  test('accepts +1 patch', () => {
    assert.ok(isValidBump('0.7.0', '0.7.1'));
  });

  test('accepts +1 minor', () => {
    assert.ok(isValidBump('0.7.5', '0.8.0'));
  });

  test('accepts +1 major', () => {
    assert.ok(isValidBump('0.7.5', '1.0.0'));
  });

  test('rejects +2 patch', () => {
    assert.ok(!isValidBump('0.7.0', '0.7.2'));
  });

  test('rejects same version', () => {
    assert.ok(!isValidBump('0.7.0', '0.7.0'));
  });

  test('rejects backward version', () => {
    assert.ok(!isValidBump('0.7.1', '0.7.0'));
  });
});

describe('coa-merge: changelogHasContent', () => {
  test('returns true when Unreleased has entries', () => {
    const text = '## [Unreleased]\n\n### Added\n\n- Something new\n\n## [0.7.0]\n';
    assert.ok(changelogHasContent(text));
  });

  test('returns false when Unreleased is empty', () => {
    const text = '## [Unreleased]\n\n_Nothing yet._\n\n## [0.7.0]\n';
    assert.ok(!changelogHasContent(text));
  });

  test('returns false when Unreleased has only whitespace', () => {
    const text = '## [Unreleased]\n\n\n\n## [0.7.0]\n';
    assert.ok(!changelogHasContent(text));
  });

  test('returns false when no Unreleased section', () => {
    const text = '## [0.7.0]\n\n- Something\n';
    assert.ok(!changelogHasContent(text));
  });

  test('returns false for _none_ placeholder', () => {
    const text = '## [Unreleased]\n\n_none_\n\n## [0.7.0]\n';
    assert.ok(!changelogHasContent(text));
  });
});

describe('coa-merge: parseMergeArgs', () => {
  test('parses --message=value', () => {
    const args = parseMergeArgs(['--message=feat: add zoom', '--push']);
    assert.equal(args.get('--message'), 'feat: add zoom');
    assert.ok(args.has('--push'));
  });

  test('parses --dry-run as boolean', () => {
    const args = parseMergeArgs(['--dry-run']);
    assert.ok(args.has('--dry-run'));
    assert.equal(args.get('--dry-run'), undefined);
  });

  test('handles empty argv', () => {
    const args = parseMergeArgs([]);
    assert.ok(!args.has('--message'));
  });
});

describe('coa-merge: shouldAttemptPull', () => {
  test('returns true when git remote lists at least one remote', () => {
    assert.equal(shouldAttemptPull('origin\n'), true);
    assert.equal(shouldAttemptPull('origin\nupstream\n'), true);
  });

  test('returns false on empty remote listing (template-as-template)', () => {
    assert.equal(shouldAttemptPull(''), false);
    assert.equal(shouldAttemptPull('\n'), false);
    assert.equal(shouldAttemptPull('   '), false);
  });

  test('returns false for non-string input (defensive)', () => {
    assert.equal(shouldAttemptPull(undefined), false);
    assert.equal(shouldAttemptPull(null), false);
    assert.equal(shouldAttemptPull(123), false);
  });

  test('trims whitespace before deciding', () => {
    assert.equal(shouldAttemptPull('  origin  \n'), true);
    assert.equal(shouldAttemptPull('\n\n\n'), false);
  });
});

describe('coa-merge: shouldWriteSnapshot', () => {
  test('default policy is to write snapshot', () => {
    assert.equal(shouldWriteSnapshot(), true);
    assert.equal(shouldWriteSnapshot({}), true);
  });

  test('--no-snapshot suppresses', () => {
    assert.equal(shouldWriteSnapshot({ noSnapshot: true }), false);
  });

  test('--dry-run suppresses (no side effects in dry runs)', () => {
    assert.equal(shouldWriteSnapshot({ dryRun: true }), false);
  });

  test('both flags suppress (either is sufficient)', () => {
    assert.equal(shouldWriteSnapshot({ noSnapshot: true, dryRun: true }), false);
  });

  test('falsy individual flags do not suppress', () => {
    assert.equal(shouldWriteSnapshot({ noSnapshot: false }), true);
    assert.equal(shouldWriteSnapshot({ dryRun: false }), true);
    assert.equal(shouldWriteSnapshot({ noSnapshot: false, dryRun: false }), true);
  });
});

// ---------------------------------------------------------------------------
// TPL-222 — pre-flight detect-and-resume (J2)
// ---------------------------------------------------------------------------

describe('coa-merge: hasVersionedSection', () => {
  test('detects standard "## [X.Y.Z] — date" heading', () => {
    const text =
      '## [Unreleased]\n\n_Nothing yet._\n\n## [0.7.28] — 2026-04-27 12:34:56 UTC+3\n\n- foo\n';
    assert.equal(hasVersionedSection(text, '0.7.28'), true);
  });

  test('detects bare "## [X.Y.Z]" heading without date separator', () => {
    const text = '## [0.7.28]\n\n- foo\n';
    assert.equal(hasVersionedSection(text, '0.7.28'), true);
  });

  test('returns false when version section is absent', () => {
    const text = '## [Unreleased]\n\n- foo\n';
    assert.equal(hasVersionedSection(text, '0.7.28'), false);
  });

  test('returns false on bad input types', () => {
    assert.equal(hasVersionedSection(null, '0.7.28'), false);
    assert.equal(hasVersionedSection('## [0.7.28]', null), false);
  });

  test('does not match a substring (e.g. "0.7.2" must not match "0.7.28")', () => {
    const text = '## [0.7.28] — 2026-04-27\n';
    assert.equal(hasVersionedSection(text, '0.7.2'), false);
  });
});

describe('coa-merge: detectPartialState (TPL-222 J2)', () => {
  test('normal: working tree matches HEAD', () => {
    const r = detectPartialState({
      headVersion: '0.7.27',
      wtVersion: '0.7.27',
      changelogText: '## [Unreleased]\n\n- new\n',
    });
    assert.deepStrictEqual(r, {
      partial: false,
      kind: 'normal',
      headVersion: '0.7.27',
      wtVersion: '0.7.27',
    });
  });

  test('half-baked: VERSION +1, [wtVersion] section present, [Unreleased] empty', () => {
    const cl = [
      '## [Unreleased]',
      '',
      '_Nothing yet._',
      '',
      '## [0.7.28] — 2026-04-27 12:34:56 UTC+3',
      '',
      '- migrated content',
      '',
    ].join('\n');
    const r = detectPartialState({
      headVersion: '0.7.27',
      wtVersion: '0.7.28',
      changelogText: cl,
    });
    assert.equal(r.partial, true);
    assert.equal(r.kind, 'half-baked');
    assert.equal(r.headVersion, '0.7.27');
    assert.equal(r.wtVersion, '0.7.28');
  });

  test('partial: VERSION ahead but not by exactly +1 (e.g. hand-edited)', () => {
    const r = detectPartialState({
      headVersion: '0.7.27',
      wtVersion: '0.7.30',
      changelogText: '## [Unreleased]\n\n- something\n',
    });
    assert.equal(r.partial, true);
    assert.equal(r.kind, 'partial');
  });

  test('partial: VERSION +1 but [Unreleased] still has content (changelog-release did not run)', () => {
    const r = detectPartialState({
      headVersion: '0.7.27',
      wtVersion: '0.7.28',
      changelogText: '## [Unreleased]\n\n- still here\n',
    });
    assert.equal(r.partial, true);
    assert.equal(r.kind, 'partial');
  });

  test('partial: VERSION +1, [Unreleased] empty, but no [wtVersion] section', () => {
    const r = detectPartialState({
      headVersion: '0.7.27',
      wtVersion: '0.7.28',
      changelogText: '## [Unreleased]\n\n_Nothing yet._\n',
    });
    assert.equal(r.partial, true);
    assert.equal(r.kind, 'partial');
  });

  test('normal when either version is missing (defensive)', () => {
    assert.equal(
      detectPartialState({ headVersion: null, wtVersion: '0.7.28', changelogText: '' }).kind,
      'normal',
    );
    assert.equal(
      detectPartialState({ headVersion: '0.7.27', wtVersion: null, changelogText: '' }).kind,
      'normal',
    );
  });

  test('zero-arg call returns defensive normal', () => {
    const r = detectPartialState();
    assert.equal(r.partial, false);
    assert.equal(r.kind, 'normal');
  });
});

// ---------------------------------------------------------------------------
// TPL-222 — auto-extend path resolution (J5)
// ---------------------------------------------------------------------------

describe('coa-merge: resolveAutoExtendPaths (TPL-222 J5)', () => {
  test('default set covers VERSION + package.json + CHANGELOG.md', () => {
    const paths = resolveAutoExtendPaths();
    assert.ok(paths.includes('VERSION'));
    assert.ok(paths.includes('package.json'));
    assert.ok(paths.includes('CHANGELOG.md'));
  });

  test('default set covers Phase-5 regen artifacts (AGENTS, .cursorrules, LOCAL/MICRO, _generated)', () => {
    const paths = resolveAutoExtendPaths();
    assert.ok(paths.includes('AGENTS.md'));
    assert.ok(paths.includes('.cursorrules'));
    assert.ok(paths.includes('LOCAL.md'));
    assert.ok(paths.includes('MICRO.md'));
    assert.ok(paths.includes('docs/_generated/dependency-graph.json'));
    assert.ok(paths.includes('docs/_generated/spec-index.json'));
    assert.ok(paths.includes('docs/backlog/_generated/index.md'));
    assert.ok(paths.includes('docs/backlog/_generated/backlog.json'));
  });

  test('ceremony files always extended — even when pre-staged (TPL-252)', () => {
    // CHANGELOG.md is a protected path; operator may pre-stage it before
    // running coa-merge. Previous behaviour filtered it from addPaths, leaving
    // it staged without claim coverage → Phase 3 block. Fixed in TPL-252.
    const paths = resolveAutoExtendPaths({
      filesUserStaged: ['CHANGELOG.md', 'modules/auth/index.mjs'],
    });
    assert.ok(paths.includes('CHANGELOG.md'), 'pre-staged CHANGELOG must still be extended');
    assert.ok(paths.includes('VERSION'), 'VERSION not staged → extended');
    assert.ok(paths.includes('package.json'), 'package.json not staged → extended');
  });

  test('regen paths filtered when already staged (original claim coverage)', () => {
    const paths = resolveAutoExtendPaths({
      filesUserStaged: ['AGENTS.md', 'docs/_generated/dependency-graph.json'],
    });
    assert.ok(!paths.includes('AGENTS.md'), 'pre-staged regen path should be excluded');
    assert.ok(
      !paths.includes('docs/_generated/dependency-graph.json'),
      'pre-staged _generated regen path should be excluded',
    );
    assert.ok(paths.includes('CHANGELOG.md'), 'ceremony CHANGELOG.md still extended');
  });

  test('normalizes backslashes to forward slashes (Windows safety)', () => {
    const paths = resolveAutoExtendPaths({
      filesUserStaged: ['docs\\_generated\\dependency-graph.json'],
    });
    assert.ok(
      !paths.includes('docs/_generated/dependency-graph.json'),
      'Windows-style path should match POSIX form after normalization',
    );
  });

  test('deduplicates when ceremonyFiles and regenPaths overlap', () => {
    const paths = resolveAutoExtendPaths({
      ceremonyFiles: ['VERSION', 'package.json'],
      regenPaths: ['package.json', 'AGENTS.md'],
    });
    const pkgCount = paths.filter((p) => p === 'package.json').length;
    assert.equal(pkgCount, 1, 'package.json should appear exactly once after dedup');
  });

  test('filters out empty / non-string entries (defensive)', () => {
    const paths = resolveAutoExtendPaths({
      ceremonyFiles: ['VERSION', '', null, undefined, 42],
      regenPaths: ['AGENTS.md'],
    });
    assert.deepStrictEqual(paths, ['VERSION', 'AGENTS.md']);
  });

  test('exported defaults match resolver output for empty inputs', () => {
    const paths = resolveAutoExtendPaths({ filesUserStaged: [] });
    const expectedSize = DEFAULT_CEREMONY_FILES.length + DEFAULT_REGEN_PATHS.length;
    assert.equal(paths.length, expectedSize);
  });
});

// ---------------------------------------------------------------------------
// TPL-270 — .backups/ artifact propagation to main repo
// ---------------------------------------------------------------------------

describe('coa-merge: propagateBackupsToMainRepo (TPL-270)', () => {
  test('returns ok:false when local .backups/ does not exist', () => {
    const result = propagateBackupsToMainRepo({
      localRoot: '/some/transport',
      mainWorktreePath: '/some/main',
      version: '1.2.3',
      _fs: {
        existsSync: () => false,
        readdirSync: () => [],
        mkdirSync: () => {},
        copyFileSync: () => {},
      },
    });
    assert.equal(result.ok, false);
    assert.ok(/not found/.test(result.message));
  });

  test('returns ok:false when no artifact matches the version', () => {
    const result = propagateBackupsToMainRepo({
      localRoot: '/transport',
      mainWorktreePath: '/main',
      version: '1.2.3',
      _fs: {
        existsSync: (p) => p.includes('.backups'),
        readdirSync: () => ['merge-repo(0.9.0).txt', 'merge-repo(0.9.0).zip'],
        mkdirSync: () => {},
        copyFileSync: () => {},
      },
    });
    assert.equal(result.ok, false);
    assert.ok(/no .backups\/ artifacts found/.test(result.message));
  });

  test('copies .txt and .zip matching the version into main .backups/', () => {
    const copied = [];
    const result = propagateBackupsToMainRepo({
      localRoot: '/transport',
      mainWorktreePath: '/main',
      version: '1.2.3',
      _fs: {
        existsSync: (p) => p.endsWith('.backups') && !p.startsWith('/main'),
        readdirSync: () => ['merge-repo(1.2.3).txt', 'merge-repo(1.2.3).zip', 'other.txt'],
        mkdirSync: () => {},
        copyFileSync: (src, dst) => copied.push(dst),
      },
    });
    assert.equal(result.ok, true);
    assert.equal(result.copied.length, 2);
    assert.ok(copied.some((d) => d.includes('merge-repo(1.2.3).txt')));
    assert.ok(copied.some((d) => d.includes('merge-repo(1.2.3).zip')));
  });

  test('creates target .backups/ dir when it does not exist', () => {
    let dirCreated = false;
    // Use a Set of existing paths to avoid Windows backslash comparison issues.
    const existingPaths = new Set([join('/transport', '.backups')]);
    propagateBackupsToMainRepo({
      localRoot: '/transport',
      mainWorktreePath: '/main',
      version: '0.7.79',
      _fs: {
        existsSync: (p) => existingPaths.has(p),
        readdirSync: () => ['merge-repo(0.7.79).txt'],
        mkdirSync: (p) => {
          dirCreated = true;
          existingPaths.add(p);
        },
        copyFileSync: () => {},
      },
    });
    assert.ok(dirCreated, 'mkdirSync should be called when target .backups/ absent');
  });

  test('idempotent: skips copy when artifact already exists at target', () => {
    let copyCount = 0;
    const result = propagateBackupsToMainRepo({
      localRoot: '/transport',
      mainWorktreePath: '/main',
      version: '1.2.3',
      _fs: {
        existsSync: () => true,
        readdirSync: () => ['merge-repo(1.2.3).txt'],
        mkdirSync: () => {},
        copyFileSync: () => {
          copyCount++;
        },
      },
    });
    assert.equal(result.ok, true);
    assert.equal(copyCount, 0, 'no copy when artifact already exists (idempotent)');
    assert.equal(result.copied.length, 1, 'file still listed as copied (was already there)');
  });

  test('version dots are escaped in pattern (no false positives)', () => {
    const copied = [];
    // Use a Set of existing paths to avoid Windows backslash comparison issues.
    // Both local and target .backups/ dirs exist; no individual files exist (so copy proceeds).
    const existingDirs = new Set([join('/transport', '.backups'), join('/main', '.backups')]);
    propagateBackupsToMainRepo({
      localRoot: '/transport',
      mainWorktreePath: '/main',
      version: '1.2.3',
      _fs: {
        existsSync: (p) => existingDirs.has(p),
        readdirSync: () => ['merge-repo(1X2X3).txt', 'merge-repo(1.2.3).txt'],
        mkdirSync: () => {},
        copyFileSync: (src, dst) => copied.push(dst),
      },
    });
    assert.equal(copied.length, 1, '1X2X3 must not match version 1.2.3');
    assert.ok(copied[0].includes('merge-repo(1.2.3).txt'));
  });
});

// ---------------------------------------------------------------------------
// TPL-271 — session-summary propagation to main repo
// ---------------------------------------------------------------------------

describe('coa-merge: propagateSummariesToMainRepo (TPL-271)', () => {
  const SUMMARIES_REL = join('docs', 'analysis', 'session-summaries');

  test('no local summaries dir → ok:true, no-op, no error', () => {
    const result = propagateSummariesToMainRepo({
      localRoot: '/transport',
      mainWorktreePath: '/main',
      _fs: {
        existsSync: () => false,
        readdirSync: () => [],
        mkdirSync: () => {},
        copyFileSync: () => {},
        readFileSync: () => '',
      },
    });
    assert.equal(result.ok, true);
    assert.equal(result.copied.length, 0);
    assert.ok(/nothing to propagate/.test(result.message));
  });

  test('dir exists but no .md files → ok:true, no-op', () => {
    const localDir = join('/transport', SUMMARIES_REL);
    const result = propagateSummariesToMainRepo({
      localRoot: '/transport',
      mainWorktreePath: '/main',
      _fs: {
        existsSync: (p) => p === localDir,
        readdirSync: () => ['README.txt', '.gitkeep'],
        mkdirSync: () => {},
        copyFileSync: () => {},
        readFileSync: () => '',
      },
    });
    assert.equal(result.ok, true);
    assert.equal(result.copied.length, 0);
    assert.ok(/nothing to propagate/.test(result.message));
  });

  test('one summary present, target file absent → copied', () => {
    const localDir = join('/transport', SUMMARIES_REL);
    const targetDir = join('/main', SUMMARIES_REL);
    const targetFile = join(targetDir, '2026-05-04_TPL-271_Summary.md');
    const existingPaths = new Set([localDir, targetDir]);
    const copied = [];
    const result = propagateSummariesToMainRepo({
      localRoot: '/transport',
      mainWorktreePath: '/main',
      _fs: {
        existsSync: (p) => existingPaths.has(p),
        readdirSync: () => ['2026-05-04_TPL-271_Summary.md'],
        mkdirSync: () => {},
        copyFileSync: (src, dst) => copied.push(dst),
        readFileSync: () => '',
      },
    });
    assert.equal(result.ok, true);
    assert.deepEqual(result.copied, ['2026-05-04_TPL-271_Summary.md']);
    assert.ok(copied.some((d) => d === targetFile));
  });

  test('target dir does not exist → creates it', () => {
    const localDir = join('/transport', SUMMARIES_REL);
    let dirCreated = false;
    propagateSummariesToMainRepo({
      localRoot: '/transport',
      mainWorktreePath: '/main',
      _fs: {
        existsSync: (p) => p === localDir,
        readdirSync: () => ['2026-05-04_TPL-271_Summary.md'],
        mkdirSync: () => {
          dirCreated = true;
        },
        copyFileSync: () => {},
        readFileSync: () => '',
      },
    });
    assert.ok(dirCreated, 'mkdirSync must be called when target dir absent');
  });

  test('idempotent: target file exists with same content → skipped silently', () => {
    const localDir = join('/transport', SUMMARIES_REL);
    const targetDir = join('/main', SUMMARIES_REL);
    const targetFile = join(targetDir, '2026-05-04_TPL-271_Summary.md');
    const existingPaths = new Set([localDir, targetDir, targetFile]);
    let copyCount = 0;
    const result = propagateSummariesToMainRepo({
      localRoot: '/transport',
      mainWorktreePath: '/main',
      _fs: {
        existsSync: (p) => existingPaths.has(p),
        readdirSync: () => ['2026-05-04_TPL-271_Summary.md'],
        mkdirSync: () => {},
        copyFileSync: () => {
          copyCount++;
        },
        readFileSync: () => 'identical content',
      },
    });
    assert.equal(result.ok, true);
    assert.equal(copyCount, 0, 'no copy when content is identical');
    assert.equal(result.skipped[0].reason, 'identical');
  });

  test('conflict: target file exists with different content → skipped with differs reason', () => {
    const localDir = join('/transport', SUMMARIES_REL);
    const targetDir = join('/main', SUMMARIES_REL);
    const targetFile = join(targetDir, '2026-05-04_TPL-271_Summary.md');
    const existingPaths = new Set([localDir, targetDir, targetFile]);
    let copyCount = 0;
    const result = propagateSummariesToMainRepo({
      localRoot: '/transport',
      mainWorktreePath: '/main',
      _fs: {
        existsSync: (p) => existingPaths.has(p),
        readdirSync: () => ['2026-05-04_TPL-271_Summary.md'],
        mkdirSync: () => {},
        copyFileSync: () => {
          copyCount++;
        },
        readFileSync: (p) => (p.includes('transport') ? 'new content' : 'old content'),
      },
    });
    assert.equal(result.ok, true);
    assert.equal(copyCount, 0, 'no overwrite on content conflict');
    assert.equal(result.skipped.length, 1);
    assert.equal(result.skipped[0].reason, 'differs');
    assert.equal(result.skipped[0].file, '2026-05-04_TPL-271_Summary.md');
  });

  test('multiple .md files → all copied', () => {
    const localDir = join('/transport', SUMMARIES_REL);
    const targetDir = join('/main', SUMMARIES_REL);
    const existingPaths = new Set([localDir, targetDir]);
    const copied = [];
    const result = propagateSummariesToMainRepo({
      localRoot: '/transport',
      mainWorktreePath: '/main',
      _fs: {
        existsSync: (p) => existingPaths.has(p),
        readdirSync: () => [
          '2026-05-04_TPL-271_Summary.md',
          '2026-05-04_TPL-270_Summary.md',
          '2026-05-03_TPL-265_Summary.md',
        ],
        mkdirSync: () => {},
        copyFileSync: (src, dst) => copied.push(dst),
        readFileSync: () => '',
      },
    });
    assert.equal(result.ok, true);
    assert.equal(result.copied.length, 3);
    assert.equal(copied.length, 3);
  });
});
