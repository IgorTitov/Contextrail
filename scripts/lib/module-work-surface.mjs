/* @HEADER
 * @version 0.7.103 | 2026-05-05
 * @purpose Shared library: compute the "work surface" token cost of a COA module (manifest + public API + sidecars + impl + test).
 * @sidecar module-work-surface.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public true
 * @edit careful
 */

// Single source of truth for work-surface file-discovery and token-counting
// used by both module-fit-check.mjs (enforcement) and the agent-context
// briefer (Tier-3 context scoping, TPL-292).
//
// Token approximation: Math.ceil(bytes / 4) — same convention used in
// docs/SYSTEM_MAP.md. NOT a real tokenizer; sufficient for relative-budget
// comparison (see docs/adr/0013-module-work-surface-budget.md).

import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));
// scripts/lib -> scripts -> repo root
const ROOT = resolve(__dirname, '..', '..');

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function safeReadText(absPath) {
  try {
    return readFileSync(absPath, 'utf8');
  } catch {
    return '';
  }
}

function lineCount(text) {
  if (!text) return 0;
  let n = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (text.charCodeAt(i) === 10) n += 1;
  }
  if (text.length > 0 && text.charCodeAt(text.length - 1) !== 10) n += 1;
  return n;
}

function listSourceFiles(dirAbs) {
  if (!existsSync(dirAbs)) return [];
  let entries;
  try {
    entries = readdirSync(dirAbs);
  } catch {
    return [];
  }
  const files = [];
  for (const name of entries) {
    if (name.startsWith('.')) continue;
    if (name.endsWith('.header.md')) continue;
    if (name.endsWith('.d.ts')) continue;
    if (name === 'README.md') continue;
    const full = join(dirAbs, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (!st.isFile()) continue;
    if (!/\.(mjs|js|cjs|ts|tsx)$/.test(name)) continue;
    files.push(full);
  }
  return files;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Approximate token count using the SYSTEM_MAP convention: ceil(bytes / 4).
 * Empty / null input returns 0. Non-string input is coerced via String().
 */
export function approximateTokenCount(text) {
  if (text === null || text === undefined) return 0;
  const s = typeof text === 'string' ? text : String(text);
  if (s.length === 0) return 0;
  const bytes = Buffer.byteLength(s, 'utf8');
  return Math.ceil(bytes / 4);
}

/**
 * Pick the most representative implementation file for a module.
 * Prefers the largest source file in domain/, falling back to adapters/.
 * Deterministic: ties break by name (ascending).
 *
 * Returns absolute path, or null if no candidate file exists.
 */
export function pickRepresentativeImpl(moduleDirAbs) {
  for (const sub of ['domain', 'adapters']) {
    const candidates = listSourceFiles(join(moduleDirAbs, sub));
    if (candidates.length === 0) continue;
    const scored = candidates.map((p) => ({
      path: p,
      lines: lineCount(safeReadText(p)),
    }));
    scored.sort((a, b) => {
      if (b.lines !== a.lines) return b.lines - a.lines;
      return a.path.localeCompare(b.path);
    });
    return scored[0].path;
  }
  return null;
}

/**
 * Pick the representative test file for a module.
 * Looks under tests/unit/, tests/contract/, tests/integration/, tests/bdd/
 * for a file whose name starts with `<moduleName>` (or `<moduleName>-`).
 * Deterministic: returns the first match in the configured priority order;
 * within a directory, sorts by name and picks the first.
 *
 * `testDirsAbs` is an array of absolute test directory paths in priority
 * order. `moduleName` is the bare module name (e.g. "auth", "ai-chat").
 */
export function pickRepresentativeTest(moduleName, testDirsAbs) {
  if (!moduleName) return null;
  const prefix = String(moduleName).toLowerCase();
  for (const dirAbs of testDirsAbs) {
    if (!existsSync(dirAbs)) continue;
    let names;
    try {
      names = readdirSync(dirAbs);
    } catch {
      continue;
    }
    const matches = names
      .filter((n) => n.endsWith('.test.mjs') || n.endsWith('.test.js'))
      .filter((n) => {
        const lower = n.toLowerCase();
        return lower === `${prefix}.test.mjs`
          || lower === `${prefix}.test.js`
          || lower.startsWith(`${prefix}-`)
          || lower.startsWith(`${prefix}.`);
      })
      .sort();
    if (matches.length > 0) return join(dirAbs, matches[0]);
  }
  return null;
}

/**
 * Measure the work-surface token cost of a single module.
 *
 * `moduleName` — bare module name (e.g. "auth").
 * `opts.rootAbs` — repo root absolute path (defaults to ROOT).
 * `opts.testDirsAbs` — array of absolute test directory paths in priority order.
 *
 * Returns a structured record:
 *   {
 *     module, totalTokens, parts: { manifest, publicApi, sidecars, impl, test },
 *     files: { manifest, publicApi, sidecars[], impl, test },
 *     missing: [string, ...]   // names of files that did not exist
 *   }
 *
 * Missing files contribute 0 tokens and are listed in `missing`. The function
 * never throws on a missing file — that is the most common shape of a
 * minimal template module.
 */
export function measureWorkSurface(moduleName, opts = {}) {
  const rootAbs = opts.rootAbs || ROOT;
  const testDirsAbs = opts.testDirsAbs || [
    join(rootAbs, 'tests', 'unit'),
    join(rootAbs, 'tests', 'contract'),
    join(rootAbs, 'tests', 'integration'),
    join(rootAbs, 'tests', 'bdd'),
  ];

  const moduleDirAbs = join(rootAbs, 'modules', moduleName);
  const missing = [];

  const manifestAbs = join(moduleDirAbs, 'manifest.json');
  const manifestText = safeReadText(manifestAbs);
  const manifestTokens = approximateTokenCount(manifestText);
  if (!existsSync(manifestAbs)) missing.push('manifest.json');

  // Public API: prefer .mjs, fall back to .d.ts (rare, but handle it).
  const publicApiCandidates = ['public-api.mjs', 'public-api.js', 'public-api.d.ts'];
  let publicApiAbs = null;
  for (const name of publicApiCandidates) {
    const full = join(moduleDirAbs, name);
    if (existsSync(full)) {
      publicApiAbs = full;
      break;
    }
  }
  const publicApiText = publicApiAbs ? safeReadText(publicApiAbs) : '';
  const publicApiTokens = approximateTokenCount(publicApiText);
  if (!publicApiAbs) missing.push('public-api');

  // Sidecars for the two public surface files.
  const sidecarPaths = [];
  if (existsSync(manifestAbs + '.header.md')) sidecarPaths.push(manifestAbs + '.header.md');
  if (publicApiAbs && existsSync(publicApiAbs + '.header.md')) sidecarPaths.push(publicApiAbs + '.header.md');
  let sidecarTokens = 0;
  for (const sc of sidecarPaths) sidecarTokens += approximateTokenCount(safeReadText(sc));
  if (sidecarPaths.length === 0) missing.push('sidecars');

  // Representative impl + test.
  const implAbs = pickRepresentativeImpl(moduleDirAbs);
  const implText = implAbs ? safeReadText(implAbs) : '';
  const implTokens = approximateTokenCount(implText);
  if (!implAbs) missing.push('impl');

  const testAbs = pickRepresentativeTest(moduleName, testDirsAbs);
  const testText = testAbs ? safeReadText(testAbs) : '';
  const testTokens = approximateTokenCount(testText);
  if (!testAbs) missing.push('test');

  const totalTokens = manifestTokens + publicApiTokens + sidecarTokens + implTokens + testTokens;

  const toRel = (abs) => abs ? abs.slice(rootAbs.length + 1).replaceAll('\\', '/') : null;

  return {
    module: moduleName,
    totalTokens,
    parts: {
      manifest: manifestTokens,
      publicApi: publicApiTokens,
      sidecars: sidecarTokens,
      impl: implTokens,
      test: testTokens,
    },
    files: {
      manifest: existsSync(manifestAbs) ? toRel(manifestAbs) : null,
      publicApi: toRel(publicApiAbs),
      sidecars: sidecarPaths.map(toRel),
      impl: toRel(implAbs),
      test: toRel(testAbs),
    },
    missing,
  };
}

/**
 * Compute distribution statistics over an array of token totals.
 * Returns { count, min, p50, p75, p95, max, mean }. Empty input → all 0.
 */
export function computeDistribution(totals) {
  const arr = Array.isArray(totals) ? totals.filter((n) => Number.isFinite(n)) : [];
  if (arr.length === 0) {
    return { count: 0, min: 0, p50: 0, p75: 0, p95: 0, max: 0, mean: 0 };
  }
  const sorted = [...arr].sort((a, b) => a - b);
  const pct = (p) => {
    if (sorted.length === 1) return sorted[0];
    const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
    return sorted[Math.max(0, idx)];
  };
  const sum = sorted.reduce((acc, n) => acc + n, 0);
  return {
    count: sorted.length,
    min: sorted[0],
    p50: pct(50),
    p75: pct(75),
    p95: pct(95),
    max: sorted[sorted.length - 1],
    mean: Math.round(sum / sorted.length),
  };
}

/**
 * List all .header.md sidecar paths for a module directory (recursive).
 * Returns relative paths from repoRoot, sorted for determinism.
 * Skips hidden directories and node_modules.
 *
 * Used by the agent-context briefer for Tier-3 medium-radius neighborhood.
 */
export function listModuleAllSidecars(moduleName, opts = {}) {
  const rootAbs = opts.rootAbs || ROOT;
  const moduleDirAbs = join(rootAbs, 'modules', moduleName);
  if (!existsSync(moduleDirAbs)) return [];

  const result = [];

  function walk(dirAbs) {
    let entries;
    try {
      entries = readdirSync(dirAbs);
    } catch {
      return;
    }
    for (const name of entries) {
      if (name.startsWith('.') || name === 'node_modules') continue;
      const full = join(dirAbs, name);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        walk(full);
      } else if (name.endsWith('.header.md')) {
        // Return relative path from repoRoot using forward slashes
        result.push(full.slice(rootAbs.length + 1).replaceAll('\\', '/'));
      }
    }
  }

  walk(moduleDirAbs);
  result.sort();
  return result;
}

/**
 * Discover the direct module-to-module dependencies of a given module.
 * Reads manifest.json `dependencies.modules` array.
 * Returns an array of module names (strings). Returns [] if manifest is missing or has no deps.
 *
 * Used by the agent-context briefer for Tier-3 large-radius neighborhood (1-hop cross-module).
 */
export function discoverDirectModuleDependencies(moduleName, opts = {}) {
  const rootAbs = opts.rootAbs || ROOT;
  const manifestAbs = join(rootAbs, 'modules', moduleName, 'manifest.json');
  if (!existsSync(manifestAbs)) return [];
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestAbs, 'utf8'));
  } catch {
    return [];
  }
  const deps = manifest?.dependencies?.modules;
  if (!Array.isArray(deps)) return [];
  return deps.filter(d => typeof d === 'string');
}

/**
 * Discover module names by listing modules/ subdirectories.
 */
export function discoverModuleNames(rootAbs = ROOT) {
  const modulesDir = join(rootAbs, 'modules');
  if (!existsSync(modulesDir)) return [];
  let entries;
  try {
    entries = readdirSync(modulesDir);
  } catch {
    return [];
  }
  const names = [];
  for (const name of entries) {
    if (name.startsWith('.') || name === 'README.md') continue;
    const full = join(modulesDir, name);
    try {
      if (statSync(full).isDirectory()) names.push(name);
    } catch {
      // skip
    }
  }
  return names.sort();
}
