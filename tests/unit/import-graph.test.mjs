/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove that parseImports correctly extracts ES module specifiers and that analyzeImportGraph performs recursive graph traversal, module detection, circular-import handling, and unresolved-import recording.
 * @sidecar import-graph.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Unit tests for the import-graph analyzer.
 *
 * Tests regex-based ES module import parsing, recursive graph traversal,
 * module directory detection, and edge cases like circular imports and
 * missing files.
 *
 * SpecRefs: TPL-094
 */

import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { parseImports, analyzeImportGraph } from '../../scripts/import-graph.mjs';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const testDirs = [];

function makeTempDir() {
  const dir = join(
    tmpdir(),
    `import-graph-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(dir, { recursive: true });
  testDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of testDirs) {
    try {
      rmSync(dir, { recursive: true });
    } catch {
      /* ignore */
    }
  }
  testDirs.length = 0;
});

// ---------------------------------------------------------------------------
// parseImports() — regex-based import extraction
// ---------------------------------------------------------------------------

describe('parseImports()', () => {
  it('parses named import declarations', () => {
    const code = `import { foo, bar } from './utils.mjs';`;
    const result = parseImports(code);
    assert.deepEqual(result, ['./utils.mjs']);
  });

  it('parses default import declarations', () => {
    const code = `import Config from '../config.mjs';`;
    const result = parseImports(code);
    assert.deepEqual(result, ['../config.mjs']);
  });

  it('parses namespace import declarations', () => {
    const code = `import * as helpers from './helpers.mjs';`;
    const result = parseImports(code);
    assert.deepEqual(result, ['./helpers.mjs']);
  });

  it('parses side-effect imports', () => {
    const code = `import './polyfill.mjs';`;
    const result = parseImports(code);
    assert.deepEqual(result, ['./polyfill.mjs']);
  });

  it('parses re-export declarations', () => {
    const code = `export { createFoo } from './foo.mjs';`;
    const result = parseImports(code);
    assert.deepEqual(result, ['./foo.mjs']);
  });

  it('parses export-all declarations', () => {
    const code = `export * from './everything.mjs';`;
    const result = parseImports(code);
    assert.deepEqual(result, ['./everything.mjs']);
  });

  it('parses dynamic import() expressions', () => {
    const code = `const mod = await import('./lazy.mjs');`;
    const result = parseImports(code);
    assert.deepEqual(result, ['./lazy.mjs']);
  });

  it('extracts multiple imports from one file', () => {
    const code = [
      `import { a } from './a.mjs';`,
      `import './b.mjs';`,
      `export { c } from './c.mjs';`,
      `const d = await import('./d.mjs');`,
    ].join('\n');
    const result = parseImports(code);
    assert.deepEqual(result, ['./a.mjs', './b.mjs', './c.mjs', './d.mjs']);
  });

  it('ignores Node.js built-in modules', () => {
    const code = [
      `import { readFileSync } from 'node:fs';`,
      `import path from 'path';`,
      `import { foo } from './local.mjs';`,
    ].join('\n');
    const result = parseImports(code);
    assert.deepEqual(result, ['./local.mjs']);
  });

  it('handles double-quoted specifiers', () => {
    const code = `import { x } from "./double.mjs";`;
    const result = parseImports(code);
    assert.deepEqual(result, ['./double.mjs']);
  });

  it('returns empty array for files with no imports', () => {
    const code = `export const VERSION = '1.0';`;
    const result = parseImports(code);
    assert.deepEqual(result, []);
  });

  it('ignores commented-out imports', () => {
    const code = [
      `// import { old } from './old.mjs';`,
      `import { current } from './current.mjs';`,
    ].join('\n');
    const result = parseImports(code);
    assert.deepEqual(result, ['./current.mjs']);
  });
});

// ---------------------------------------------------------------------------
// analyzeImportGraph() — full graph traversal
// ---------------------------------------------------------------------------

