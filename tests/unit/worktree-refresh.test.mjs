/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit tests for scripts/lib/worktree-refresh.mjs — classifyDiff() must distinguish stamp-only header residue from real WIP across every diff shape the repo can produce.
 * @sidecar worktree-refresh.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyDiff,
  parseHunkHeader,
  SLIM_HEADER_RANGE,
} from '../../scripts/lib/worktree-refresh.mjs';

// ---------------------------------------------------------------------------
// Pure unit tests — no filesystem, no git. The classifier consumes a string
// and returns one of three verdicts. These tests pin every edge case
// listed in the R4 spec so weakening the classifier fails CI.
// ---------------------------------------------------------------------------

describe('parseHunkHeader', () => {
  test('parses standard "@@ -A,B +C,D @@" form', () => {
    assert.deepEqual(parseHunkHeader('@@ -1,5 +1,5 @@'), {
      oldStart: 1, oldCount: 5, newStart: 1, newCount: 5,
    });
  });

  test('parses single-line "@@ -A +B @@" form (count defaults to 1)', () => {
    assert.deepEqual(parseHunkHeader('@@ -2 +2 @@'), {
      oldStart: 2, oldCount: 1, newStart: 2, newCount: 1,
    });
  });

  test('returns null for malformed headers', () => {
    assert.equal(parseHunkHeader('not a hunk'), null);
    assert.equal(parseHunkHeader('@@ malformed @@'), null);
    assert.equal(parseHunkHeader(''), null);
  });

  test('SLIM_HEADER_RANGE is 10 lines (matches ADR-0009 slim header + grace)', () => {
    assert.equal(SLIM_HEADER_RANGE, 10);
  });
});

describe('classifyDiff — basic shapes', () => {
  test('empty diff returns no-diff', () => {
    assert.equal(classifyDiff(''), 'no-diff');
    assert.equal(classifyDiff('   \n  \n'), 'no-diff');
  });

  test('non-string input returns no-diff (defensive)', () => {
    assert.equal(classifyDiff(undefined), 'no-diff');
    assert.equal(classifyDiff(null), 'no-diff');
    assert.equal(classifyDiff(0), 'no-diff');
  });
});

describe('classifyDiff — stamp-only verdicts', () => {
  test('single @version line bump (JS slim header) → stamp-only', () => {
    const diff = [
      'diff --git a/foo.mjs b/foo.mjs',
      'index aaaa..bbbb 100644',
      '--- a/foo.mjs',
      '+++ b/foo.mjs',
      '@@ -1,5 +1,5 @@',
      ' /* @HEADER',
      '- * @version 0.7.36 | 2026-04-28',
      '+ * @version 0.7.37 | 2026-04-29',
      '  * @purpose Hello world',
      '  * @sidecar foo.mjs.header.md',
      ' */',
    ].join('\n');
    assert.equal(classifyDiff(diff), 'stamp-only');
  });

  test('single @version line bump in markdown sidecar → stamp-only', () => {
    const diff = [
      'diff --git a/foo.md b/foo.md',
      '--- a/foo.md',
      '+++ b/foo.md',
      '@@ -1,4 +1,4 @@',
      ' <!-- @HEADER',
      '-@version 0.7.36 | 2026-04-28',
      '+@version 0.7.37 | 2026-04-29',
      ' @purpose Doc',
      ' -->',
    ].join('\n');
    assert.equal(classifyDiff(diff), 'stamp-only');
  });

  test('@version bump in shell hook (# prefix) → stamp-only', () => {
    const diff = [
      '--- a/.githooks/pre-commit',
      '+++ b/.githooks/pre-commit',
      '@@ -1,4 +1,4 @@',
      ' # @HEADER',
      '-# @version 0.7.36 | 2026-04-28',
      '+# @version 0.7.37 | 2026-04-29',
      ' # @purpose Run validation',
      ' # @sidecar pre-commit.header.md',
    ].join('\n');
    assert.equal(classifyDiff(diff), 'stamp-only');
  });

  test('two @version stamps in same first-10-line window → stamp-only', () => {
    // Some headers have a duplicated stamp (rare, defensive). Both stamps
    // are inside the slim window and both removed/added pairs match.
    const diff = [
      '--- a/foo.mjs',
      '+++ b/foo.mjs',
      '@@ -1,8 +1,8 @@',
      ' /* @HEADER',
      '- * @version 0.7.36 | 2026-04-28',
      '+ * @version 0.7.37 | 2026-04-29',
      '  * @purpose Hello',
      '  * @sidecar foo.mjs.header.md',
      ' */',
      ' // duplicate stamp inside grace window',
      '- * @version 0.7.36 | 2026-04-28',
      '+ * @version 0.7.37 | 2026-04-29',
    ].join('\n');
    assert.equal(classifyDiff(diff), 'stamp-only');
  });
});

