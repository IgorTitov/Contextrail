/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit-test the module detachment logic (manifest loading, dependency graph construction, backlog reference scanning, and safe removal) using isolated temporary directories.
 * @sidecar detach-module.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Unit tests for the detach-module CLI script.
 *
 * SpecRefs: TPL-133
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  loadManifests,
  buildDependentMap,
  findBacklogReferences,
  detachModule,
} from '../../scripts/detach-module.mjs';

// ---------------------------------------------------------------------------
// Helpers — create a temporary module tree
// ---------------------------------------------------------------------------

/** @type {string} */
let tempDir;

/**
 * Create a minimal module with manifest in a temp directory.
 * @param {string} modulesDir
 * @param {string} name
 * @param {object} [overrides]
 */
function createTempModule(modulesDir, name, overrides = {}) {
  const dir = join(modulesDir, name);
  mkdirSync(dir, { recursive: true });
  const manifest = {
    name,
    description: `Test module ${name}`,
    exports: ['public-api.mjs'],
    dependencies: { modules: [], external: [], builtins: [] },
    testFiles: [],
    ...overrides,
  };
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  writeFileSync(join(dir, 'public-api.mjs'), `// ${name} public API\n`);
  return manifest;
}

// ---------------------------------------------------------------------------
// loadManifests() — uses the real modules/ directory
// ---------------------------------------------------------------------------

describe('loadManifests()', () => {
  it('returns a Map of module manifests', () => {
    const manifests = loadManifests();
    assert.ok(manifests instanceof Map);
    assert.ok(manifests.size >= 10, `expected >=10 modules, got ${manifests.size}`);
  });

  it('each manifest has required fields', () => {
    const manifests = loadManifests();
    for (const [name, m] of manifests) {
      assert.ok(m.name, `${name} missing name`);
      assert.ok(Array.isArray(m.exports), `${name} missing exports`);
      assert.ok(m.dependencies, `${name} missing dependencies`);
      assert.ok(Array.isArray(m.dependencies.modules), `${name} missing dependencies.modules`);
      assert.ok(Array.isArray(m.testFiles), `${name} missing testFiles`);
    }
  });

  it('manifests are valid JSON', () => {
    const manifests = loadManifests();
    for (const [name] of manifests) {
      const path = join('modules', name, 'manifest.json');
      assert.doesNotThrow(
        () => JSON.parse(readFileSync(path, 'utf-8')),
        `${name} manifest is not valid JSON`,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// buildDependentMap()
// ---------------------------------------------------------------------------

describe('buildDependentMap()', () => {
  it('builds reverse dependency map', () => {
    const manifests = new Map([
      [
        'a',
        {
          name: 'a',
          exports: [],
          dependencies: { modules: ['b'], external: [], builtins: [] },
          testFiles: [],
        },
      ],
      [
        'b',
        {
          name: 'b',
          exports: [],
          dependencies: { modules: [], external: [], builtins: [] },
          testFiles: [],
        },
      ],
      [
        'c',
        {
          name: 'c',
          exports: [],
          dependencies: { modules: ['b'], external: [], builtins: [] },
          testFiles: [],
        },
      ],
    ]);
    const deps = buildDependentMap(manifests);
    assert.deepEqual(deps.get('b'), ['a', 'c']);
    assert.deepEqual(deps.get('a'), []);
  });

  it('returns empty arrays for standalone modules', () => {
    const manifests = new Map([
      [
        'x',
        {
          name: 'x',
          exports: [],
          dependencies: { modules: [], external: [], builtins: [] },
          testFiles: [],
        },
      ],
    ]);
    const deps = buildDependentMap(manifests);
    assert.deepEqual(deps.get('x'), []);
  });

  it('handles missing dependency targets gracefully', () => {
    const manifests = new Map([
      [
        'a',
        {
          name: 'a',
          exports: [],
          dependencies: { modules: ['nonexistent'], external: [], builtins: [] },
          testFiles: [],
        },
      ],
    ]);
    const deps = buildDependentMap(manifests);
    assert.deepEqual(deps.get('nonexistent'), ['a']);
  });
});

// ---------------------------------------------------------------------------
// findBacklogReferences()
// ---------------------------------------------------------------------------

describe('findBacklogReferences()', () => {
  it('finds references in backlog files', () => {
    const refs = findBacklogReferences('retrieval');
    assert.ok(refs.length >= 1, 'expected at least one backlog reference for retrieval');
  });

  it('returns empty for non-existent module', () => {
    const refs = findBacklogReferences('nonexistent-module-xyz');
    assert.deepEqual(refs, []);
  });
});

// ---------------------------------------------------------------------------
// detachModule() — dry-run mode
// ---------------------------------------------------------------------------

describe('detachModule() dry-run', () => {
  it('reports what would be removed without doing it', () => {
    const manifests = loadManifests();
    const moduleName = 'example-greeter';
    assert.ok(manifests.has(moduleName));

    // Capture that module dir exists before
    assert.ok(existsSync(join('modules', moduleName)));

    const exitCode = detachModule(moduleName, manifests, { dryRun: true, force: false });
    assert.equal(exitCode, 0);

    // Module should still exist after dry-run
    assert.ok(existsSync(join('modules', moduleName)), 'module should still exist after dry-run');
  });

  it('returns error for non-existent module', () => {
    const manifests = loadManifests();
    const exitCode = detachModule('nonexistent-xyz', manifests, { dryRun: true, force: false });
    assert.equal(exitCode, 1);
  });
});

// ---------------------------------------------------------------------------
// detachModule() — dependent detection
// ---------------------------------------------------------------------------

describe('detachModule() dependent detection', () => {
  it('blocks removal when dependents exist', () => {
    const manifests = new Map([
      [
        'parent',
        {
          name: 'parent',
          exports: [],
          dependencies: { modules: [], external: [], builtins: [] },
          testFiles: [],
        },
      ],
      [
        'child',
        {
          name: 'child',
          exports: [],
          dependencies: { modules: ['parent'], external: [], builtins: [] },
          testFiles: [],
        },
      ],
    ]);
    const exitCode = detachModule('parent', manifests, { dryRun: true, force: false });
    assert.equal(exitCode, 1);
  });

  it('allows removal with --force despite dependents', () => {
    const manifests = new Map([
      [
        'parent',
        {
          name: 'parent',
          exports: [],
          dependencies: { modules: [], external: [], builtins: [] },
          testFiles: [],
        },
      ],
      [
        'child',
        {
          name: 'child',
          exports: [],
          dependencies: { modules: ['parent'], external: [], builtins: [] },
          testFiles: [],
        },
      ],
    ]);
    // dry-run + force — should succeed (exit 0) even with dependents
    const exitCode = detachModule('parent', manifests, { dryRun: true, force: true });
    assert.equal(exitCode, 0);
  });

  it('allows removal of leaf modules without --force', () => {
    const manifests = loadManifests();
    // knowledge-graph is standalone with no dependents
    const exitCode = detachModule('knowledge-graph', manifests, { dryRun: true, force: false });
    assert.equal(exitCode, 0);
  });
});

// ---------------------------------------------------------------------------
// CLI --list mode
// ---------------------------------------------------------------------------

describe('detach-module --list', () => {
  it('lists modules via CLI', async () => {
    const output = execSync('node scripts/detach-module.mjs --list', { encoding: 'utf-8' });
    assert.ok(output.includes('retrieval'));
    assert.ok(output.includes('event-bus'));
    assert.ok(output.includes('standalone') || output.includes('leaf'));
  });
});
