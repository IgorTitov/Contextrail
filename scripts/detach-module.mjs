#!/usr/bin/env node
/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose CLI tool that reads module manifests, validates the dependency graph, and safely removes a named hex module along with its test files from the template repository.
 * @sidecar detach-module.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Module detachment CLI script.
 * Safely removes a hex module and its associated test files from the template.
 *
 * Usage:
 *   node scripts/detach-module.mjs <module-name> [--dry-run] [--force]
 *   node scripts/detach-module.mjs --list
 *
 * SpecRefs: TPL-131
 */

import { readFileSync, rmSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const MODULES_DIR = join(ROOT, 'modules');

// ---------------------------------------------------------------------------
// Manifest loading
// ---------------------------------------------------------------------------

/**
 * @typedef {{ name: string; description?: string; exports: string[]; dependencies: { modules: string[]; external: string[]; builtins: string[] }; testFiles: string[] }} ModuleManifest
 */

/**
 * Load all module manifests from each module's manifest.json.
 * @returns {Map<string, ModuleManifest>}
 */
export function loadManifests() {
  /** @type {Map<string, ModuleManifest>} */
  const manifests = new Map();
  let entries;
  try {
    entries = readdirSync(MODULES_DIR, { withFileTypes: true });
  } catch {
    return manifests;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const manifestPath = join(MODULES_DIR, entry.name, 'manifest.json');
    if (!existsSync(manifestPath)) {
      console.warn(`  warn: ${entry.name}/ has no manifest.json — skipping`);
      continue;
    }
    try {
      const raw = readFileSync(manifestPath, 'utf-8');
      const manifest = JSON.parse(raw);
      manifests.set(manifest.name || entry.name, manifest);
    } catch (err) {
      console.warn(`  warn: failed to parse ${manifestPath}: ${err.message}`);
    }
  }
  return manifests;
}

/**
 * Build a reverse dependency map: module name -> modules that depend on it.
 * @param {Map<string, ModuleManifest>} manifests
 * @returns {Map<string, string[]>}
 */
export function buildDependentMap(manifests) {
  /** @type {Map<string, string[]>} */
  const dependents = new Map();
  for (const [name] of manifests) dependents.set(name, []);
  for (const [name, manifest] of manifests) {
    for (const dep of manifest.dependencies.modules) {
      if (!dependents.has(dep)) dependents.set(dep, []);
      dependents.get(dep).push(name);
    }
  }
  return dependents;
}

/**
 * Scan docs/backlog/ for module_ref references.
 * @param {string} moduleName
 * @returns {string[]}
 */
export function findBacklogReferences(moduleName, rootDir = ROOT) {
  const backlogDir = join(rootDir, 'docs', 'backlog');
  if (!existsSync(backlogDir)) return [];
  /** @type {string[]} */
  const refs = [];
  try {
    for (const file of readdirSync(backlogDir)) {
      if (!file.endsWith('.md')) continue;
      const content = readFileSync(join(backlogDir, file), 'utf-8');
      if (content.includes(`module_ref: ${moduleName}`)) {
        refs.push(`docs/backlog/${file}`);
      }
    }
  } catch {
    /* ignore */
  }
  return refs;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * List all modules with dependency status.
 * @param {Map<string, ModuleManifest>} manifests
 */
function listModules(manifests) {
  const dependents = buildDependentMap(manifests);
  console.log('\nModules in this template:\n');
  for (const [name, manifest] of manifests) {
    const deps = manifest.dependencies.modules;
    const revDeps = dependents.get(name) || [];
    const depsStr = deps.length ? `depends on: ${deps.join(', ')}` : 'standalone';
    const revStr = revDeps.length
      ? `depended on by: ${revDeps.join(', ')}`
      : 'leaf (safe to remove)';
    console.log(`  ${name}`);
    console.log(`    ${depsStr}`);
    console.log(`    ${revStr}`);
    if (manifest.description) console.log(`    ${manifest.description}`);
    console.log();
  }
}

/**
 * Detach a module.
 * @param {string} moduleName
 * @param {Map<string, ModuleManifest>} manifests
 * @param {{ dryRun: boolean; force: boolean }} options
 * @returns {number} exit code
 */
export function detachModule(moduleName, manifests, options) {
  const manifest = manifests.get(moduleName);
  if (!manifest) {
    console.error(`Error: module "${moduleName}" not found in modules/.`);
    console.error('Available modules: ' + [...manifests.keys()].join(', '));
    return 1;
  }

  const dependents = buildDependentMap(manifests);
  const revDeps = dependents.get(moduleName) || [];

  if (revDeps.length > 0 && !options.force) {
    console.error(`Error: cannot detach "${moduleName}" — the following modules depend on it:`);
    for (const dep of revDeps) console.error(`  - ${dep}`);
    console.error('\nUse --force to proceed anyway, or detach dependents first.');
    return 1;
  }

  if (revDeps.length > 0 && options.force) {
    console.warn(
      `Warning: forcing detachment of "${moduleName}" despite dependents: ${revDeps.join(', ')}`,
    );
  }

  const prefix = options.dryRun ? '[dry-run] ' : '';

  // Collect files to remove
  const moduleDir = join(MODULES_DIR, moduleName);
  /** @type {string[]} */
  const removedPaths = [];

  // Module directory
  if (existsSync(moduleDir) && statSync(moduleDir).isDirectory()) {
    console.log(`${prefix}Remove directory: ${relative(ROOT, moduleDir)}/`);
    removedPaths.push(moduleDir);
    if (!options.dryRun) {
      rmSync(moduleDir, { recursive: true, force: true });
    }
  }

  // Test files
  for (const testFile of manifest.testFiles) {
    const testPath = join(ROOT, testFile);
    if (existsSync(testPath)) {
      console.log(`${prefix}Remove test file: ${testFile}`);
      removedPaths.push(testPath);
      if (!options.dryRun) {
        rmSync(testPath, { force: true });
      }
    } else {
      console.log(`${prefix}Test file not found (skip): ${testFile}`);
    }
  }

  // Check backlog references
  const backlogRefs = findBacklogReferences(moduleName);
  if (backlogRefs.length > 0) {
    console.log(`\n${prefix}Backlog files referencing "${moduleName}":`);
    for (const ref of backlogRefs) console.log(`  - ${ref}`);
    console.log('  (manual cleanup may be needed)');
  }

  // Summary
  console.log(`\n${prefix}Summary:`);
  console.log(`  Module directory removed: modules/${moduleName}/`);
  console.log(`  Test files removed: ${manifest.testFiles.length}`);
  console.log(`  Total paths affected: ${removedPaths.length}`);

  if (options.dryRun) {
    console.log('\n  No files were actually removed (dry-run mode).');
  } else {
    console.log('\n  Manual follow-up:');
    console.log('  - Remove any imports of this module from app shell or other wiring code');
    console.log('  - Update docs/backlog/ if the module had active backlog items');
    console.log('  - Run tests to verify no broken imports remain');
  }

  return 0;
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter((a) => a.startsWith('--')));
  const positional = args.filter((a) => !a.startsWith('--'));

  if (flags.has('--help') || args.length === 0) {
    console.log('Usage:');
    console.log('  node scripts/detach-module.mjs <module-name> [--dry-run] [--force]');
    console.log('  node scripts/detach-module.mjs --list');
    console.log();
    console.log('Options:');
    console.log('  --list      Show all modules with dependency status');
    console.log('  --dry-run   Show what would be removed without doing it');
    console.log('  --force     Proceed even if other modules depend on this one');
    console.log('  --help      Show this help message');
    process.exit(0);
  }

  const manifests = loadManifests();

  if (flags.has('--list')) {
    listModules(manifests);
    process.exit(0);
  }

  const moduleName = positional[0];
  if (!moduleName) {
    console.error('Error: module name is required. Use --list to see available modules.');
    process.exit(1);
  }

  const exitCode = detachModule(moduleName, manifests, {
    dryRun: flags.has('--dry-run'),
    force: flags.has('--force'),
  });
  process.exit(exitCode);
}

// Only run CLI when executed directly
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  main();
}
