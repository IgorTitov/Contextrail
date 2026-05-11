#!/usr/bin/env node
/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Trace ES module imports from an entry file via regex-based static analysis and determine which files and module directories are reachable.
 * @sidecar import-graph.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Import-graph analyzer — traces ES module imports from an entry file
 * and determines which files and module directories are reachable.
 *
 * Zero external dependencies. Uses only Node.js built-in fs/path APIs.
 * Regex-based parsing — does not use an AST parser.
 *
 * Programmatic API:
 *   import { analyzeImportGraph, parseImports } from './import-graph.mjs';
 *   const { files, modules, unresolvedImports } = await analyzeImportGraph(entry, options);
 *
 * CLI:
 *   node scripts/import-graph.mjs <entry-file> [--modules-dir <dir>]
 *
 * SpecRefs: TPL-094
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Node.js built-in module names (skip these during resolution)
// ---------------------------------------------------------------------------

const NODE_BUILTINS = new Set([
  'assert',
  'assert/strict',
  'async_hooks',
  'buffer',
  'child_process',
  'cluster',
  'console',
  'constants',
  'crypto',
  'dgram',
  'diagnostics_channel',
  'dns',
  'domain',
  'events',
  'fs',
  'fs/promises',
  'http',
  'http2',
  'https',
  'inspector',
  'module',
  'net',
  'os',
  'path',
  'path/posix',
  'path/win32',
  'perf_hooks',
  'process',
  'punycode',
  'querystring',
  'readline',
  'readline/promises',
  'repl',
  'stream',
  'stream/consumers',
  'stream/promises',
  'stream/web',
  'string_decoder',
  'sys',
  'test',
  'timers',
  'timers/promises',
  'tls',
  'trace_events',
  'tty',
  'url',
  'util',
  'util/types',
  'v8',
  'vm',
  'wasi',
  'worker_threads',
  'zlib',
]);

/**
 * Check whether a specifier refers to a Node.js built-in.
 * @param {string} spec
 * @returns {boolean}
 */
function isBuiltin(spec) {
  if (spec.startsWith('node:')) return true;
  return NODE_BUILTINS.has(spec);
}

// ---------------------------------------------------------------------------
// parseImports() — regex-based extraction
// ---------------------------------------------------------------------------

/**
 * Extract import/export specifiers from ES module source code.
 *
 * Handles:
 *  - import { x } from '...'
 *  - import x from '...'
 *  - import * as x from '...'
 *  - import '...'
 *  - export { x } from '...'
 *  - export * from '...'
 *  - await import('...')  /  import('...')
 *
 * Skips single-line commented-out imports. Skips Node.js built-ins.
 *
 * @param {string} source — file contents
 * @returns {string[]} — ordered list of unique import specifiers
 */
