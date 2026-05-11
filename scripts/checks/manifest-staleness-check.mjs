/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Detect manifest.json files whose declared structure drifts from the actual filesystem.
 * @sidecar manifest-staleness-check.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ROOT, parseArgs } from './_shared.mjs';

const args = parseArgs();
const wantJson = args.has('--json');
const MODULES_DIR = join(ROOT, 'modules');

function getModuleDirs() {
  return readdirSync(MODULES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

function getActualFiles(moduleDir) {
  const files = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (
        entry.name.endsWith('.mjs') ||
        entry.name.endsWith('.ts') ||
        entry.name.endsWith('.d.ts')
      ) {
        files.push(relative(join(MODULES_DIR, moduleDir), full).replace(/\\/g, '/'));
      }
    }
  }
  walk(join(MODULES_DIR, moduleDir));
  return files.sort();
}

function getActualLayers(moduleDir) {
  const layers = new Set();
  const base = join(MODULES_DIR, moduleDir);
  for (const name of ['domain', 'ports', 'adapters', 'application', 'di']) {
    if (existsSync(join(base, name)) && statSync(join(base, name)).isDirectory()) {
      layers.add(name);
    }
  }
  return layers;
}

const warnings = [];

for (const mod of getModuleDirs()) {
  const manifestPath = join(MODULES_DIR, mod, 'manifest.json');
  if (!existsSync(manifestPath)) {
    warnings.push({ module: mod, issue: 'missing manifest.json' });
    continue;
  }

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch {
    warnings.push({ module: mod, issue: 'manifest.json parse error' });
    continue;
  }

  // Check declared fileCount vs actual
  const actualFiles = getActualFiles(mod);
  if (manifest.structure && typeof manifest.structure.fileCount === 'number') {
    const drift = Math.abs(manifest.structure.fileCount - actualFiles.length);
    if (drift > 0) {
      warnings.push({
        module: mod,
        issue: `fileCount drift: manifest says ${manifest.structure.fileCount}, actual ${actualFiles.length}`,
      });
    }
  }

  // Check declared layers vs actual directories
  const actualLayers = getActualLayers(mod);
  if (manifest.structure && Array.isArray(manifest.structure.layers)) {
    const declared = new Set(manifest.structure.layers);
    for (const layer of actualLayers) {
      if (!declared.has(layer)) {
        warnings.push({ module: mod, issue: `undeclared layer directory: ${layer}/` });
      }
    }
    for (const layer of declared) {
      if (!actualLayers.has(layer)) {
        warnings.push({ module: mod, issue: `declared layer missing on disk: ${layer}/` });
      }
    }
  }
}

if (wantJson) {
  console.log(JSON.stringify({ warningCount: warnings.length, warnings }, null, 2));
} else if (warnings.length > 0) {
  console.error(`manifest-staleness-check: ${warnings.length} warning(s):\n`);
  for (const w of warnings) {
    console.error(`  ${w.module}: ${w.issue}`);
  }
  process.exit(1);
} else {
  console.log(`manifest-staleness-check: OK — ${getModuleDirs().length} manifests checked`);
}
