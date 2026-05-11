/* @HEADER
 * @version 0.7.94 | 2026-05-05
 * @purpose Meta-test: assert CHANGELOG.md has no duplicate versioned section headings (C5 invariant, TPL-286).
 * @sidecar changelog-uniqueness.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Layer 6 meta-test for the C5 changelog version-uniqueness invariant (TPL-286).
 *
 * Reads the live CHANGELOG.md and asserts that no two `## [<version>]` headings
 * share the same version string. This test runs on every `node --test
 * tests/integration/` pass and catches regressions in layers 1-5 by failing
 * loudly whenever the actual artifact violates the invariant.
 *
 * Motivation: Cockpit AIC-DEV-140 (incident reference `81301ae1`) proved that a
 * single idempotency guard in changelog-release.mjs is insufficient when operators
 * or automation can edit CHANGELOG.md independently. This test is the last line of
 * defense: if any of layers 1-4 fail silently, this meta-test surfaces the
 * corruption on the next test run.
 *
 * SpecRefs: TPL-286
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '../../../');
const CHANGELOG_PATH = resolve(REPO_ROOT, 'CHANGELOG.md');

describe('C5 — CHANGELOG.md version-uniqueness invariant (TPL-286)', () => {
  it('CHANGELOG.md exists', () => {
    assert.ok(existsSync(CHANGELOG_PATH), `CHANGELOG.md not found at ${CHANGELOG_PATH}`);
  });

  it('no two ## [<version>] headings share the same version string', () => {
    const text = readFileSync(CHANGELOG_PATH, 'utf8');
    const lines = text.split('\n');

    const seen = new Map(); // version -> line numbers[]
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^##\s+\[([^\]]+)\]/);
      if (m && m[1] !== 'Unreleased') {
        const version = m[1];
        if (!seen.has(version)) {
          seen.set(version, [i + 1]);
        } else {
          seen.get(version).push(i + 1);
        }
      }
    }

    const duplicates = [];
    for (const [version, lineNums] of seen) {
      if (lineNums.length > 1) {
        duplicates.push(`  ## [${version}] at lines ${lineNums.join(', ')}`);
      }
    }

    assert.equal(
      duplicates.length,
      0,
      [
        'CHANGELOG.md contains duplicate versioned section headings (C5 invariant violated):',
        ...duplicates,
        '',
        'Recovery:',
        '  1. Remove the older duplicate section manually',
        '  2. Or run: git restore CHANGELOG.md',
        '     then re-release: node scripts/checks/changelog-release.mjs --version=<N>',
      ].join('\n'),
    );
  });

  it('all versioned sections are in the expected ## [<version>] format', () => {
    const text = readFileSync(CHANGELOG_PATH, 'utf8');
    const lines = text.split('\n');
    const malformed = [];
    for (let i = 0; i < lines.length; i++) {
      // Check lines that start with "## [" but do not match the expected format
      if (lines[i].startsWith('## [') && !lines[i].match(/^##\s+\[([^\]]+)\]/)) {
        malformed.push(`  line ${i + 1}: ${lines[i]}`);
      }
    }
    assert.equal(
      malformed.length,
      0,
      `CHANGELOG.md contains malformed section headings:\n${malformed.join('\n')}`,
    );
  });
});
