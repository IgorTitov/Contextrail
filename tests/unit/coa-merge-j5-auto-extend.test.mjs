/* @HEADER
 * @version 0.7.72 | 2026-05-04
 * @purpose Unit tests for J5 auto-extend completeness: CHANGELOG.md always included + sidecar pair detection (TPL-252).
 * @sidecar coa-merge-j5-auto-extend.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * TPL-252 — J5 auto-extend completeness tests.
 *
 * Verifies two gaps closed by TPL-252:
 *   1. CHANGELOG.md (and all ceremony files) are ALWAYS in the auto-extend
 *      output, even when the operator pre-stages them before running coa-merge.
 *   2. Sidecar .header.md files are paired with their staged source: if
 *      scripts/foo.mjs is staged and scripts/foo.mjs.header.md exists, both
 *      appear in the extend list without manual operator intervention.
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveAutoExtendPaths,
  DEFAULT_CEREMONY_FILES,
} from '../../scripts/coa-merge.mjs';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a sidecarExists mock that returns true only for listed paths. */
function mockSidecarExists(...existingPaths) {
  const existing = new Set(existingPaths.map((p) => String(p).replaceAll('\\', '/')));
  return (p) => existing.has(String(p).replaceAll('\\', '/'));
}

// ---------------------------------------------------------------------------
// Ceremony file completeness (CHANGELOG.md gap — TPL-252)
// ---------------------------------------------------------------------------

describe('J5 auto-extend: ceremony files always extended', () => {
  test('CHANGELOG.md is in extend output even when not staged', () => {
    const paths = resolveAutoExtendPaths({
      filesUserStaged: ['scripts/foo.mjs'],
      sidecarExists: mockSidecarExists(),
    });
    assert.ok(paths.includes('CHANGELOG.md'), 'CHANGELOG.md must always be extended');
  });

  test('CHANGELOG.md is in extend output even when PRE-STAGED by operator', () => {
    // TPL-249 failure mode: operator edits CHANGELOG.md and stages it before
    // running coa-merge. Old code filtered it out → Phase 3 blocked. Fixed.
    const paths = resolveAutoExtendPaths({
      filesUserStaged: ['CHANGELOG.md', 'scripts/my-fix.mjs'],
      sidecarExists: mockSidecarExists(),
    });
    assert.ok(
      paths.includes('CHANGELOG.md'),
      'CHANGELOG.md must still be extended when pre-staged',
    );
  });

  test('VERSION is in extend output even when pre-staged by operator', () => {
    const paths = resolveAutoExtendPaths({
      filesUserStaged: ['VERSION'],
      sidecarExists: mockSidecarExists(),
    });
    assert.ok(paths.includes('VERSION'), 'VERSION must still be extended when pre-staged');
  });

  test('package.json is in extend output even when pre-staged by operator', () => {
    const paths = resolveAutoExtendPaths({
      filesUserStaged: ['package.json'],
      sidecarExists: mockSidecarExists(),
    });
    assert.ok(paths.includes('package.json'), 'package.json must still be extended when pre-staged');
  });

  test('all DEFAULT_CEREMONY_FILES appear even when all pre-staged', () => {
    const paths = resolveAutoExtendPaths({
      filesUserStaged: [...DEFAULT_CEREMONY_FILES],
      sidecarExists: mockSidecarExists(),
    });
    for (const f of DEFAULT_CEREMONY_FILES) {
      assert.ok(paths.includes(f), `ceremony file ${f} must be extended even when pre-staged`);
    }
  });
});

// ---------------------------------------------------------------------------
// Sidecar pair detection (TPL-252 new feature, corrected by TPL-264)
// ---------------------------------------------------------------------------

