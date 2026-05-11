#!/usr/bin/env node
/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Copy starter app files into a self-contained dist/ folder with mode-appropriate configuration.
 * @sidecar build-single.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Build script — copies the starter app into a self-contained dist/ folder
 * configured for the specified deployment mode.
 *
 * No bundler dependency. Uses only Node.js built-in fs APIs.
 *
 * Usage:
 *   node scripts/build-single.mjs --mode pwa
 *   node scripts/build-single.mjs --mode local
 *   node scripts/build-single.mjs --mode hosted
 *   node scripts/build-single.mjs --mode electron
 *
 * Options:
 *   --mode <mode>   Target deployment mode (default: hosted)
 *   --out <dir>     Output directory (default: dist)
 *   --clean         Remove output directory before build
 *   --treeshake     Copy only modules referenced in the import graph
 *
 * SpecRefs: TPL-032; TPL-095; TPL-188
 */

import {
  existsSync,
  mkdirSync,
  rmSync,
  cpSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
} from 'node:fs';
import { join, resolve, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseImports } from './import-graph.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const VALID_MODES = new Set(['hosted', 'pwa', 'local', 'electron', 'extension']);

/**
 * Parse CLI arguments.
 *
 * @param {string[]} argv
 * @returns {{ mode: string, outDir: string, clean: boolean, treeshake: boolean }}
 */
export function parseArgs(argv) {
  let mode = 'hosted';
  let outDir = 'dist';
  let clean = false;
  let treeshake = false;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--mode' && argv[i + 1]) {
      mode = argv[++i];
    } else if (argv[i] === '--out' && argv[i + 1]) {
      outDir = argv[++i];
    } else if (argv[i] === '--clean') {
      clean = true;
    } else if (argv[i] === '--treeshake') {
      treeshake = true;
    }
  }

  if (!VALID_MODES.has(mode)) {
    throw new Error(`Unknown mode: ${mode}. Expected one of: ${[...VALID_MODES].join(', ')}`);
  }

  return { mode, outDir, clean, treeshake };
}

/**
 * Get the list of source directories and files to copy.
 *
 * @param {string} mode
 * @returns {string[]} — paths relative to apps/starter/
 */
export function getSourcePaths(mode) {
  const paths = [
    'app-config.mjs',
    'app.mjs',
    'messages.mjs',
    'ui-selectors.mjs',
    'index.html',
    'error-boundary',
    'layout',
    'loading-states',
    'locales',
    'navigation',
    'notifications',
    'theme-toggle',
    'platform',
  ];

  // PWA-specific files
  if (mode === 'pwa') {
    paths.push('manifest.json', 'sw.mjs', 'icons', 'pwa');
  }

  return paths;
}

/**
 * Assemble the browser-extension scaffold into the output directory.
 *
 * Copies templates/extension/ files (manifest.json, background.mjs, popup.html)
 * alongside the starter app output and substitutes the {{PROJECT_NAME}} token
 * in manifest.json with the project name from the root package.json.
 *
 * @param {string} root — project root
 * @param {string} outDir — absolute output directory
 */
function assembleExtensionScaffold(root, outDir) {
  const extSource = join(root, 'templates', 'extension');
  if (!existsSync(extSource)) return;

  const files = ['manifest.json', 'background.mjs', 'popup.html'];
  for (const name of files) {
    const src = join(extSource, name);
    if (!existsSync(src)) continue;
    cpSync(src, join(outDir, name));
  }

  // Substitute {{PROJECT_NAME}} placeholder in manifest.json
  const manifestPath = join(outDir, 'manifest.json');
  if (existsSync(manifestPath)) {
    let projectName = 'contextrail-app';
    const pkgPath = join(root, 'package.json');
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        if (pkg && typeof pkg.name === 'string') projectName = pkg.name;
      } catch {
        /* fall back to default */
      }
    }
    const raw = readFileSync(manifestPath, 'utf-8');
    const patched = raw.replace(/\{\{PROJECT_NAME\}\}/g, projectName);
    if (patched !== raw) writeFileSync(manifestPath, patched, 'utf-8');
  }
}

/**
 * Patch the HTML entry point for the target mode.
 *
 * - PWA mode: uncomment the app-mode meta tag
 * - Local mode: no changes needed (file:// auto-detected)
 * - Other modes: leave as-is
 *
 * @param {string} html — the original HTML content
 * @param {string} mode
 * @returns {string}
 */
export function patchHtml(html, mode) {
  if (mode === 'pwa') {
    // Uncomment the PWA meta tag
    return html.replace(
      /<!--\s*<meta\s+name="app-mode"\s+content="pwa"\s*\/?>\s*-->/,
      '<meta name="app-mode" content="pwa" />',
    );
  }
  return html;
}

// ---------------------------------------------------------------------------
// Import-graph traversal (synchronous, in-process)
// ---------------------------------------------------------------------------

/**
 * List immediate subdirectory names in a directory.
 *
 * @param {string} dir
 * @returns {string[]}
 */
function listSubdirectories(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((entry) => {
    try {
      return statSync(join(dir, entry)).isDirectory();
    } catch {
      return false;
    }
  });
}