describe('classifyDiff — has-logic verdicts (must preserve)', () => {
  test('@version + non-stamp line in same hunk → has-logic', () => {
    const diff = [
      '--- a/foo.mjs',
      '+++ b/foo.mjs',
      '@@ -1,5 +1,5 @@',
      ' /* @HEADER',
      '- * @version 0.7.36 | 2026-04-28',
      '+ * @version 0.7.37 | 2026-04-29',
      '- * @purpose Old purpose',
      '+ * @purpose New purpose',
      ' */',
    ].join('\n');
    assert.equal(classifyDiff(diff), 'has-logic');
  });

  test('non-stamp line only → has-logic', () => {
    const diff = [
      '--- a/foo.mjs',
      '+++ b/foo.mjs',
      '@@ -10,3 +10,3 @@',
      ' export function helper() {',
      '-  return 1;',
      '+  return 2;',
      ' }',
    ].join('\n');
    assert.equal(classifyDiff(diff), 'has-logic');
  });

  test('hunk reaching past line 10 with @version change → has-logic', () => {
    // The stamp text matches but the hunk's new-side window ends at
    // line 50, far past SLIM_HEADER_RANGE. Conservatively preserved.
    const diff = [
      '--- a/foo.mjs',
      '+++ b/foo.mjs',
      '@@ -45,5 +45,5 @@',
      ' some context',
      '- * @version 0.7.36 | 2026-04-28',
      '+ * @version 0.7.37 | 2026-04-29',
      ' more context',
      ' more',
    ].join('\n');
    assert.equal(classifyDiff(diff), 'has-logic');
  });

  test('mixed: one @version pair + one logic block → has-logic', () => {
    const diff = [
      '--- a/foo.mjs',
      '+++ b/foo.mjs',
      '@@ -1,5 +1,5 @@',
      ' /* @HEADER',
      '- * @version 0.7.36 | 2026-04-28',
      '+ * @version 0.7.37 | 2026-04-29',
      '  * @purpose Hello',
      '  * @sidecar foo.mjs.header.md',
      ' */',
      '@@ -20,3 +20,3 @@',
      ' export function helper() {',
      '-  return 1;',
      '+  return 2;',
      ' }',
    ].join('\n');
    assert.equal(classifyDiff(diff), 'has-logic');
  });

  test('whitespace-only changes → has-logic (conservative — preserve)', () => {
    const diff = [
      '--- a/foo.mjs',
      '+++ b/foo.mjs',
      '@@ -1,3 +1,3 @@',
      ' line one',
      '-  line two with trailing spaces  ',
      '+  line two with trailing spaces',
      ' line three',
    ].join('\n');
    assert.equal(classifyDiff(diff), 'has-logic');
  });

  test('line-ending CRLF→LF changes → has-logic (conservative)', () => {
    // Simulated: the +/- lines look identical visually but the diff
    // records them as a paired change. The classifier sees neither
    // matches @version, so stamps to has-logic.
    const diff = [
      '--- a/foo.mjs',
      '+++ b/foo.mjs',
      '@@ -1,2 +1,2 @@',
      '-some text\r',
      '+some text',
      ' other line',
    ].join('\n');
    assert.equal(classifyDiff(diff), 'has-logic');
  });

  test('pure addition of @version line (header insert) → has-logic', () => {
    // No paired removal — a brand-new header was added. That's a real
    // edit, not stamp residue. Preserve.
    const diff = [
      '--- a/foo.mjs',
      '+++ b/foo.mjs',
      '@@ -1,3 +1,4 @@',
      '+/* @HEADER',
      '+ * @version 0.7.37 | 2026-04-29',
      '+ */',
      ' export const x = 1;',
    ].join('\n');
    assert.equal(classifyDiff(diff), 'has-logic');
  });

  test('pure deletion of @version line → has-logic', () => {
    const diff = [
      '--- a/foo.mjs',
      '+++ b/foo.mjs',
      '@@ -1,3 +1,2 @@',
      '-/* @HEADER',
      '- * @version 0.7.37 | 2026-04-29',
      '- */',
      ' export const x = 1;',
    ].join('\n');
    assert.equal(classifyDiff(diff), 'has-logic');
  });

  test('rename diff → has-logic (real intent)', () => {
    const diff = [
      'diff --git a/foo.mjs b/bar.mjs',
      'similarity index 100%',
      'rename from foo.mjs',
      'rename to bar.mjs',
    ].join('\n');
    assert.equal(classifyDiff(diff), 'has-logic');
  });

  test('mode-change diff → has-logic', () => {
    const diff = [
      'diff --git a/run.sh b/run.sh',
      'old mode 100644',
      'new mode 100755',
    ].join('\n');
    assert.equal(classifyDiff(diff), 'has-logic');
  });

  test('binary-diff sentinel → has-logic', () => {
    const diff = [
      'diff --git a/img.png b/img.png',
      'Binary files a/img.png and b/img.png differ',
    ].join('\n');
    assert.equal(classifyDiff(diff), 'has-logic');
  });

  test('malformed hunk header → has-logic', () => {
    const diff = [
      '--- a/foo.mjs',
      '+++ b/foo.mjs',
      '@@ broken hunk header @@',
      '- * @version 0.7.36 | 2026-04-28',
      '+ * @version 0.7.37 | 2026-04-29',
    ].join('\n');
    assert.equal(classifyDiff(diff), 'has-logic');
  });

  test('imbalanced removed/added counts (2 removed, 1 added) → has-logic', () => {
    const diff = [
      '--- a/foo.mjs',
      '+++ b/foo.mjs',
      '@@ -1,4 +1,3 @@',
      ' /* @HEADER',
      '- * @version 0.7.36 | 2026-04-28',
      '- * @version 0.7.36 | 2026-04-28',
      '+ * @version 0.7.37 | 2026-04-29',
      ' */',
    ].join('\n');
    assert.equal(classifyDiff(diff), 'has-logic');
  });
});

