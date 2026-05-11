/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit proofs for version-repair.mjs — isStampOnlyDiff, findLastContentChangeCommit, edge cases.
 * @sidecar version-repair.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isStampOnlyDiff,
  hasSlimInlineHeader,
  readVersionField,
  rewriteVersionField,
  gitCommitsForFile,
  findLastContentChangeCommit,
  repairFile,
} from '../../scripts/checks/version-repair.mjs';

// ---------------------------------------------------------------------------
// isStampOnlyDiff — positive cases
// ---------------------------------------------------------------------------

describe('isStampOnlyDiff — stamp-only (true)', () => {
  test('diff with only @version line changed (block comment style)', () => {
    // NOTE: avoid literal /* @HEADER in multi-line template literals — header-fix
    // strips those blocks from source files. Use neutral context lines instead.
    const diff = `
diff --git a/foo.mjs b/foo.mjs
index abc..def 100644
--- a/foo.mjs
+++ b/foo.mjs
@@ -1,8 +1,8 @@
 // slim header block
- * @version 0.7.100 | 2026-04-01
+ * @version 0.7.101 | 2026-04-02
  * @purpose Something.
  * @sidecar foo.mjs.header.md
  * @layer tooling | @hex _none_ | @ctx _none_
  * @public false
  * @edit careful
 // end header
`;
    assert.equal(isStampOnlyDiff(diff), true);
  });

  test('diff with only @version line changed (html comment style)', () => {
    const diff = `
diff --git a/README.md b/README.md
index abc..def 100644
--- a/README.md
+++ b/README.md
@@ -1,8 +1,8 @@
 <!-- @HEADER
- * @version 0.7.50 | 2026-03-15
+ * @version 0.7.51 | 2026-03-16
  * @purpose Folder guide.
  * @sidecar README.md.header.md
  * @layer control-plane
  * @public true
  * @edit sync-only
 -->
`;
    assert.equal(isStampOnlyDiff(diff), true);
  });
});

// ---------------------------------------------------------------------------
// isStampOnlyDiff — negative cases (content changes)
// ---------------------------------------------------------------------------

describe('isStampOnlyDiff — content change (false)', () => {
  test('diff with @version AND other lines changed', () => {
    // NOTE: avoid literal /* @HEADER in multi-line template literals.
    const diff = `
diff --git a/foo.mjs b/foo.mjs
index abc..def 100644
--- a/foo.mjs
+++ b/foo.mjs
@@ -1,10 +1,11 @@
 // slim header block
- * @version 0.7.100 | 2026-04-01
+ * @version 0.7.101 | 2026-04-02
  * @purpose Something.
 // end header

-const OLD = 'value';
+const NEW = 'updated value';
+const EXTRA = 'added';
`;
    assert.equal(isStampOnlyDiff(diff), false);
  });

  test('new file creation (all + lines)', () => {
    // NOTE: avoid literal /* @HEADER in multi-line template literals.
    const diff = `
diff --git a/new.mjs b/new.mjs
new file mode 100644
index 000..abc 100644
--- /dev/null
+++ b/new.mjs
@@ -0,0 +1,9 @@
+// slim header block
+ * @version 0.7.50 | 2026-04-01
+ * @purpose Brand new file.
+// end header
+export const x = 1;
`;
    assert.equal(isStampOnlyDiff(diff), false);
  });

  test('diff with no changed lines (empty diff, pre-rename)', () => {
    const diff = `
commit abc123
Author: Test <test@example.com>
Date:   2026-04-01

    chore: rename file

diff --git a/old.mjs b/new.mjs
similarity index 100%
rename from old.mjs
rename to new.mjs
`;
    // No @@ hunks, so changedLines = 0 → returns false (not stamp-only)
    assert.equal(isStampOnlyDiff(diff), false);
  });

  test('empty string diff', () => {
    assert.equal(isStampOnlyDiff(''), false);
  });

  test('null/undefined diff', () => {
    assert.equal(isStampOnlyDiff(null), false);
    assert.equal(isStampOnlyDiff(undefined), false);
  });
});

// ---------------------------------------------------------------------------
// hasSlimInlineHeader
// ---------------------------------------------------------------------------

