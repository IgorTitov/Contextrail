/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit tests for module-fit-check.mjs pure helpers (token approximation, file pickers, work-surface measurement, distribution math).
 * @sidecar module-fit-check.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// SpecRefs: TPL-210
//
// Tests use a synthetic on-disk fixture under tests/.fixtures/module-fit/
// created and torn down per suite. Pure helpers are exercised against
// fixed strings; integration helpers are exercised against the fixture.

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  approximateTokenCount,
  pickRepresentativeImpl,
  pickRepresentativeTest,
  measureWorkSurface,
  computeDistribution,
  discoverModuleNames,
  DEFAULT_WARN_TOKENS,
  DEFAULT_ERROR_TOKENS,
} from '../../scripts/checks/module-fit-check.mjs';

const __dirname = import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));
const FIXTURE_ROOT = resolve(__dirname, '.fixtures', 'module-fit');

function writeFile(absPath, contents) {
  mkdirSync(dirname(absPath), { recursive: true });
  writeFileSync(absPath, contents, 'utf8');
}

// ---------------------------------------------------------------------------
// approximateTokenCount
// ---------------------------------------------------------------------------

describe('module-fit-check: approximateTokenCount', () => {
  test('empty string is 0 tokens', () => {
    assert.equal(approximateTokenCount(''), 0);
  });

  test('null and undefined are 0 tokens', () => {
    assert.equal(approximateTokenCount(null), 0);
    assert.equal(approximateTokenCount(undefined), 0);
  });

  test('4 ASCII bytes is 1 token (ceil)', () => {
    assert.equal(approximateTokenCount('abcd'), 1);
  });

  test('5 ASCII bytes is 2 tokens (ceil)', () => {
    assert.equal(approximateTokenCount('abcde'), 2);
  });

  test('1000 ASCII bytes is 250 tokens', () => {
    assert.equal(approximateTokenCount('x'.repeat(1000)), 250);
  });

  test('coerces non-string input via String()', () => {
    assert.equal(approximateTokenCount(1234), 1);
  });

  test('counts utf-8 bytes, not code points', () => {
    // 1-char utf-8 strings: emoji takes 4 bytes → 1 token
    assert.equal(approximateTokenCount('🚀'), 1);
    // Three emoji = 12 bytes = 3 tokens
    assert.equal(approximateTokenCount('🚀🚀🚀'), 3);
  });

  test('default thresholds export reasonable values', () => {
    assert.equal(typeof DEFAULT_WARN_TOKENS, 'number');
    assert.equal(typeof DEFAULT_ERROR_TOKENS, 'number');
    assert.ok(DEFAULT_WARN_TOKENS > 0);
    assert.ok(DEFAULT_ERROR_TOKENS > DEFAULT_WARN_TOKENS);
    assert.ok(DEFAULT_ERROR_TOKENS <= 16384, 'error threshold must fit inside 16K floor');
  });
});

// ---------------------------------------------------------------------------
// computeDistribution
// ---------------------------------------------------------------------------

