/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of fs-helpers-test in this repository.
 * @sidecar fs-helpers.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  walk,
  fileExists,
  readText,
  toPosix,
  ROOT,
  IGNORE,
} from '../../scripts/lib/fs-helpers.mjs';

// ---------------------------------------------------------------------------
// walk()
// ---------------------------------------------------------------------------

describe('walk()', () => {
  test('returns files from a known directory', async () => {
    const files = await walk('scripts/lib');
    assert.ok(files.length > 0, 'scripts/lib/ should contain files');
    assert.ok(
      files.every((f) => f.startsWith('scripts/lib/')),
      'all paths should be under scripts/lib/',
    );
  });

  test('returns POSIX paths', async () => {
    const files = await walk('scripts/lib');
    for (const f of files) {
      assert.ok(!f.includes('\\'), `Path should be POSIX: ${f}`);
    }
  });

  test('returns an empty array for a non-existent directory', async () => {
    const files = await walk('this-does-not-exist-xyz');
    assert.deepEqual(files, []);
  });

  test('does not traverse IGNORE directories', async () => {
    const files = await walk('.');
    for (const f of files) {
      const segments = f.split('/');
      for (const ignored of IGNORE) {
        assert.ok(!segments.includes(ignored), `${f} should not include ignored dir ${ignored}`);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// fileExists()
// ---------------------------------------------------------------------------

describe('fileExists()', () => {
  test('returns true for a known file', () => {
    assert.equal(fileExists('package.json'), true);
  });

  test('returns false for a non-existent file', () => {
    assert.equal(fileExists('this-does-not-exist.xyz'), false);
  });
});

// ---------------------------------------------------------------------------
// readText()
// ---------------------------------------------------------------------------

describe('readText()', () => {
  test('reads a known file as UTF-8', async () => {
    const text = await readText('package.json');
    assert.ok(text.includes('"name"'), 'package.json should contain "name"');
  });

  test('rejects for a non-existent file', async () => {
    await assert.rejects(readText('no-such-file.xyz'), /ENOENT/);
  });
});

// ---------------------------------------------------------------------------
// toPosix()
// ---------------------------------------------------------------------------

describe('toPosix() via integration', () => {
  test('ROOT is a string', () => {
    assert.equal(typeof ROOT, 'string');
    assert.ok(ROOT.length > 0);
  });
});