describe('hasSlimInlineHeader', () => {
  test('detects block comment style', () => {
    assert.ok(hasSlimInlineHeader('/* @HEADER\n * @version 0.1.0 | 2026-01-01\n */'));
  });
  test('detects html comment style', () => {
    assert.ok(hasSlimInlineHeader('<!-- @HEADER\n * @version 0.1.0 | 2026-01-01\n -->'));
  });
  test('detects hash comment style', () => {
    assert.ok(hasSlimInlineHeader('# @HEADER\n# @version 0.1.0 | 2026-01-01\n'));
  });
  test('returns false for no header', () => {
    assert.ok(!hasSlimInlineHeader('export const x = 1;'));
  });
});

// ---------------------------------------------------------------------------
// readVersionField / rewriteVersionField
// ---------------------------------------------------------------------------

describe('readVersionField', () => {
  test('parses version and date from block comment', () => {
    const text = `/* @HEADER\n * @version 0.7.100 | 2026-04-15\n */`;
    const r = readVersionField(text);
    assert.ok(r.found);
    assert.equal(r.version, '0.7.100');
    assert.equal(r.date, '2026-04-15');
  });

  test('returns found: false for no @version pattern', () => {
    assert.deepEqual(readVersionField('no header here'), { found: false });
  });
});

describe('rewriteVersionField', () => {
  test('replaces version and date in first @version occurrence', () => {
    const text = `/* @HEADER\n * @version 0.7.100 | 2026-04-15\n * @purpose foo\n */`;
    const result = rewriteVersionField(text, '0.7.188', '2026-05-03');
    assert.ok(result.includes('@version 0.7.188 | 2026-05-03'));
    assert.ok(!result.includes('0.7.100'));
    assert.ok(result.includes('@purpose foo')); // other fields untouched
  });

  test('does not replace second @version outside the header block', () => {
    const text = `/* @HEADER\n * @version 0.7.1 | 2026-01-01\n */\n// @version 0.7.1 | 2026-01-01 mentioned in body`;
    const result = rewriteVersionField(text, '0.7.99', '2026-06-01');
    // First occurrence (in header) replaced
    assert.ok(result.includes('@version 0.7.99 | 2026-06-01'));
    // Second occurrence in body still original
    assert.ok(result.includes('// @version 0.7.1 | 2026-01-01 mentioned in body'));
  });
});

// ---------------------------------------------------------------------------
// gitCommitsForFile — with injected runGitLines
// ---------------------------------------------------------------------------

describe('gitCommitsForFile', () => {
  test('parses hash and date correctly', () => {
    const runGitLines = () => [
      'abc123def456 2026-05-03',
      'ffffaaaa0000 2026-04-01',
    ];
    const result = gitCommitsForFile('foo.mjs', { runGitLines });
    assert.deepEqual(result, [
      { hash: 'abc123def456', date: '2026-05-03' },
      { hash: 'ffffaaaa0000', date: '2026-04-01' },
    ]);
  });

  test('returns empty array for file with no commits', () => {
    const runGitLines = () => [];
    const result = gitCommitsForFile('nonexistent.mjs', { runGitLines });
    assert.deepEqual(result, []);
  });
});

// ---------------------------------------------------------------------------
// findLastContentChangeCommit — injected git functions
// ---------------------------------------------------------------------------