describe('module-fit-check: computeDistribution', () => {
  test('empty input yields all zeros', () => {
    const d = computeDistribution([]);
    assert.deepStrictEqual(d, { count: 0, min: 0, p50: 0, p75: 0, p95: 0, max: 0, mean: 0 });
  });

  test('single value: every percentile equals it', () => {
    const d = computeDistribution([100]);
    assert.equal(d.count, 1);
    assert.equal(d.min, 100);
    assert.equal(d.p50, 100);
    assert.equal(d.p75, 100);
    assert.equal(d.p95, 100);
    assert.equal(d.max, 100);
    assert.equal(d.mean, 100);
  });

  test('ten-value uniform distribution returns expected percentiles', () => {
    const d = computeDistribution([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    assert.equal(d.count, 10);
    assert.equal(d.min, 1);
    assert.equal(d.max, 10);
    assert.equal(d.mean, 6); // (55/10)=5.5 → rounded to 6
    assert.ok(d.p50 >= 5 && d.p50 <= 6);
    assert.ok(d.p75 >= 7 && d.p75 <= 8);
    assert.ok(d.p95 >= 9 && d.p95 <= 10);
  });

  test('skips non-finite values', () => {
    const d = computeDistribution([1, 2, NaN, Infinity, 3]);
    assert.equal(d.count, 3);
    assert.equal(d.max, 3);
  });

  test('non-array input yields empty distribution', () => {
    const d = computeDistribution(null);
    assert.equal(d.count, 0);
  });
});

// ---------------------------------------------------------------------------
// pickRepresentativeImpl + pickRepresentativeTest + measureWorkSurface
// ---------------------------------------------------------------------------

describe('module-fit-check: file pickers + measureWorkSurface (fixture)', () => {
  before(() => {
    rmSync(FIXTURE_ROOT, { recursive: true, force: true });

    // Module "alpha" — full surface (manifest + public-api + sidecars + impl + test)
    const alphaDir = join(FIXTURE_ROOT, 'modules', 'alpha');
    writeFile(join(alphaDir, 'manifest.json'), '{"name":"alpha"}'); // ~16 bytes → 4 tokens
    writeFile(join(alphaDir, 'manifest.json.header.md'), '# alpha manifest'); // 16 bytes → 4 tokens
    writeFile(join(alphaDir, 'public-api.mjs'), 'export const A = 1;\n'); // 20 bytes → 5 tokens
    writeFile(join(alphaDir, 'public-api.mjs.header.md'), '# public-api\n'); // 13 bytes → 4 tokens
    // Domain: two impl files; the larger one (more lines) wins.
    writeFile(join(alphaDir, 'domain', 'small.mjs'), 'export const x = 1;\n');
    writeFile(
      join(alphaDir, 'domain', 'big.mjs'),
      Array.from({ length: 20 }, (_, i) => `export const v${i} = ${i};`).join('\n') + '\n',
    );
    writeFile(join(FIXTURE_ROOT, 'tests', 'unit', 'alpha.test.mjs'), 'test stub\n');

    // Module "beta" — adapters-only (no domain/), forces fallback.
    const betaDir = join(FIXTURE_ROOT, 'modules', 'beta');
    writeFile(join(betaDir, 'manifest.json'), '{"name":"beta"}');
    writeFile(join(betaDir, 'public-api.mjs'), 'export const B = 1;\n');
    writeFile(join(betaDir, 'adapters', 'only-adapter.mjs'), 'export const A = 1;\n');
    // Test under tests/contract/ (priority fallback)
    writeFile(join(FIXTURE_ROOT, 'tests', 'contract', 'beta.test.mjs'), 'contract\n');

    // Module "gamma" — minimal (manifest only, no public-api, no impl, no test, no sidecars)
    const gammaDir = join(FIXTURE_ROOT, 'modules', 'gamma');
    writeFile(join(gammaDir, 'manifest.json'), '{"name":"gamma"}');

    // Module "delta" — empty (no files at all under modules/delta/)
    mkdirSync(join(FIXTURE_ROOT, 'modules', 'delta'), { recursive: true });

    // Module "epsilon" — has a hyphenated test name to exercise prefix-match heuristic.
    const epsilonDir = join(FIXTURE_ROOT, 'modules', 'epsilon');
    writeFile(join(epsilonDir, 'manifest.json'), '{"name":"epsilon"}');
    writeFile(join(epsilonDir, 'public-api.mjs'), 'export const E = 1;\n');
    writeFile(join(epsilonDir, 'domain', 'core.mjs'), 'export const c = 1;\n');
    writeFile(join(FIXTURE_ROOT, 'tests', 'unit', 'epsilon-extras.test.mjs'), 'extras\n');
  });

  after(() => {
    rmSync(FIXTURE_ROOT, { recursive: true, force: true });
  });

  test('pickRepresentativeImpl prefers domain/ and picks the largest file (deterministic)', () => {
    const alphaDir = join(FIXTURE_ROOT, 'modules', 'alpha');
    const picked1 = pickRepresentativeImpl(alphaDir);
    const picked2 = pickRepresentativeImpl(alphaDir);
    assert.equal(picked1, picked2, 'must be deterministic across runs');
    assert.ok(picked1.endsWith('big.mjs'), `expected big.mjs, got ${picked1}`);
  });

  test('pickRepresentativeImpl falls back to adapters/ when domain/ is empty', () => {
    const betaDir = join(FIXTURE_ROOT, 'modules', 'beta');
    const picked = pickRepresentativeImpl(betaDir);
    assert.ok(picked.endsWith('only-adapter.mjs'));
  });

  test('pickRepresentativeImpl returns null when no source dirs exist', () => {
    const deltaDir = join(FIXTURE_ROOT, 'modules', 'delta');
    assert.equal(pickRepresentativeImpl(deltaDir), null);
  });

  test('pickRepresentativeTest finds <name>.test.mjs in tests/unit/ first', () => {
    const dirs = [
      join(FIXTURE_ROOT, 'tests', 'unit'),
      join(FIXTURE_ROOT, 'tests', 'contract'),
    ];
    const picked = pickRepresentativeTest('alpha', dirs);
    assert.ok(picked && picked.endsWith('alpha.test.mjs'));
  });

  test('pickRepresentativeTest falls back to tests/contract/ when unit has no match', () => {
    const dirs = [
      join(FIXTURE_ROOT, 'tests', 'unit'),
      join(FIXTURE_ROOT, 'tests', 'contract'),
    ];
    const picked = pickRepresentativeTest('beta', dirs);
    assert.ok(picked && picked.endsWith('beta.test.mjs'));
  });

  test('pickRepresentativeTest matches hyphenated test names by prefix', () => {
    const dirs = [join(FIXTURE_ROOT, 'tests', 'unit')];
    const picked = pickRepresentativeTest('epsilon', dirs);
    assert.ok(picked && picked.endsWith('epsilon-extras.test.mjs'));
  });

  test('pickRepresentativeTest returns null when nothing matches', () => {
    const dirs = [join(FIXTURE_ROOT, 'tests', 'unit')];
    assert.equal(pickRepresentativeTest('does-not-exist', dirs), null);
  });

  test('pickRepresentativeTest returns null on falsy moduleName', () => {
    const dirs = [join(FIXTURE_ROOT, 'tests', 'unit')];
    assert.equal(pickRepresentativeTest('', dirs), null);
    assert.equal(pickRepresentativeTest(null, dirs), null);
  });

  test('measureWorkSurface aggregates token counts across the five surface parts', () => {
    const result = measureWorkSurface('alpha', { rootAbs: FIXTURE_ROOT });
    assert.equal(result.module, 'alpha');
    assert.ok(result.totalTokens > 0);
    assert.ok(result.parts.manifest > 0, 'manifest tokens missing');
    assert.ok(result.parts.publicApi > 0, 'publicApi tokens missing');
    assert.ok(result.parts.sidecars > 0, 'sidecars tokens missing');
    assert.ok(result.parts.impl > 0, 'impl tokens missing');
    assert.ok(result.parts.test > 0, 'test tokens missing');
    const sum =
      result.parts.manifest
      + result.parts.publicApi
      + result.parts.sidecars
      + result.parts.impl
      + result.parts.test;
    assert.equal(result.totalTokens, sum, 'totalTokens must equal sum of parts');
    assert.deepStrictEqual(result.missing, []);
    // File paths reported relative to rootAbs and POSIX-normalized
    assert.equal(result.files.manifest, 'modules/alpha/manifest.json');
    assert.equal(result.files.publicApi, 'modules/alpha/public-api.mjs');
    assert.ok(result.files.impl.endsWith('big.mjs'));
    assert.ok(result.files.test.endsWith('alpha.test.mjs'));
  });

  test('measureWorkSurface tolerates missing files (gamma — manifest-only)', () => {
    const result = measureWorkSurface('gamma', { rootAbs: FIXTURE_ROOT });
    assert.equal(result.module, 'gamma');
    assert.ok(result.parts.manifest > 0);
    assert.equal(result.parts.publicApi, 0);
    assert.equal(result.parts.sidecars, 0);
    assert.equal(result.parts.impl, 0);
    assert.equal(result.parts.test, 0);
    assert.ok(result.missing.includes('public-api'));
    assert.ok(result.missing.includes('sidecars'));
    assert.ok(result.missing.includes('impl'));
    assert.ok(result.missing.includes('test'));
  });

  test('measureWorkSurface on a non-existent module returns 0 + missing list', () => {
    const result = measureWorkSurface('does-not-exist', { rootAbs: FIXTURE_ROOT });
    assert.equal(result.totalTokens, 0);
    assert.ok(result.missing.length > 0);
  });

  test('discoverModuleNames lists fixture modules sorted', () => {
    const names = discoverModuleNames(FIXTURE_ROOT);
    assert.deepStrictEqual(names, ['alpha', 'beta', 'delta', 'epsilon', 'gamma']);
  });
});
