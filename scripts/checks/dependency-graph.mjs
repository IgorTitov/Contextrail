/* @HEADER
 * @version 0.8.9 | 2026-05-11
 * @purpose Generate docs/_generated/dependency-graph.json — the single merged dependency surface (forward deps, reverse deps, consumer edges, layers).
 * @sidecar dependency-graph.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// Merges two previously separate dependency surfaces into one:
//
// 1. Forward/reverse dependency edges (from module manifests)
// 2. Consumer edges — which files import each module's public-api
//    (from walking source roots for import statements)
//
// Usage:
//   node scripts/checks/dependency-graph.mjs           # write artifact
//   node scripts/checks/dependency-graph.mjs --check   # fail if stale
//   node scripts/checks/dependency-graph.mjs --json    # print to stdout

import path from 'node:path';
import { toPosix, readText, ensureWriteIfChanged, walk, fileExists } from '../lib/fs-helpers.mjs';

const args = new Set(process.argv.slice(2));
const CHECK = args.has('--check');
const JSON_ONLY = args.has('--json');
const OUT = 'docs/_generated/dependency-graph.json';

// ---------------------------------------------------------------------------
// 1. Read all module manifests
// ---------------------------------------------------------------------------

async function collectManifests() {
  const modules = {};
  if (!fileExists('modules')) return modules;

  const entries = await walk('modules');
  const moduleNames = new Set();
  for (const entry of entries) {
    const m = toPosix(entry).match(/^modules\/([^/]+)\//);
    if (m) moduleNames.add(m[1]);
  }

  for (const name of [...moduleNames].sort()) {
    const manifestPath = `modules/${name}/manifest.json`;
    if (!fileExists(manifestPath)) continue;
    try {
      const raw = await readText(manifestPath);
      modules[name] = JSON.parse(raw);
    } catch {
      continue;
    }
  }
  return modules;
}

// ---------------------------------------------------------------------------
// 2. Compute forward/reverse dependency edges
// ---------------------------------------------------------------------------

function computeDependencyEdges(modules) {
  const dependsOn = {};
  const dependedBy = {};

  for (const name of Object.keys(modules)) {
    dependsOn[name] = modules[name].dependencies?.modules || [];
    dependedBy[name] = [];
  }

  for (const [name, deps] of Object.entries(dependsOn)) {
    for (const dep of deps) {
      if (dependedBy[dep]) {
        dependedBy[dep].push(name);
      }
    }
  }

  return { dependsOn, dependedBy };
}

// ---------------------------------------------------------------------------
// 3. Compute topological layers
// ---------------------------------------------------------------------------

function computeLayers(modules, dependsOn) {
  const layers = [];
  const assigned = new Set();

  while (assigned.size < Object.keys(modules).length) {
    const layer = [];
    for (const name of Object.keys(modules)) {
      if (assigned.has(name)) continue;
      const deps = dependsOn[name];
      if (deps.every((d) => assigned.has(d))) {
        layer.push(name);
      }
    }
    if (layer.length === 0) break; // cycle guard
    layer.sort();
    layers.push(layer);
    for (const name of layer) assigned.add(name);
  }

  return layers;
}

// ---------------------------------------------------------------------------
// 4. Compute safe removal order (leaves first)
// ---------------------------------------------------------------------------

function computeRemovalOrder(modules, dependedBy) {
  const remaining = new Set(Object.keys(modules));
  const removalOrder = [];

  while (remaining.size > 0) {
    const leaves = [];
    for (const name of remaining) {
      const hasDependents = dependedBy[name].some((d) => remaining.has(d));
      if (!hasDependents) leaves.push(name);
    }
    if (leaves.length === 0) break; // cycle guard
    leaves.sort();
    removalOrder.push(...leaves);
    for (const name of leaves) remaining.delete(name);
  }

  return removalOrder;
}

// ---------------------------------------------------------------------------
// 4b. Compute transitive dependencies and max dependency depth
// ---------------------------------------------------------------------------

function computeTransitiveDeps(dependsOn) {
  const cache = {};

  function resolve(name, visited = new Set()) {
    if (cache[name]) return cache[name];
    if (visited.has(name)) return new Set(); // cycle
    visited.add(name);

    const transitive = new Set();
    for (const dep of dependsOn[name] || []) {
      transitive.add(dep);
      for (const t of resolve(dep, new Set(visited))) {
        transitive.add(t);
      }
    }
    cache[name] = transitive;
    return transitive;
  }

  const result = {};
  for (const name of Object.keys(dependsOn)) {
    const t = resolve(name);
    result[name] = [...t].sort();
  }
  return result;
}

function computeMaxDepth(dependsOn) {
  const cache = {};

  function depth(name, visited = new Set()) {
    if (cache[name] !== undefined) return cache[name];
    if (visited.has(name)) return 0; // cycle
    visited.add(name);

    const deps = dependsOn[name] || [];
    if (deps.length === 0) {
      cache[name] = 0;
      return 0;
    }
    const maxChild = Math.max(...deps.map((d) => depth(d, new Set(visited))));
    cache[name] = maxChild + 1;
    return cache[name];
  }

  const depths = {};
  for (const name of Object.keys(dependsOn)) {
    depths[name] = depth(name);
  }
  return depths;
}

// ---------------------------------------------------------------------------
// 5. Consumer-edge scanning (who imports each module's public-api)
// ---------------------------------------------------------------------------

const SOURCE_ROOTS = ['modules', 'apps', 'packages', 'services', 'src', 'tests'];
const SOURCE_EXT = /\.(mjs|cjs|js|ts|tsx|jsx)$/;
const IMPORT_RE = /(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g;

function extractImports(source) {
  const out = [];
  let m;
  while ((m = IMPORT_RE.exec(source)) !== null) {
    out.push(m[1]);
  }
  return out;
}

function resolveImport(spec, fromFile) {
  if (spec.startsWith('.')) {
    const abs = path.resolve(path.dirname(fromFile), spec);
    return toPosix(path.relative('.', abs));
  }
  if (spec.startsWith('modules/')) return spec;
  return null;
}

function consumedModule(resolved) {
  if (!resolved) return null;
  const m = resolved.match(/(?:^|\/)modules\/([^/]+)\/public-api(?:\.[a-z]+)?$/);
  return m ? m[1] : null;
}

async function collectSourceFiles() {
  const out = [];
  for (const root of SOURCE_ROOTS) {
    if (!fileExists(root)) continue;
    const entries = await walk(root);
    for (const entry of entries) {
      const rel = toPosix(entry);
      if (!SOURCE_EXT.test(rel)) continue;
      out.push(rel);
    }
  }
  return out;
}

async function computeConsumers(moduleNames) {
  const consumers = {};
  for (const mod of moduleNames) consumers[mod] = [];

  const files = await collectSourceFiles();
  for (const file of files) {
    let source;
    try {
      source = await readText(file);
    } catch {
      continue;
    }
    const owningModule = file.match(/^modules\/([^/]+)\//)?.[1] ?? null;
    const seen = new Set();
    for (const spec of extractImports(source)) {
      const resolved = resolveImport(spec, file);
      const consumed = consumedModule(resolved);
      if (!consumed) continue;
      if (consumed === owningModule) continue;
      if (file.endsWith('/public-api.mjs') && file.includes(`/${consumed}/`)) continue;
      if (seen.has(consumed)) continue;
      seen.add(consumed);
      if (!consumers[consumed]) consumers[consumed] = [];
      consumers[consumed].push(file);
    }
  }

  for (const mod of Object.keys(consumers)) {
    consumers[mod].sort((a, b) => a.localeCompare(b));
  }

  return consumers;
}

// ---------------------------------------------------------------------------
// 6. Build merged output
// ---------------------------------------------------------------------------

async function buildGraph() {
  const modules = await collectManifests();
  const { dependsOn, dependedBy } = computeDependencyEdges(modules);
  const layers = computeLayers(modules, dependsOn);
  const removalOrder = computeRemovalOrder(modules, dependedBy);
  const consumers = await computeConsumers(Object.keys(modules));
  const transitiveDeps = computeTransitiveDeps(dependsOn);
  const depthMap = computeMaxDepth(dependsOn);

  const moduleSummaries = {};
  for (const [name, manifest] of Object.entries(modules)) {
    const structure = manifest.structure || {};
    moduleSummaries[name] = {
      description: manifest.description,
      dependsOn: dependsOn[name],
      transitiveDeps: transitiveDeps[name] || [],
      dependedBy: dependedBy[name],
      consumers: consumers[name] || [],
      depthFromLeaf: depthMap[name] || 0,
      layer: layers.findIndex((l) => l.includes(name)),
      structure:
        structure.domain || structure.ports || structure.adapters
          ? {
              domain: structure.domain?.length || 0,
              ports: structure.ports?.length || 0,
              adapters: structure.adapters?.length || 0,
            }
          : null,
    };
  }

  const sortedKeys = Object.keys(moduleSummaries).sort();
  const orderedModules = {};
  for (const key of sortedKeys) orderedModules[key] = moduleSummaries[key];

  const consumerEdgeCount = Object.values(consumers).reduce((n, c) => n + c.length, 0);

  return {
    _generated: new Date().toISOString(),
    _description:
      'Auto-generated merged dependency graph. Do not edit manually. Run: node scripts/checks/dependency-graph.mjs',
    moduleCount: sortedKeys.length,
    consumerEdgeCount,
    maxDependencyDepth: Math.max(0, ...Object.values(depthMap)),
    modules: orderedModules,
    layers,
    safeRemovalOrder: removalOrder,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const payload = await buildGraph();

const stableSerialize = (obj) => {
  const { _generated: _ignored, ...rest } = obj;
  return JSON.stringify(rest, null, 2) + '\n';
};
const fullSerialize = (obj) => JSON.stringify(obj, null, 2) + '\n';
const parseJsonOrNull = (raw) => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

if (JSON_ONLY) {
  process.stdout.write(fullSerialize(payload));
  process.exit(0);
}

if (CHECK) {
  let existing = '';
  try {
    existing = await readText(OUT);
  } catch {
    console.error(
      `dependency-graph: ${OUT} does not exist — run \`node scripts/checks/dependency-graph.mjs\` to create it`,
    );
    process.exit(1);
  }
  let existingParsed;
  try {
    existingParsed = JSON.parse(existing);
  } catch {
    console.error(`dependency-graph: ${OUT} is not valid JSON`);
    process.exit(1);
  }
  if (stableSerialize(existingParsed) !== stableSerialize(payload)) {
    console.error(
      `dependency-graph: ${OUT} is out of date — run \`node scripts/checks/dependency-graph.mjs\` to update`,
    );
    process.exit(1);
  }
  console.log(`dependency-graph: ${OUT} is up to date (${payload.moduleCount} modules)`);
  process.exit(0);
}

const existingParsed = parseJsonOrNull(await readText(OUT).catch(() => null));
if (
  existingParsed &&
  stableSerialize(existingParsed) === stableSerialize(payload) &&
  existingParsed._generated
) {
  payload._generated = existingParsed._generated;
}

const changed = await ensureWriteIfChanged(OUT, fullSerialize(payload));
if (changed) {
  console.log(
    `dependency-graph: wrote ${OUT} (${payload.moduleCount} modules, ${payload.consumerEdgeCount} consumer edges, ${payload.layers.length} layers)`,
  );
} else {
  console.log(`dependency-graph: ${OUT} already up to date`);
}