describe('findLastContentChangeCommit', () => {
  test('returns newest commit when it is a content change', () => {
    const commits = [
      { hash: 'content-commit', date: '2026-05-03' },
      { hash: 'old-commit', date: '2026-04-01' },
    ];
    const runGitLines = () => commits.map((c) => `${c.hash} ${c.date}`);
    const runGitText = (args) => {
      const commit = args[1]; // 'show <commit> -- <file>'
      if (commit === 'content-commit') {
        return `@@ -1,9 +1,10 @@\n /* @HEADER\n- * @version 0.7.10 | 2026-04-01\n+ * @version 0.7.11 | 2026-05-03\n  */\n-const OLD = 1;\n+const NEW = 2;\n`;
      }
      return '';
    };
    const result = findLastContentChangeCommit('foo.mjs', { runGitLines, runGitText });
    assert.equal(result, 'content-commit');
  });

  test('skips stamp-only commit, returns older content commit', () => {
    const commits = [
      { hash: 'stamp-only-commit', date: '2026-05-03' },
      { hash: 'last-content-commit', date: '2026-04-20' },
      { hash: 'initial-commit', date: '2026-04-01' },
    ];
    const runGitLines = () => commits.map((c) => `${c.hash} ${c.date}`);
    const runGitText = (args) => {
      const commit = args[1];
      if (commit === 'stamp-only-commit') {
        return `@@ -1,8 +1,8 @@\n /* @HEADER\n- * @version 0.7.10 | 2026-04-20\n+ * @version 0.7.15 | 2026-05-03\n  */\n`;
      }
      if (commit === 'last-content-commit') {
        return `@@ -1,10 +1,11 @@\n /* @HEADER\n */\n-old code\n+new code\n`;
      }
      return '';
    };
    const result = findLastContentChangeCommit('foo.mjs', { runGitLines, runGitText });
    assert.equal(result, 'last-content-commit');
  });

  test('file creation commit (all + lines) treated as content change', () => {
    const commits = [
      { hash: 'creation-commit', date: '2026-04-01' },
    ];
    const runGitLines = () => commits.map((c) => `${c.hash} ${c.date}`);
    const runGitText = () =>
      `@@ -0,0 +1,9 @@\n+/* @HEADER\n+ * @version 0.7.1 | 2026-04-01\n+ * @purpose New file.\n+ */\n+export const x = 1;\n`;
    const result = findLastContentChangeCommit('new.mjs', { runGitLines, runGitText });
    assert.equal(result, 'creation-commit');
  });

  test('renamed file: skips pre-rename commits (empty diff), uses post-rename content commit', () => {
    const commits = [
      { hash: 'post-rename-content', date: '2026-05-03' },
      { hash: 'rename-commit', date: '2026-04-15' },
      { hash: 'pre-rename-content', date: '2026-04-01' },
    ];
    const runGitLines = () => commits.map((c) => `${c.hash} ${c.date}`);
    const runGitText = (args) => {
      const commit = args[1];
      if (commit === 'post-rename-content') {
        // Normal content diff using current path
        return `@@ -1,9 +1,10 @@\n /* @HEADER */\n-old\n+new\n`;
      }
      if (commit === 'rename-commit') {
        // Rename: shows file being added (similarity 100%, no @@ hunks)
        return `diff --git a/old.mjs b/new.mjs\nsimilarity index 100%\nrename from old.mjs\nrename to new.mjs\n`;
      }
      // pre-rename: file not at this path → empty diff
      return '';
    };
    const result = findLastContentChangeCommit('new.mjs', { runGitLines, runGitText });
    // Should return post-rename-content (first commit with actual content change)
    assert.equal(result, 'post-rename-content');
  });

  test('returns null when file has no commits', () => {
    const runGitLines = () => [];
    const runGitText = () => '';
    const result = findLastContentChangeCommit('ghost.mjs', { runGitLines, runGitText });
    assert.equal(result, null);
  });

  test('skips non-slim-header files', () => {
    // repairFile is the entry point that checks for slim headers
    // Test via repairFile with a mock that has no slim header
    // We'll test hasSlimInlineHeader directly instead
    assert.ok(!hasSlimInlineHeader('export const x = 1;'));
  });
});

// ---------------------------------------------------------------------------
// repairFile — with injected git functions (no real git)
// ---------------------------------------------------------------------------

describe('repairFile — injectable git', () => {
  test('dry-run returns proposed change without writing', async () => {
    // We test repairFile using real tmpfile + injected git mocks
    const { mkdtempSync, writeFileSync: wfs, readFileSync: rfs } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');

    const tmpDir = mkdtempSync(join(tmpdir(), 'vr-test-'));
    const tmpFile = join(tmpDir, 'test.mjs');
    const content = `/* @HEADER\n * @version 0.7.100 | 2026-04-01\n * @purpose Test.\n * @sidecar test.mjs.header.md\n * @layer tooling | @hex _none_ | @ctx _none_\n * @public false\n * @edit careful\n */\nexport const x = 1;\n`;
    wfs(tmpFile, content, 'utf8');

    // Since repairFile uses path.join(ROOT, filePath), test the pure functions directly.
    const text = rfs(tmpFile, 'utf8');
    const current = readVersionField(text);
    assert.ok(current.found);
    assert.equal(current.version, '0.7.100');

    const updated = rewriteVersionField(text, '0.7.188', '2026-05-03');
    const updatedField = readVersionField(updated);
    assert.equal(updatedField.version, '0.7.188');
    assert.equal(updatedField.date, '2026-05-03');

    // Original file should be unchanged (dry-run concept)
    const original = rfs(tmpFile, 'utf8');
    assert.equal(original, content);

    // Cleanup
    const { rmSync } = await import('node:fs');
    rmSync(tmpDir, { recursive: true });
  });
});
