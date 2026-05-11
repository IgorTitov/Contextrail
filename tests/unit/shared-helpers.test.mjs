/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit proof for the pure helper functions exported by scripts/checks/_shared.mjs.
 * @sidecar shared-helpers.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  result,
  parseArgs,
  toPosix,
  commentStyle,
  sidecarPath,
  isSidecarHeader,
  inferLayer,
  inferModulePackage,
  shebangPrefix,
} from '../../scripts/checks/_shared.mjs';

// --- result() ---

test('result() returns a structured object with kind, ok, and generatedAt', () => {
  const r = result('test-check', true);
  assert.equal(r.kind, 'test-check');
  assert.equal(r.ok, true);
  assert.equal(typeof r.generatedAt, 'string');
  assert.ok(r.generatedAt.includes('T'), 'generatedAt should be ISO format');
  assert.deepStrictEqual(r.errors, []);
  assert.deepStrictEqual(r.warnings, []);
  assert.deepStrictEqual(r.data, {});
});

test('result() converts plain string errors to strings', () => {
  const r = result('check', false, ['bad file', 'missing thing']);
  assert.deepStrictEqual(r.errors, ['bad file', 'missing thing']);
});

test('result() serializes objects with toJSON()', () => {
  const typed = {
    message: 'validation failed',
    toJSON() {
      return { name: 'ValidationError', code: 'VALIDATION_ERROR', message: this.message };
    },
  };
  const r = result('check', false, [typed, 'plain string']);
  assert.deepStrictEqual(r.errors[0], {
    name: 'ValidationError',
    code: 'VALIDATION_ERROR',
    message: 'validation failed',
  });
  assert.equal(r.errors[1], 'plain string');
});

test('result() passes through warnings and data', () => {
  const r = result('check', true, [], ['soft warning'], { count: 42 });
  assert.deepStrictEqual(r.warnings, ['soft warning']);
  assert.deepStrictEqual(r.data, { count: 42 });
});

// --- parseArgs() ---

test('parseArgs() parses flags and key=value pairs', () => {
  const m = parseArgs(['--json', '--strict-size', '--limit=50', 'file.mjs']);
  assert.equal(m.get('--json'), true);
  assert.equal(m.get('--strict-size'), true);
  assert.equal(m.get('--limit'), '50');
  assert.equal(m.get('file.mjs'), true);
});

test('parseArgs() returns empty map for no args', () => {
  const m = parseArgs([]);
  assert.equal(m.size, 0);
});

// --- toPosix() ---

test('toPosix() converts backslashes to forward slashes', () => {
  assert.equal(toPosix('scripts\\checks\\_shared.mjs'), 'scripts/checks/_shared.mjs');
});

test('toPosix() leaves forward slashes unchanged', () => {
  assert.equal(toPosix('scripts/checks/_shared.mjs'), 'scripts/checks/_shared.mjs');
});

// --- commentStyle() ---

test('commentStyle() returns block for JS/TS/CSS extensions', () => {
  for (const ext of ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.css']) {
    assert.equal(commentStyle(`file${ext}`), 'block', `${ext} should be block`);
  }
});

test('commentStyle() returns hash for shell/yaml/python extensions', () => {
  for (const ext of ['.py', '.sh', '.yml', '.yaml', '.toml', '.feature']) {
    assert.equal(commentStyle(`file${ext}`), 'hash', `${ext} should be hash`);
  }
});

test('commentStyle() returns html for markdown/html/xml extensions', () => {
  for (const ext of ['.md', '.html', '.xml']) {
    assert.equal(commentStyle(`file${ext}`), 'html', `${ext} should be html`);
  }
});

test('commentStyle() returns hash for githooks paths', () => {
  assert.equal(commentStyle('.githooks/pre-commit'), 'hash');
});

test('commentStyle() returns sidecar for unknown extensions', () => {
  assert.equal(commentStyle('data.json'), 'sidecar');
});

// --- sidecarPath() / isSidecarHeader() ---

test('sidecarPath() appends .header.md', () => {
  assert.equal(sidecarPath('package.json'), 'package.json.header.md');
});

test('isSidecarHeader() recognizes .header.md suffix', () => {
  assert.equal(isSidecarHeader('package.json.header.md'), true);
  assert.equal(isSidecarHeader('package.json'), false);
});

// --- inferLayer() ---

test('inferLayer() maps paths to correct layers', () => {
  const cases = [
    ['.claude/agents/foo.md', 'control-plane'],
    ['scripts/checks/check.mjs', 'tooling'],
    ['.githooks/pre-commit', 'git-hooks'],
    ['.vscode/settings.json', 'editor'],
    ['docs/prd/index.md', 'docs'],
    ['tests/unit/foo.test.mjs', 'tests'],
    ['apps/starter/ui-selectors.mjs', 'app'],
    ['modules/auth/src/public-api.ts', 'module'],
    ['CHANGELOG.md', 'root'],
  ];
  for (const [file, expected] of cases) {
    assert.equal(inferLayer(file), expected, `${file} should be layer "${expected}"`);
  }
});

// --- inferModulePackage() ---

test('inferModulePackage() returns correct package paths', () => {
  assert.equal(inferModulePackage('CHANGELOG.md'), 'root');
  assert.equal(inferModulePackage('scripts/mergezip.mjs'), 'scripts');
  assert.equal(inferModulePackage('scripts/checks/check.mjs'), 'scripts/checks');
  assert.equal(inferModulePackage('tests/unit/foo.test.mjs'), 'tests/unit');
});

// --- shebangPrefix() ---

test('shebangPrefix() extracts shebang line from text', () => {
  const { shebang, rest } = shebangPrefix('#!/usr/bin/env node\nconsole.log("hi");');
  assert.equal(shebang, '#!/usr/bin/env node\n');
  assert.equal(rest, 'console.log("hi");');
});

test('shebangPrefix() returns empty shebang for non-shebang text', () => {
  const { shebang, rest } = shebangPrefix('console.log("hi");');
  assert.equal(shebang, '');
  assert.equal(rest, 'console.log("hi");');
});
