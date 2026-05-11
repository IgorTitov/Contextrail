/* @HEADER
 * @version 0.7.103 | 2026-05-05
 * @purpose Unit tests for agent-context.mjs Tier-3 sidecar neighborhood computation.
 * @sidecar agent-context-neighborhood.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// SpecRefs: TPL-292

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { computeNeighborhood } from '../../scripts/agent-context.mjs';

// ---------------------------------------------------------------------------
// Helpers: build a synthetic module tree in a temp directory
// ---------------------------------------------------------------------------

function makeSyntheticRepo() {
  const root = mkdtempSync(join(tmpdir(), 'tpl292-unit-'));

  function touch(relPath, content = '# stub\n') {
    const full = join(root, relPath);
    const dir =
      full.slice(0, full.lastIndexOf('/') + 1) || full.slice(0, full.lastIndexOf('\\') + 1);
    mkdirSync(dir, { recursive: true });
    writeFileSync(full, content, 'utf8');
  }

  // alpha module: manifest + public-api with sidecars, plus domain file with sidecar
  mkdirSync(join(root, 'modules', 'alpha', 'domain'), { recursive: true });
  touch(
    'modules/alpha/manifest.json',
    JSON.stringify({ name: 'alpha', version: '1.0.0', dependencies: { modules: ['beta'] } }),
  );
  touch('modules/alpha/manifest.json.header.md', '---\nname: alpha manifest\n---\n');
  touch('modules/alpha/public-api.mjs', 'export {}');
  touch('modules/alpha/public-api.mjs.header.md', '---\nname: alpha public-api\n---\n');
  touch('modules/alpha/domain/logic.mjs', 'export function foo() {}');
  touch('modules/alpha/domain/logic.mjs.header.md', '---\nname: alpha logic\n---\n');

  // beta module: manifest + public-api with sidecars (dependency of alpha)
  mkdirSync(join(root, 'modules', 'beta'), { recursive: true });
  touch(
    'modules/beta/manifest.json',
    JSON.stringify({ name: 'beta', version: '1.0.0', dependencies: { modules: [] } }),
  );
  touch('modules/beta/manifest.json.header.md', '---\nname: beta manifest\n---\n');
  touch('modules/beta/public-api.mjs', 'export {}');
  touch('modules/beta/public-api.mjs.header.md', '---\nname: beta public-api\n---\n');

  // gamma module: manifest only, no sidecars
  mkdirSync(join(root, 'modules', 'gamma'), { recursive: true });
  touch(
    'modules/gamma/manifest.json',
    JSON.stringify({ name: 'gamma', version: '1.0.0', dependencies: { modules: [] } }),
  );
  // no .header.md files for gamma

  return root;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('computeNeighborhood', () => {
  it('returns an array', () => {
    const root = makeSyntheticRepo();
    const result = computeNeighborhood({ modules: ['alpha'], radius: 'medium', repoRoot: root });
    assert.ok(Array.isArray(result), 'result must be an array');
  });

  it('all returned paths end with .header.md', () => {
    const root = makeSyntheticRepo();
    const result = computeNeighborhood({ modules: ['alpha'], radius: 'medium', repoRoot: root });
    assert.ok(result.length > 0, 'must return at least one sidecar');
    for (const p of result) {
      assert.ok(p.endsWith('.header.md'), `path must end with .header.md: ${p}`);
    }
  });

  it('deduplication — same sidecar appears only once', () => {
    const root = makeSyntheticRepo();
    // Pass the same module twice
    const result = computeNeighborhood({
      modules: ['alpha', 'alpha'],
      radius: 'medium',
      repoRoot: root,
    });
    const unique = new Set(result);
    assert.equal(result.length, unique.size, 'paths must not be duplicated');
  });

  it('stable ordering — same input produces same output', () => {
    const root = makeSyntheticRepo();
    const a = computeNeighborhood({ modules: ['alpha', 'beta'], radius: 'medium', repoRoot: root });
    const b = computeNeighborhood({ modules: ['alpha', 'beta'], radius: 'medium', repoRoot: root });
    assert.deepEqual(a, b, 'output must be deterministic');
  });

  it('small radius returns only public-api + manifest sidecars (≤5 per module)', () => {
    const root = makeSyntheticRepo();
    const result = computeNeighborhood({ modules: ['alpha'], radius: 'small', repoRoot: root });
    // small must return >= 1 and <= 5 paths for a single module
    assert.ok(
      result.length >= 1 && result.length <= 5,
      `small must return 1-5 sidecars, got ${result.length}`,
    );
    // All must be manifest or public-api sidecars
    for (const p of result) {
      const isManifestSidecar = p.includes('manifest.json.header.md');
      const isPublicApiSidecar = p.includes('public-api.') && p.endsWith('.header.md');
      assert.ok(
        isManifestSidecar || isPublicApiSidecar,
        `small radius: unexpected sidecar path "${p}" — must be manifest or public-api sidecar`,
      );
    }
  });

  it('medium radius returns more sidecars than small', () => {
    const root = makeSyntheticRepo();
    const small = computeNeighborhood({ modules: ['alpha'], radius: 'small', repoRoot: root });
    const medium = computeNeighborhood({ modules: ['alpha'], radius: 'medium', repoRoot: root });
    assert.ok(medium.length >= small.length, 'medium must return >= sidecars as small');
    // alpha has 3 sidecars (manifest, public-api, domain/logic), so medium > small
    assert.ok(
      medium.length > small.length,
      'medium must return more sidecars than small for alpha (which has a domain sidecar)',
    );
  });

  it('large radius includes dependency sidecars beyond medium', () => {
    const root = makeSyntheticRepo();
    const medium = computeNeighborhood({ modules: ['alpha'], radius: 'medium', repoRoot: root });
    const large = computeNeighborhood({ modules: ['alpha'], radius: 'large', repoRoot: root });
    // alpha depends on beta — large should include beta sidecars
    assert.ok(large.length >= medium.length, 'large must return >= sidecars as medium');
    const hasBetaSidecar = large.some((p) => p.includes('beta'));
    assert.ok(hasBetaSidecar, 'large radius must include beta (dependency of alpha) sidecars');
  });

  it('empty result for modules list with no sidecars', () => {
    const root = makeSyntheticRepo();
    // gamma has no .header.md files
    const result = computeNeighborhood({ modules: ['gamma'], radius: 'medium', repoRoot: root });
    assert.equal(result.length, 0, 'gamma has no sidecars, result must be empty');
  });

  it('empty modules array returns empty array', () => {
    const root = makeSyntheticRepo();
    const result = computeNeighborhood({ modules: [], radius: 'medium', repoRoot: root });
    assert.deepEqual(result, []);
  });

  it('invalid radius throws with clear error message', () => {
    const root = makeSyntheticRepo();
    assert.throws(
      () => computeNeighborhood({ modules: ['alpha'], radius: 'huge', repoRoot: root }),
      /invalid.*radius|radius.*invalid/i,
      'must throw on invalid radius',
    );
  });

  it('default radius (undefined) behaves as medium', () => {
    const root = makeSyntheticRepo();
    const medium = computeNeighborhood({ modules: ['alpha'], radius: 'medium', repoRoot: root });
    const defaultResult = computeNeighborhood({ modules: ['alpha'], repoRoot: root });
    assert.deepEqual(defaultResult, medium, 'default radius must equal medium');
  });
});