describe('classifyDiff — boundary behavior', () => {
  test('hunk ending exactly at SLIM_HEADER_RANGE → stamp-only', () => {
    // newStart=1, newCount=10 → ends at line 10 (inclusive). On the
    // boundary, classifier accepts.
    const lines = [
      '--- a/foo.mjs',
      '+++ b/foo.mjs',
      '@@ -1,10 +1,10 @@',
      ' /* @HEADER',
      '- * @version 0.7.36 | 2026-04-28',
      '+ * @version 0.7.37 | 2026-04-29',
      '  * @purpose Hello',
      '  * @sidecar foo.mjs.header.md',
      '  * @layer x | @hex _none_ | @ctx _none_',
      '  * @public false',
      '  * @edit careful',
      '  */',
      ' const x = 1;',
      ' const y = 2;',
    ];
    assert.equal(classifyDiff(lines.join('\n')), 'stamp-only');
  });

  test('hunk ending one line past SLIM_HEADER_RANGE → has-logic', () => {
    // newStart=1, newCount=11 → ends at line 11. Past boundary.
    const lines = [
      '--- a/foo.mjs',
      '+++ b/foo.mjs',
      '@@ -1,11 +1,11 @@',
      ' /* @HEADER',
      '- * @version 0.7.36 | 2026-04-28',
      '+ * @version 0.7.37 | 2026-04-29',
      '  * @purpose Hello',
      '  * @sidecar foo.mjs.header.md',
      '  * @layer x | @hex _none_ | @ctx _none_',
      '  * @public false',
      '  * @edit careful',
      '  */',
      ' const x = 1;',
      ' const y = 2;',
      ' const z = 3;',
    ];
    assert.equal(classifyDiff(lines.join('\n')), 'has-logic');
  });

  test('non-empty diff with no hunks (metadata only) → has-logic', () => {
    const diff = [
      'diff --git a/foo.mjs b/foo.mjs',
      'index aaaa..bbbb 100644',
    ].join('\n');
    assert.equal(classifyDiff(diff), 'has-logic');
  });

  test('@version with malformed version string does not match stamp regex → has-logic', () => {
    // The version part is "0.7" not "0.7.37" — fails the X.Y.Z check.
    const diff = [
      '--- a/foo.mjs',
      '+++ b/foo.mjs',
      '@@ -1,3 +1,3 @@',
      ' /* @HEADER',
      '- * @version 0.7 | 2026-04-28',
      '+ * @version 0.8 | 2026-04-29',
    ].join('\n');
    assert.equal(classifyDiff(diff), 'has-logic');
  });

  test('@version with date-only change keeps stamp-only verdict', () => {
    // Version stayed the same, only the date moved (rare but valid).
    const diff = [
      '--- a/foo.mjs',
      '+++ b/foo.mjs',
      '@@ -1,3 +1,3 @@',
      ' /* @HEADER',
      '- * @version 0.7.37 | 2026-04-28',
      '+ * @version 0.7.37 | 2026-04-29',
      ' */',
    ].join('\n');
    assert.equal(classifyDiff(diff), 'stamp-only');
  });
});