/**
 * Synchronous import-graph traversal using parseImports from import-graph.mjs.
 *
 * @param {string} entryFile — absolute path to the entry file
 * @param {string} modulesDir — absolute path to the modules/ directory
 * @returns {{ modules: Set<string> }}
 */
function traceReferencedModules(entryFile, modulesDir) {
  const visited = new Set();
  const modules = new Set();

  /**
   * @param {string} filePath
   */
  function visit(filePath) {
    const normalized = resolve(filePath);
    if (visited.has(normalized)) return;
    visited.add(normalized);

    // Track which module directory this file belongs to
    const rel = relative(modulesDir, normalized);
    if (!rel.startsWith('..') && !rel.startsWith(sep)) {
      const moduleName = rel.split(/[\\/]/)[0];
      if (moduleName) modules.add(moduleName);
    }

    let source;
    try {
      source = readFileSync(normalized, 'utf-8');
    } catch {
      return;
    }

    const specifiers = parseImports(source);
    const fileDir = dirname(normalized);

    for (const spec of specifiers) {
      if (!spec.startsWith('.')) continue;

      const candidate = resolve(fileDir, spec);
      let resolved = null;

      if (existsSync(candidate)) {
        resolved = candidate;
      } else {
        for (const ext of ['.mjs', '.js']) {
          const withExt = candidate + ext;
          if (existsSync(withExt)) {
            resolved = withExt;
            break;
          }
        }
      }
      if (!resolved) {
        for (const idx of ['index.mjs', 'index.js']) {
          const indexPath = join(candidate, idx);
          if (existsSync(indexPath)) {
            resolved = indexPath;
            break;
          }
        }
      }

      if (resolved) visit(resolved);
    }
  }

  visit(entryFile);
  return { modules };
}

// ---------------------------------------------------------------------------
// build()
// ---------------------------------------------------------------------------

/**
 * Run the build.
 *
 * @param {object} options
 * @param {string} options.mode
 * @param {string} options.outDir — relative to project root
 * @param {boolean} options.clean
 * @param {boolean} [options.treeshake] — only copy referenced modules
 * @param {string} [options.root] — project root override for testing
 * @returns {{ outDir: string, fileCount: number, includedModules?: string[], prunedModules?: string[] }}
 */
export function build(options) {
  const { mode, clean, treeshake } = options;
  const root = options.root || ROOT;
  const outDir = resolve(root, options.outDir);
  const starterDir = join(root, 'apps', 'starter');

  // Clean if requested
  if (clean && existsSync(outDir)) {
    rmSync(outDir, { recursive: true });
  }

  // Create output directory
  mkdirSync(outDir, { recursive: true });

  // Copy modules — optionally pruned via import-graph analysis
  const modulesSource = join(root, 'modules');
  const modulesDest = join(outDir, 'modules');
  let includedModules;
  let prunedModules;

  if (treeshake && existsSync(modulesSource)) {
    const entryFile = join(starterDir, 'app.mjs');
    const { modules: referencedSet } = traceReferencedModules(entryFile, modulesSource);

    const allModuleDirs = listSubdirectories(modulesSource);
    includedModules = allModuleDirs.filter((d) => referencedSet.has(d)).sort();
    prunedModules = allModuleDirs.filter((d) => !referencedSet.has(d)).sort();

    mkdirSync(modulesDest, { recursive: true });
    for (const mod of includedModules) {
      const src = join(modulesSource, mod);
      const dest = join(modulesDest, mod);
      cpSync(src, dest, { recursive: true });
    }
  } else if (existsSync(modulesSource)) {
    cpSync(modulesSource, modulesDest, { recursive: true });
  }

  // Copy starter app files
  const sourcePaths = getSourcePaths(mode);
  let fileCount = 0;

  for (const relPath of sourcePaths) {
    const src = join(starterDir, relPath);
    if (!existsSync(src)) continue;

    const dest = join(outDir, relPath);
    cpSync(src, dest, { recursive: true });
    fileCount++;
  }

  // Assemble extension scaffold files from templates/extension/
  if (mode === 'extension') {
    assembleExtensionScaffold(root, outDir);
  }

  // Patch index.html for the target mode
  const htmlPath = join(outDir, 'index.html');
  if (existsSync(htmlPath)) {
    const html = readFileSync(htmlPath, 'utf-8');
    const patched = patchHtml(html, mode);
    if (patched !== html) {
      writeFileSync(htmlPath, patched, 'utf-8');
    }
  }

  const result = { outDir, fileCount };
  if (treeshake) {
    result.includedModules = includedModules;
    result.prunedModules = prunedModules;
  }
  return result;
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

const isDirectRun =
  process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const result = build(options);

    let summary = `Build complete: ${result.fileCount} entries copied to ${result.outDir} (mode: ${options.mode})`;
    if (options.treeshake && result.includedModules) {
      summary += `\n  Included modules (${result.includedModules.length}): ${result.includedModules.join(', ') || 'none'}`;
      summary += `\n  Pruned modules (${result.prunedModules.length}): ${result.prunedModules.join(', ') || 'none'}`;
    }
    console.log(summary);
  } catch (err) {
    console.error(`Build failed: ${err.message}`);
    process.exit(1);
  }
}