describe('analyzeImportGraph()', () => {
  it('returns the entry file in the files set', async () => {
    const dir = makeTempDir();
    writeFileSync(join(dir, 'entry.mjs'), `export const x = 1;`);

    const result = await analyzeImportGraph(join(dir, 'entry.mjs'));
    assert.ok(result.files instanceof Set);
    assert.ok(result.files.has(join(dir, 'entry.mjs')));
  });

  it('follows relative imports recursively', async () => {
    const dir = makeTempDir();
    writeFileSync(join(dir, 'a.mjs'), `import { b } from './b.mjs'; export const a = b;`);
    writeFileSync(join(dir, 'b.mjs'), `import { c } from './c.mjs'; export const b = c;`);
    writeFileSync(join(dir, 'c.mjs'), `export const c = 42;`);

    const result = await analyzeImportGraph(join(dir, 'a.mjs'));
    assert.equal(result.files.size, 3);
    assert.ok(result.files.has(join(dir, 'a.mjs')));
    assert.ok(result.files.has(join(dir, 'b.mjs')));
    assert.ok(result.files.has(join(dir, 'c.mjs')));
  });

  it('detects referenced module directories', async () => {
    const dir = makeTempDir();
    const modDir = join(dir, 'modules', 'foo');
    mkdirSync(modDir, { recursive: true });
    writeFileSync(join(modDir, 'public-api.mjs'), `export const foo = 1;`);
    writeFileSync(join(dir, 'app.mjs'), `import { foo } from './modules/foo/public-api.mjs';`);

    const result = await analyzeImportGraph(join(dir, 'app.mjs'), {
      modulesDir: join(dir, 'modules'),
    });
    assert.ok(result.modules instanceof Set);
    assert.ok(result.modules.has('foo'));
  });

  it('handles circular imports without infinite recursion', async () => {
    const dir = makeTempDir();
    writeFileSync(join(dir, 'x.mjs'), `import { y } from './y.mjs'; export const x = 1;`);
    writeFileSync(join(dir, 'y.mjs'), `import { x } from './x.mjs'; export const y = 2;`);

    const result = await analyzeImportGraph(join(dir, 'x.mjs'));
    assert.equal(result.files.size, 2);
  });

  it('records missing files in unresolvedImports', async () => {
    const dir = makeTempDir();
    writeFileSync(join(dir, 'entry.mjs'), `import { gone } from './missing.mjs';`);

    const result = await analyzeImportGraph(join(dir, 'entry.mjs'));
    assert.ok(Array.isArray(result.unresolvedImports));
    assert.ok(result.unresolvedImports.length > 0);
    assert.ok(result.unresolvedImports.some((u) => u.specifier.includes('missing')));
  });

  it('follows dynamic import() expressions', async () => {
    const dir = makeTempDir();
    writeFileSync(join(dir, 'main.mjs'), `const lazy = await import('./lazy.mjs');`);
    writeFileSync(join(dir, 'lazy.mjs'), `export const val = 99;`);

    const result = await analyzeImportGraph(join(dir, 'main.mjs'));
    assert.equal(result.files.size, 2);
    assert.ok(result.files.has(join(dir, 'lazy.mjs')));
  });

  it('follows re-exports', async () => {
    const dir = makeTempDir();
    writeFileSync(join(dir, 'index.mjs'), `export { thing } from './impl.mjs';`);
    writeFileSync(join(dir, 'impl.mjs'), `export const thing = 1;`);

    const result = await analyzeImportGraph(join(dir, 'index.mjs'));
    assert.equal(result.files.size, 2);
  });

  it('resolves parent directory imports (../)', async () => {
    const dir = makeTempDir();
    const sub = join(dir, 'sub');
    mkdirSync(sub);
    writeFileSync(join(dir, 'root.mjs'), `export const r = 1;`);
    writeFileSync(join(sub, 'child.mjs'), `import { r } from '../root.mjs'; export const c = r;`);

    const result = await analyzeImportGraph(join(sub, 'child.mjs'));
    assert.equal(result.files.size, 2);
    assert.ok(result.files.has(join(dir, 'root.mjs')));
  });

  it('skips node: built-in imports', async () => {
    const dir = makeTempDir();
    writeFileSync(
      join(dir, 'entry.mjs'),
      `import { readFileSync } from 'node:fs';\nimport { local } from './local.mjs';`,
    );
    writeFileSync(join(dir, 'local.mjs'), `export const local = 1;`);

    const result = await analyzeImportGraph(join(dir, 'entry.mjs'));
    assert.equal(result.files.size, 2);
    assert.equal(result.unresolvedImports.length, 0);
  });

  it('detects multiple referenced modules', async () => {
    const dir = makeTempDir();
    mkdirSync(join(dir, 'modules', 'alpha'), { recursive: true });
    mkdirSync(join(dir, 'modules', 'beta'), { recursive: true });
    mkdirSync(join(dir, 'modules', 'gamma'), { recursive: true });
    writeFileSync(join(dir, 'modules', 'alpha', 'public-api.mjs'), `export const a = 1;`);
    writeFileSync(join(dir, 'modules', 'beta', 'public-api.mjs'), `export const b = 2;`);
    writeFileSync(join(dir, 'modules', 'gamma', 'public-api.mjs'), `export const g = 3;`);
    writeFileSync(
      join(dir, 'app.mjs'),
      [
        `import { a } from './modules/alpha/public-api.mjs';`,
        `import { b } from './modules/beta/public-api.mjs';`,
      ].join('\n'),
    );

    const result = await analyzeImportGraph(join(dir, 'app.mjs'), {
      modulesDir: join(dir, 'modules'),
    });
    assert.ok(result.modules.has('alpha'));
    assert.ok(result.modules.has('beta'));
    assert.ok(!result.modules.has('gamma'), 'gamma should be unreferenced');
  });

  it('handles empty entry file', async () => {
    const dir = makeTempDir();
    writeFileSync(join(dir, 'empty.mjs'), '');

    const result = await analyzeImportGraph(join(dir, 'empty.mjs'));
    assert.equal(result.files.size, 1);
    assert.equal(result.modules.size, 0);
    assert.equal(result.unresolvedImports.length, 0);
  });

  it('handles deeply nested module imports', async () => {
    const dir = makeTempDir();
    mkdirSync(join(dir, 'modules', 'deep', 'ports'), { recursive: true });
    writeFileSync(
      join(dir, 'modules', 'deep', 'public-api.mjs'),
      `export { p } from './ports/port.mjs';`,
    );
    writeFileSync(join(dir, 'modules', 'deep', 'ports', 'port.mjs'), `export const p = 1;`);
    writeFileSync(join(dir, 'app.mjs'), `import { p } from './modules/deep/public-api.mjs';`);

    const result = await analyzeImportGraph(join(dir, 'app.mjs'), {
      modulesDir: join(dir, 'modules'),
    });
    assert.ok(result.modules.has('deep'));
    assert.equal(result.files.size, 3);
  });
});