export function parseImports(source) {
  const specifiers = [];
  const seen = new Set();

  // Process line by line to skip single-line comments
  const lines = source.split('\n');
  for (const line of lines) {
    const trimmed = line.trimStart();
    // Skip single-line comment lines
    if (trimmed.startsWith('//')) continue;

    // Static: import ... from '...' or export ... from '...'
    const staticRe = /(?:import|export)\s+(?:[\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g;
    let m;
    while ((m = staticRe.exec(line)) !== null) {
      const spec = m[1];
      if (!isBuiltin(spec) && !seen.has(spec)) {
        seen.add(spec);
        specifiers.push(spec);
      }
    }

    // Side-effect: import '...'
    const sideEffectRe = /import\s+['"]([^'"]+)['"]/g;
    while ((m = sideEffectRe.exec(line)) !== null) {
      const spec = m[1];
      if (!isBuiltin(spec) && !seen.has(spec)) {
        seen.add(spec);
        specifiers.push(spec);
      }
    }

    // Dynamic: import('...')
    const dynamicRe = /import\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((m = dynamicRe.exec(line)) !== null) {
      const spec = m[1];
      if (!isBuiltin(spec) && !seen.has(spec)) {
        seen.add(spec);
        specifiers.push(spec);
      }
    }
  }

  return specifiers;
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

/**
 * Try to resolve a specifier to an absolute file path.
 *
 * @param {string} specifier
 * @param {string} importerDir — directory of the importing file
 * @returns {string|null} — resolved absolute path or null
 */
function resolveSpecifier(specifier, importerDir) {
  // Only resolve relative specifiers (./ or ../)
  if (!specifier.startsWith('.')) return null;

  const candidate = resolve(importerDir, specifier);

  // Try exact path first
  if (existsSync(candidate)) return candidate;

  // Try adding .mjs / .js extensions
  for (const ext of ['.mjs', '.js']) {
    const withExt = candidate + ext;
    if (existsSync(withExt)) return withExt;
  }

  // Try index files
  for (const idx of ['index.mjs', 'index.js']) {
    const indexPath = join(candidate, idx);
    if (existsSync(indexPath)) return indexPath;
  }

  return null;
}

// ---------------------------------------------------------------------------
// analyzeImportGraph()
// ---------------------------------------------------------------------------

/**
 * Analyze the import graph starting from an entry file.
 *
 * @param {string} entryPath — absolute path to the entry file
 * @param {object} [options]
 * @param {string} [options.modulesDir] — absolute path to the modules/ directory
 * @returns {Promise<{ files: Set<string>, modules: Set<string>, unresolvedImports: Array<{file: string, specifier: string}> }>}
 */
export async function analyzeImportGraph(entryPath, options = {}) {
  const entry = resolve(entryPath);
  const modulesDir = options.modulesDir ? resolve(options.modulesDir) : null;

  /** @type {Set<string>} */
  const files = new Set();
  /** @type {Set<string>} */
  const modules = new Set();
  /** @type {Array<{file: string, specifier: string}>} */
  const unresolvedImports = [];

  /**
   * @param {string} filePath
   */
  function visit(filePath) {
    const normalized = resolve(filePath);
    if (files.has(normalized)) return; // already visited (handles circular imports)
    files.add(normalized);

    // Track which module directory this file belongs to
    if (modulesDir) {
      const rel = relative(modulesDir, normalized);
      if (!rel.startsWith('..') && !rel.startsWith(sep)) {
        const moduleName = rel.split(/[\\/]/)[0];
        if (moduleName) modules.add(moduleName);
      }
    }

    let source;
    try {
      source = readFileSync(normalized, 'utf-8');
    } catch {
      return; // file unreadable — already added to files set, move on
    }

    const specifiers = parseImports(source);
    const dir = dirname(normalized);

    for (const spec of specifiers) {
      if (isBuiltin(spec)) continue;

      const resolved = resolveSpecifier(spec, dir);
      if (resolved) {
        visit(resolved);
      } else {
        unresolvedImports.push({ file: normalized, specifier: spec });
      }
    }
  }

  visit(entry);

  return { files, modules, unresolvedImports };
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const isDirectRun = process.argv[1] && resolve(process.argv[1]) === resolve(__filename);

if (isDirectRun) {
  const args = process.argv.slice(2);
  let entryFile = null;
  let modulesDir = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--modules-dir' && args[i + 1]) {
      modulesDir = resolve(args[++i]);
    } else if (!args[i].startsWith('-')) {
      entryFile = resolve(args[i]);
    }
  }

  if (!entryFile) {
    console.error('Usage: node scripts/import-graph.mjs <entry-file> [--modules-dir <dir>]');
    process.exit(1);
  }

  if (!existsSync(entryFile)) {
    console.error(`Entry file not found: ${entryFile}`);
    process.exit(1);
  }

  const ROOT = resolve(dirname(__filename), '..');
  if (!modulesDir && existsSync(join(ROOT, 'modules'))) {
    modulesDir = join(ROOT, 'modules');
  }

  const opts = {};
  if (modulesDir) opts.modulesDir = modulesDir;

  const result = await analyzeImportGraph(entryFile, opts);

  console.log(`\nImport graph for: ${relative(process.cwd(), entryFile)}`);
  console.log(`${'─'.repeat(60)}`);
  console.log(`Reachable files: ${result.files.size}`);

  if (result.modules.size > 0) {
    console.log(`\nReferenced modules (${result.modules.size}):`);
    for (const mod of [...result.modules].sort()) {
      console.log(`  + ${mod}`);
    }
  }

  if (result.unresolvedImports.length > 0) {
    console.log(`\nUnresolved imports (${result.unresolvedImports.length}):`);
    for (const u of result.unresolvedImports) {
      console.log(`  ? ${u.specifier} (from ${relative(process.cwd(), u.file)})`);
    }
  }

  console.log('');
}