describe('J5 auto-extend: sidecar pair detection', () => {
  test('source X with existing-but-unstaged sidecar → sidecar NOT auto-added (TPL-264 Bug 1)', () => {
    // Sidecar exists on disk but operator has not staged it. With the Bug 1 fix,
    // we do NOT add it: existing-and-unstaged sidecars won't be committed and
    // claiming them breaks auto-complete.
    const paths = resolveAutoExtendPaths({
      filesUserStaged: ['scripts/foo.mjs'],
      ceremonyFiles: [],
      regenPaths: [],
      sidecarExists: mockSidecarExists('scripts/foo.mjs.header.md'),
    });
    assert.ok(
      !paths.includes('scripts/foo.mjs.header.md'),
      'existing-but-unstaged sidecar must NOT be added',
    );
  });

  test('source X with no sidecar on disk → sidecar IS added (new file for pre-commit hook)', () => {
    // Sidecar does not exist yet. pre-commit will create and auto-stage it, so
    // the claim must cover it in advance.
    const paths = resolveAutoExtendPaths({
      filesUserStaged: ['scripts/bar.mjs'],
      ceremonyFiles: [],
      regenPaths: [],
      sidecarExists: mockSidecarExists(), // no sidecars exist
    });
    assert.ok(
      paths.includes('scripts/bar.mjs.header.md'),
      'non-existent sidecar must be added (pre-commit hook will create it)',
    );
  });

  test('multiple staged sources → only non-existent sidecars auto-added', () => {
    // a and c have existing sidecars (not staged) → NOT added.
    // b has no sidecar on disk → IS added (pre-commit will create it).
    const paths = resolveAutoExtendPaths({
      filesUserStaged: ['scripts/a.mjs', 'scripts/b.mjs', 'scripts/c.mjs'],
      ceremonyFiles: [],
      regenPaths: [],
      sidecarExists: mockSidecarExists(
        'scripts/a.mjs.header.md', // exists on disk, not staged
        // b.mjs has no sidecar on disk
        'scripts/c.mjs.header.md', // exists on disk, not staged
      ),
    });
    assert.ok(!paths.includes('scripts/a.mjs.header.md'), 'a sidecar exists but not staged — not added');
    assert.ok(paths.includes('scripts/b.mjs.header.md'), 'b has no sidecar — added (new file)');
    assert.ok(!paths.includes('scripts/c.mjs.header.md'), 'c sidecar exists but not staged — not added');
  });

  test('sidecar already staged → still added (claim-check --extend deduplicates)', () => {
    // If the operator staged both source and sidecar, and the original claim
    // covers the source but not the sidecar, J5 should still extend to cover
    // the sidecar. claim-check --extend deduplicates on its end.
    const paths = resolveAutoExtendPaths({
      filesUserStaged: ['scripts/foo.mjs', 'scripts/foo.mjs.header.md'],
      ceremonyFiles: [],
      regenPaths: [],
      sidecarExists: mockSidecarExists('scripts/foo.mjs.header.md'),
    });
    assert.ok(
      paths.includes('scripts/foo.mjs.header.md'),
      'sidecar still added to extend list even when pre-staged',
    );
  });

  test('idempotency: resolving twice with same inputs gives no duplicates', () => {
    // Use a new (non-existent) sidecar so isNew=true → it IS added; verify
    // no duplicates across two calls.
    const opts = {
      filesUserStaged: ['scripts/new.mjs'],
      ceremonyFiles: [],
      regenPaths: [],
      sidecarExists: mockSidecarExists(), // sidecar does not exist → isNew
    };
    const paths1 = resolveAutoExtendPaths(opts);
    const paths2 = resolveAutoExtendPaths(opts);
    // No duplicates in a single call
    const sidecarCount = paths1.filter((p) => p === 'scripts/new.mjs.header.md').length;
    assert.equal(sidecarCount, 1, 'sidecar must appear exactly once');
    // Both calls produce identical output
    assert.deepStrictEqual(paths1, paths2, 'resolver output is deterministic');
  });

  test('Windows-style backslash staged path → sidecar resolved via forward slash', () => {
    // Sidecar does not exist (isNew=true) — tests that backslash normalization
    // works correctly for new files so the added path uses forward slashes.
    const paths = resolveAutoExtendPaths({
      filesUserStaged: ['scripts\\new-tool.mjs'],
      ceremonyFiles: [],
      regenPaths: [],
      sidecarExists: mockSidecarExists(), // sidecar does not exist
    });
    assert.ok(
      paths.includes('scripts/new-tool.mjs.header.md'),
      'sidecar resolved via forward slash even when source path used backslashes',
    );
  });
});

