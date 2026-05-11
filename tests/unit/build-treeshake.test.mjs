/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove that the --treeshake flag in build-single.mjs is parsed correctly and that the build copies only referenced module directories when treeshake is enabled.
 * @sidecar build-treeshake.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Unit tests for the --treeshake flag in build-single.mjs.
 *
 * Tests that the treeshake option is parsed, and that the build copies only
 * referenced module directories when treeshake is enabled.
 *
 * SpecRefs: TPL-095
 */

import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { parseArgs, build } from '../../scripts/build-single.mjs';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const testDirs = [];

function makeTempRoot() {
  const dir = join(tmpdir(), `treeshake-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });

  // Create minimal starter app structure
  const starter = join(dir, 'apps', 'starter');
  mkdirSync(starter, { recursive: true });
  writeFileSync(
    join(starter, 'index.html'),
    '<!DOCTYPE html><html><head></head><body></body></html>',
  );
  writeFileSync(
    join(starter, 'app.mjs'),
    `import { greet } from '../../modules/alpha/public-api.mjs';\nexport function initApp() { greet(); }`,
  );
  writeFileSync(join(starter, 'app-config.mjs'), 'export const MODES = {};');
  writeFileSync(join(starter, 'messages.mjs'), 'export function t() {}');
  writeFileSync(join(starter, 'ui-selectors.mjs'), 'export const sel = {};');

  // Create three modules: alpha (used), beta (unused), gamma (unused)
  for (const mod of ['alpha', 'beta', 'gamma']) {
    const modDir = join(dir, 'modules', mod);
    mkdirSync(modDir, { recursive: true });
    writeFileSync(join(modDir, 'public-api.mjs'), `export function greet() { return '${mod}'; }`);
  }

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
// parseArgs() --treeshake flag
// ---------------------------------------------------------------------------

describe('parseArgs() --treeshake', () => {
  it('defaults treeshake to false', () => {
    const result = parseArgs([]);
    assert.equal(result.treeshake, false);
  });

  it('parses --treeshake flag', () => {
    const result = parseArgs(['--treeshake']);
    assert.equal(result.treeshake, true);
  });

  it('combines --treeshake with other flags', () => {
    const result = parseArgs(['--mode', 'pwa', '--treeshake', '--clean']);
    assert.equal(result.treeshake, true);
    assert.equal(result.mode, 'pwa');
    assert.equal(result.clean, true);
  });
});

// ---------------------------------------------------------------------------
// build() with treeshake
// ---------------------------------------------------------------------------

describe('build() with treeshake', () => {
  it('copies all modules when treeshake is false', () => {
    const root = makeTempRoot();
    build({ mode: 'hosted', outDir: 'dist', clean: true, root, treeshake: false });

    assert.ok(existsSync(join(root, 'dist', 'modules', 'alpha', 'public-api.mjs')));
    assert.ok(existsSync(join(root, 'dist', 'modules', 'beta', 'public-api.mjs')));
    assert.ok(existsSync(join(root, 'dist', 'modules', 'gamma', 'public-api.mjs')));
  });

  it('copies only referenced modules when treeshake is true', () => {
    const root = makeTempRoot();
    build({ mode: 'hosted', outDir: 'dist', clean: true, root, treeshake: true });

    // alpha is imported by app.mjs
    assert.ok(
      existsSync(join(root, 'dist', 'modules', 'alpha', 'public-api.mjs')),
      'alpha should be included (imported by app.mjs)',
    );

    // beta and gamma are NOT imported
    assert.ok(
      !existsSync(join(root, 'dist', 'modules', 'beta')),
      'beta should be pruned (not imported)',
    );
    assert.ok(
      !existsSync(join(root, 'dist', 'modules', 'gamma')),
      'gamma should be pruned (not imported)',
    );
  });

  it('follows transitive module dependencies', () => {
    const root = makeTempRoot();

    // Make alpha import from beta
    writeFileSync(
      join(root, 'modules', 'alpha', 'public-api.mjs'),
      `import { helper } from '../beta/public-api.mjs';\nexport function greet() { return helper(); }`,
    );

    build({ mode: 'hosted', outDir: 'dist', clean: true, root, treeshake: true });

    assert.ok(
      existsSync(join(root, 'dist', 'modules', 'alpha', 'public-api.mjs')),
      'alpha should be included (directly imported)',
    );
    assert.ok(
      existsSync(join(root, 'dist', 'modules', 'beta', 'public-api.mjs')),
      'beta should be included (transitively imported via alpha)',
    );
    assert.ok(
      !existsSync(join(root, 'dist', 'modules', 'gamma')),
      'gamma should be pruned (not referenced)',
    );
  });

  it('includes module on unresolved import (conservative)', () => {
    const root = makeTempRoot();

    // app.mjs imports from a module that references a missing file
    writeFileSync(
      join(root, 'modules', 'alpha', 'public-api.mjs'),
      `import { x } from './missing-file.mjs';\nexport function greet() { return x; }`,
    );

    // Should not crash — alpha is still included because it's directly referenced
    const result = build({ mode: 'hosted', outDir: 'dist', clean: true, root, treeshake: true });
    assert.ok(result.fileCount > 0);
    assert.ok(existsSync(join(root, 'dist', 'modules', 'alpha', 'public-api.mjs')));
  });

  it('returns pruned module names in result', () => {
    const root = makeTempRoot();
    const result = build({ mode: 'hosted', outDir: 'dist', clean: true, root, treeshake: true });

    assert.ok(Array.isArray(result.includedModules));
    assert.ok(Array.isArray(result.prunedModules));
    assert.ok(result.includedModules.includes('alpha'));
    assert.ok(result.prunedModules.includes('beta'));
    assert.ok(result.prunedModules.includes('gamma'));
  });

  it('does not return module lists when treeshake is false', () => {
    const root = makeTempRoot();
    const result = build({ mode: 'hosted', outDir: 'dist', clean: true, root, treeshake: false });

    assert.equal(result.includedModules, undefined);
    assert.equal(result.prunedModules, undefined);
  });

  it('still copies app files normally with treeshake enabled', () => {
    const root = makeTempRoot();
    build({ mode: 'hosted', outDir: 'dist', clean: true, root, treeshake: true });

    assert.ok(existsSync(join(root, 'dist', 'index.html')));
    assert.ok(existsSync(join(root, 'dist', 'app.mjs')));
  });
});
