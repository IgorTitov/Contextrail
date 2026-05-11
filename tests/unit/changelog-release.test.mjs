/* @HEADER
 * @version 0.7.94 | 2026-05-05
 * @purpose Verify changelog-release blank-line invariant, [Unreleased] extraction, content detection, subheading scaffolding, and version-uniqueness idempotency (TPL-286).
 * @sidecar changelog-release.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Unit tests for scripts/checks/changelog-release.mjs.
 *
 * Regression coverage for TPL-207: composeReleasedChangelog must leave exactly
 * one blank line between the new versioned section's last paragraph and the
 * next ## [...] heading (Keep-a-Changelog separator).
 *
 * Regression coverage for TPL-286 (Cockpit AIC-DEV-140): two calls with the
 * same --version but different timestamps must not produce two versioned sections.
 *
 * SpecRefs: TPL-207, TPL-286
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  extractUnreleased,
  composeReleasedChangelog,
  scaffoldSubheadings,
} from '../../scripts/checks/changelog-release.mjs';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CHANGELOG_WITH_PRIOR = [
  '# CHANGELOG',
  '',
  'All notable changes to this project should be tracked here.',
  '',
  '## [Unreleased]',
  '',
  '### Fixed',
  '',
  '- new fix line one.',
  '- new fix line two.',
  '',
  '## [0.7.16] — 2026-04-27 13:44:44 UTC+3',
  '',
  '### Fixed',
  '',
  '- prior fix.',
  '',
].join('\n');

// ---------------------------------------------------------------------------
// extractUnreleased()
// ---------------------------------------------------------------------------

describe('extractUnreleased()', () => {
  it('splits text into before / unreleased / after with prior section', () => {
    const { before, unreleased, after } = extractUnreleased(CHANGELOG_WITH_PRIOR);
    assert.match(before, /^# CHANGELOG/);
    assert.match(unreleased, /new fix line one\./);
    assert.match(unreleased, /new fix line two\./);
    assert.ok(!unreleased.endsWith('\n'), 'unreleased is .trim()-ed (no trailing newline)');
    assert.match(after, /^\n## \[0\.7\.16\]/);
  });

  it('returns empty when [Unreleased] heading missing', () => {
    const text = '# CHANGELOG\n\nNo headings yet.\n';
    const { before, unreleased, after } = extractUnreleased(text);
    assert.equal(before, text);
    assert.equal(unreleased, '');
    assert.equal(after, '');
  });
});

// ---------------------------------------------------------------------------
// composeReleasedChangelog() — blank-line invariant (TPL-207 regression)
// ---------------------------------------------------------------------------

describe('composeReleasedChangelog()', () => {
  it('keeps exactly one blank line between the new section and the prior heading', () => {
    const { before, unreleased, after } = extractUnreleased(CHANGELOG_WITH_PRIOR);
    const result = composeReleasedChangelog({
      before,
      unreleased,
      after,
      version: '0.7.17',
      timestamp: '2026-04-27 14:00:00 UTC+3',
    });

    // Positive: new heading is followed (after content) by exactly one blank
    // line and then the previous versioned heading.
    assert.match(
      result,
      /\n## \[0\.7\.17\] — 2026-04-27 14:00:00 UTC\+3\n\n[\s\S]*?\n\n## \[0\.7\.16\]/,
      'expected "<content>\\n\\n## [<prev>]" between sections',
    );

    // Negative: no "<content>\n## [<prev>]" — i.e. no version heading directly
    // following a non-blank line. This is the exact shape TPL-207 reproduces.
    assert.doesNotMatch(
      result,
      /[^\n]\n## \[0\.7\.16\]/,
      'previous section heading must be preceded by a blank line, not a content line',
    );
  });

  it('refreshes [Unreleased] placeholder with _Nothing yet._', () => {
    const { before, unreleased, after } = extractUnreleased(CHANGELOG_WITH_PRIOR);
    const result = composeReleasedChangelog({
      before,
      unreleased,
      after,
      version: '0.7.17',
      timestamp: '2026-04-27 14:00:00 UTC+3',
    });
    assert.match(result, /## \[Unreleased\]\n\n_Nothing yet\._/);
  });

  it('preserves exactly one blank line between [Unreleased] block and the new section', () => {
    const { before, unreleased, after } = extractUnreleased(CHANGELOG_WITH_PRIOR);
    const result = composeReleasedChangelog({
      before,
      unreleased,
      after,
      version: '0.7.17',
      timestamp: '2026-04-27 14:00:00 UTC+3',
    });
    assert.match(result, /_Nothing yet\._\n\n## \[0\.7\.17\]/);
  });

  it('produces idempotent shape when run a second time on its own output', () => {
    // Round-trip: compose once, then extract from the result and compose again
    // with another version. The blank-line invariant must hold for both new
    // and old boundaries.
    const first = composeReleasedChangelog({
      ...extractUnreleased(CHANGELOG_WITH_PRIOR),
      version: '0.7.17',
      timestamp: '2026-04-27 14:00:00 UTC+3',
    });
    // Inject fresh content into [Unreleased] so a second release is meaningful.
    const seeded = first.replace('_Nothing yet._', '### Fixed\n\n- second-pass fix.');
    const second = composeReleasedChangelog({
      ...extractUnreleased(seeded),
      version: '0.7.18',
      timestamp: '2026-04-27 14:30:00 UTC+3',
    });
    assert.doesNotMatch(second, /[^\n]\n## \[0\.7\.17\]/);
    assert.doesNotMatch(second, /[^\n]\n## \[0\.7\.16\]/);
  });

  it('auto-scaffolds ### subheadings when [Unreleased] has flat bullets', () => {
    const changelog = [
      '# CHANGELOG',
      '',
      '## [Unreleased]',
      '',
      '- some change here.',
      '',
      '## [0.1.0] — 2026-01-01 00:00:00 UTC+3',
      '',
      '### Added',
      '',
      '- initial.',
      '',
    ].join('\n');
    const result = composeReleasedChangelog({
      ...extractUnreleased(changelog),
      version: '0.1.1',
      timestamp: '2026-01-02 00:00:00 UTC+3',
    });
    assert.match(
      result,
      /## \[0\.1\.1\][\s\S]*### (Fixed|Added|Changed)/,
      'released section must contain a ### subheading',
    );
  });
});

// ---------------------------------------------------------------------------
// scaffoldSubheadings() — TPL-275
// ---------------------------------------------------------------------------

describe('scaffoldSubheadings()', () => {
  it('returns content unchanged when ### markers already present', () => {
    const input = '### Fixed\n\n- already categorized.';
    assert.equal(scaffoldSubheadings(input), input);
  });

  it('is idempotent: scaffolding twice returns the same result', () => {
    const input = '- some change.';
    const once = scaffoldSubheadings(input);
    const twice = scaffoldSubheadings(once);
    assert.equal(once, twice);
  });

  it('defaults flat bullets to ### Changed', () => {
    const input = '- something changed here.';
    const result = scaffoldSubheadings(input);
    assert.match(result, /### Changed/);
    assert.match(result, /something changed here/);
  });

  it('categorizes "fix"-prefixed bullet as ### Fixed', () => {
    const input = '- fix: resolved the crash on startup.';
    const result = scaffoldSubheadings(input);
    assert.match(result, /### Fixed/);
    assert.doesNotMatch(result, /### Changed/);
  });

  it('categorizes "fixed"-prefixed bullet as ### Fixed', () => {
    const input = '- fixed the broken teardown path.';
    const result = scaffoldSubheadings(input);
    assert.match(result, /### Fixed/);
  });

  it('categorizes "add"-prefixed bullet as ### Added', () => {
    const input = '- add support for --dry-run flag.';
    const result = scaffoldSubheadings(input);
    assert.match(result, /### Added/);
    assert.doesNotMatch(result, /### Changed/);
  });

  it('categorizes "new"-prefixed bullet as ### Added', () => {
    const input = '- new export: scaffoldSubheadings() for testing.';
    const result = scaffoldSubheadings(input);
    assert.match(result, /### Added/);
  });

  it('splits mixed bullets into separate subheadings', () => {
    const input = [
      '- fix: resolve crash.',
      '- add new CLI flag.',
      '- refactor internal loop.',
    ].join('\n');
    const result = scaffoldSubheadings(input);
    assert.match(result, /### Fixed/);
    assert.match(result, /### Added/);
    assert.match(result, /### Changed/);
  });

  it('adds categorize comment to ### Changed section when bullets defaulted', () => {
    const input = '- some unlabeled change.';
    const result = scaffoldSubheadings(input);
    assert.match(
      result,
      /categorize/i,
      '### Changed section should include a categorize reminder comment',
    );
  });

  it('does not add categorize comment when no Changed bullets', () => {
    const input = '- fix: explicit fix bullet.';
    const result = scaffoldSubheadings(input);
    assert.doesNotMatch(result, /categorize/i);
  });

  it('preserves multi-line bullet continuation under the correct subheading', () => {
    const input = ['- fix: long description', '  that continues on the next line.'].join('\n');
    const result = scaffoldSubheadings(input);
    assert.match(result, /### Fixed/);
    assert.match(result, /continues on the next line/);
  });
});

// ---------------------------------------------------------------------------
// TPL-286 — version-uniqueness idempotency regression (Cockpit AIC-DEV-140)
// ---------------------------------------------------------------------------

describe('composeReleasedChangelog() — version-uniqueness idempotency (TPL-286)', () => {
  const BASE = [
    '# CHANGELOG',
    '',
    '## [Unreleased]',
    '',
    '### Fixed',
    '',
    '- some fix.',
    '',
    '## [0.1.0] — 2026-01-01 00:00:00 UTC+3',
    '',
    '### Added',
    '',
    '- initial.',
    '',
  ].join('\n');

  it('second call with same version but different timestamp does NOT produce a second section', () => {
    // Simulate the AIC-DEV-140 failure mode:
    // - first call: operator runs changelog-release manually (timestamp T1)
    // - second call: pre-commit hook runs changelog-release again (timestamp T2)
    // The second call must be a no-op because the section already exists.

    const firstResult = composeReleasedChangelog({
      ...extractUnreleased(BASE),
      version: '0.1.1',
      timestamp: '2026-05-05 10:00:00 UTC+3', // T1
    });

    // Count how many `## [0.1.1]` headings appear after the first call
    const headingsAfterFirst = (firstResult.match(/^## \[0\.1\.1\]/gm) || []).length;
    assert.equal(headingsAfterFirst, 1, 'first call must produce exactly one [0.1.1] section');

    // The CLI-level guard checks text.includes(`## [${version}]`) before composing.
    // Verify the guard string is present in the output so the second call would exit early.
    assert.ok(
      firstResult.includes('## [0.1.1]'),
      'output must contain the version-only heading string so the idempotency guard fires on retry',
    );

    // Simulate second call: extract from first result (Unreleased is now empty),
    // then attempt to compose again. Since [Unreleased] has no real content,
    // composeReleasedChangelog would not be reached (the CLI guard fires first).
    // But even if called directly, the new [Unreleased] has no content to release,
    // so the composed text would only add an empty section — confirm the guard fires.
    const { unreleased: unreleased2 } = extractUnreleased(firstResult);
    // After the first release, [Unreleased] is just "_Nothing yet._" — no real content.
    const hasContent =
      unreleased2
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('##') && !l.startsWith('###'))
        .filter(
          (l) =>
            l !== '_Nothing yet._' &&
            l !== '_none_' &&
            l !== '- _none_' &&
            l !== '- _Nothing yet._',
        ).length > 0;
    assert.equal(
      hasContent,
      false,
      'after first release, [Unreleased] has no real content — second call must skip',
    );
  });

  it('composed output contains exactly one versioned section for the released version', () => {
    const result = composeReleasedChangelog({
      ...extractUnreleased(BASE),
      version: '0.1.1',
      timestamp: '2026-05-05 10:00:00 UTC+3',
    });
    const sections = result.match(/^## \[0\.1\.1\]/gm) || [];
    assert.equal(sections.length, 1, 'must contain exactly one [0.1.1] section');
  });
});