// ---------------------------------------------------------------------------
// Combined: ceremony files + sidecars in real scenario
// ---------------------------------------------------------------------------

describe('J5 auto-extend: combined scenario', () => {
  test('staged source + pre-staged CHANGELOG → ceremony files extended; existing sidecar not staged', () => {
    // Staging coa-merge.mjs and CHANGELOG.md. The sidecar exists but is not staged.
    // Expected: ceremony files (VERSION, package.json, CHANGELOG.md) all in extend
    // list. The existing-but-unstaged sidecar is NOT added (Bug 1 fix).
    const paths = resolveAutoExtendPaths({
      filesUserStaged: ['scripts/coa-merge.mjs', 'CHANGELOG.md'],
      sidecarExists: mockSidecarExists('scripts/coa-merge.mjs.header.md'),
    });
    assert.ok(paths.includes('CHANGELOG.md'), 'CHANGELOG.md extended (pre-staged ceremony)');
    assert.ok(paths.includes('VERSION'), 'VERSION extended (not staged)');
    assert.ok(paths.includes('package.json'), 'package.json extended (not staged)');
    assert.ok(
      !paths.includes('scripts/coa-merge.mjs.header.md'),
      'existing-but-unstaged sidecar must NOT be auto-added (Bug 1 fix)',
    );
  });

  test('staged new source (no sidecar on disk) + CHANGELOG → ceremony + new sidecar all extended', () => {
    // coa-new-tool.mjs is a brand-new file with no existing sidecar.
    // Expected: ceremony files + the new sidecar all in extend list.
    const paths = resolveAutoExtendPaths({
      filesUserStaged: ['scripts/coa-new-tool.mjs', 'CHANGELOG.md'],
      sidecarExists: mockSidecarExists(), // no sidecars on disk
    });
    assert.ok(paths.includes('CHANGELOG.md'), 'CHANGELOG.md extended');
    assert.ok(paths.includes('VERSION'), 'VERSION extended');
    assert.ok(paths.includes('package.json'), 'package.json extended');
    assert.ok(
      paths.includes('scripts/coa-new-tool.mjs.header.md'),
      'new sidecar auto-added (pre-commit hook will create it)',
    );
  });
});

// ---------------------------------------------------------------------------
// Bug 1 (ZVX-COA-MERGE-BACKPORT): existing-but-unstaged sidecars must NOT
// be added to the extend list (TPL-264)
// ---------------------------------------------------------------------------

describe('J5 auto-extend: Bug 1 — existing-but-unstaged sidecar excluded', () => {
  test('sidecar exists on disk but is NOT staged → not added to extend list', () => {
    // The sidecar exists (checkSidecar → true) but is not in filesUserStaged.
    // Old code: added it anyway (over-extension, pollutes claim + breaks auto-complete).
    // Fixed: skip it — only add when alreadyStaged OR isNew.
    const paths = resolveAutoExtendPaths({
      filesUserStaged: ['scripts/foo.mjs'],
      ceremonyFiles: [],
      regenPaths: [],
      sidecarExists: mockSidecarExists('scripts/foo.mjs.header.md'),
    });
    assert.ok(
      !paths.includes('scripts/foo.mjs.header.md'),
      'existing-but-unstaged sidecar must NOT be added to extend list',
    );
  });

  test('sidecar exists AND is staged → is added (operator explicitly staged it)', () => {
    const paths = resolveAutoExtendPaths({
      filesUserStaged: ['scripts/foo.mjs', 'scripts/foo.mjs.header.md'],
      ceremonyFiles: [],
      regenPaths: [],
      sidecarExists: mockSidecarExists('scripts/foo.mjs.header.md'),
    });
    assert.ok(
      paths.includes('scripts/foo.mjs.header.md'),
      'sidecar that is already staged must still be extended',
    );
  });

  test('sidecar does not exist on disk → added (new file, pre-commit will create it)', () => {
    const paths = resolveAutoExtendPaths({
      filesUserStaged: ['scripts/new-file.mjs'],
      ceremonyFiles: [],
      regenPaths: [],
      sidecarExists: mockSidecarExists(), // sidecar does not exist
    });
    assert.ok(
      paths.includes('scripts/new-file.mjs.header.md'),
      'non-existent sidecar must be added (pre-commit hook will create it)',
    );
  });
});

// ---------------------------------------------------------------------------
// Bug 2 (ZVX-COA-MERGE-BACKPORT): .json + ceremony files must not trigger
// sidecar detection (TPL-264)
// ---------------------------------------------------------------------------

describe('J5 auto-extend: Bug 2 — phantom sidecar targets excluded', () => {
  test('.json staged file does not trigger sidecar pair', () => {
    const paths = resolveAutoExtendPaths({
      filesUserStaged: ['some-config.json'],
      ceremonyFiles: [],
      regenPaths: [],
      sidecarExists: mockSidecarExists('some-config.json.header.md'),
    });
    assert.ok(
      !paths.includes('some-config.json.header.md'),
      '.json files must not trigger sidecar detection',
    );
  });

  test('ceremony file staged (package.json) does not trigger sidecar pair', () => {
    // package.json is a ceremony file AND non-header extension — both filters apply.
    const paths = resolveAutoExtendPaths({
      filesUserStaged: ['package.json'],
      ceremonyFiles: ['VERSION', 'package.json', 'CHANGELOG.md'],
      regenPaths: [],
      sidecarExists: mockSidecarExists('package.json.header.md'),
    });
    assert.ok(
      !paths.includes('package.json.header.md'),
      'ceremony file must not trigger sidecar detection',
    );
  });

  test('VERSION staged does not trigger sidecar pair', () => {
    const paths = resolveAutoExtendPaths({
      filesUserStaged: ['VERSION'],
      ceremonyFiles: ['VERSION', 'package.json', 'CHANGELOG.md'],
      regenPaths: [],
      sidecarExists: mockSidecarExists('VERSION.header.md'),
    });
    assert.ok(
      !paths.includes('VERSION.header.md'),
      'VERSION must not trigger sidecar detection',
    );
  });

  test('CHANGELOG.md staged triggers sidecar detection (it is .md, eligible extension)', () => {
    // CHANGELOG.md has extension .md which is header-eligible, BUT it is a
    // ceremony file — the ceremony exclusion must kick in and suppress it.
    const paths = resolveAutoExtendPaths({
      filesUserStaged: ['CHANGELOG.md'],
      ceremonyFiles: ['VERSION', 'package.json', 'CHANGELOG.md'],
      regenPaths: [],
      sidecarExists: mockSidecarExists('CHANGELOG.md.header.md'),
    });
    assert.ok(
      !paths.includes('CHANGELOG.md.header.md'),
      'CHANGELOG.md sidecar must be suppressed by ceremony exclusion',
    );
  });

  test('.mjs staged file (header-eligible) triggers sidecar pair normally', () => {
    const paths = resolveAutoExtendPaths({
      filesUserStaged: ['scripts/tool.mjs'],
      ceremonyFiles: [],
      regenPaths: [],
      sidecarExists: mockSidecarExists(), // sidecar doesn't exist → isNew
    });
    assert.ok(
      paths.includes('scripts/tool.mjs.header.md'),
      '.mjs source must trigger sidecar detection',
    );
  });
});
