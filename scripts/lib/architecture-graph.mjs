/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Pure functions for building declared and inferred architecture graphs and computing drift between them.
 * @sidecar architecture-graph.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import path from 'node:path';
import { toPosix } from './fs-helpers.mjs';
import { parseStructuredHeaderText } from './header.mjs';

// ---------------------------------------------------------------------------
// Schema version — single source of truth for all report artifacts
// ---------------------------------------------------------------------------

export const SCHEMA_VERSION = '0.2.0';

// ---------------------------------------------------------------------------
// ID helpers (exported for cross-module use)
// ---------------------------------------------------------------------------

export function slugifyPath(posixPath) {
  return posixPath
    .replace(/[^a-zA-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function nodeId(posixPath) {
  return `node-file-${slugifyPath(posixPath)}`;
}

export function subsystemId(name) {
  return `subsystem-${name}`;
}

// ---------------------------------------------------------------------------
// Import extraction (reused from architecture-check.mjs pattern)
// ---------------------------------------------------------------------------

function importsFrom(text) {
  const results = [];
  for (const regex of [
    /from\s+['"]([^'"]+)['"]/g,
    /import\s+['"]([^'"]+)['"]/g,
    /require\(\s*['"]([^'"]+)['"]\s*\)/g,
  ]) {
    for (const match of text.matchAll(regex)) results.push(match[1]);
  }
  return [...new Set(results)];
}

function resolveImportTarget(fromFile, importSource) {
  if (!importSource.startsWith('.')) return null;
  const dir = path.posix.dirname(fromFile);
  return path.posix.normalize(path.posix.join(dir, importSource));
}

function splitSemicolon(value) {
  if (!value || value === '_none_') return [];
  return value
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Stats helper
// ---------------------------------------------------------------------------

function buildStats(nodes, edges, _subsystems) {
  const nodesByType = {};
  const nodesBySubsystem = {};
  const nodesByHexLayer = {};

  for (const node of nodes) {
    nodesByType[node.type] = (nodesByType[node.type] || 0) + 1;
    if (node.subsystem) {
      nodesBySubsystem[node.subsystem] = (nodesBySubsystem[node.subsystem] || 0) + 1;
    }
    nodesByHexLayer[node.hexLayer] = (nodesByHexLayer[node.hexLayer] || 0) + 1;
  }

  return {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    nodesByType,
    nodesBySubsystem,
    nodesByHexLayer,
  };
}

// ---------------------------------------------------------------------------
// Declared graph — built from structured header metadata
// ---------------------------------------------------------------------------

/**
 * Build a declared architecture graph from structured header metadata.
 *
 * Returns the canonical v0.2.0 declared-graph shape with nodes, edges,
 * subsystems, and stats.
 *
 * @param {Array<{file: string, text: string}>} fileSources
 * @param {{ repoContext?: string, generatedBy?: string }} options
 */
export function buildDeclaredGraph(fileSources, options = {}) {
  const { repoContext = 'unknown', generatedBy = 'scripts/reports/architecture-report.mjs' } =
    options;

  const nodes = [];
  const edges = [];
  const subsystemMap = new Map();

  for (const { file, text } of fileSources) {
    const parsed = parseStructuredHeaderText(file, text);
    if (!parsed) continue;

    const fi = parsed.fileinfo || {};
    const posixFile = toPosix(file);
    const nid = nodeId(posixFile);
    const bc = fi.BoundedContext || '_none_';
    const hexLayer = fi.HexLayer || '_none_';

    // Collect subsystem from bounded context
    if (bc !== '_none_' && !subsystemMap.has(bc)) {
      subsystemMap.set(bc, {
        id: subsystemId(bc),
        name: bc.charAt(0).toUpperCase() + bc.slice(1),
        description: `Bounded context: ${bc}`,
        hexLayer: '_none_',
      });
    }

    nodes.push({
      id: nid,
      type: 'file',
      name: fi.Owns && fi.Owns !== '_none_' ? fi.Owns : path.posix.basename(posixFile),
      path: posixFile,
      entityRef: fi.FileId || nid,
      subsystem: bc !== '_none_' ? subsystemId(bc) : null,
      hexLayer,
      boundedContext: bc,
      portType: fi.PortType || '_none_',
      adapterType: fi.AdapterType || '_none_',
      declared: true,
      metadata: {
        layer: fi.Layer || '_none_',
        modulePackage: fi['Module/Package'] || '_none_',
        allowedDependencies: splitSemicolon(fi.AllowedDependencies),
        forbiddenDependencies: splitSemicolon(fi.ForbiddenDependencies),
        externalSystems: splitSemicolon(fi.ExternalSystems),
        declaredDependencies: splitSemicolon(fi.DependsOn),
      },
    });
  }

  // Build declared depends-on edges (only to known nodes)
  const nodePathSet = new Set(nodes.map((n) => n.path));
  for (const node of nodes) {
    for (const dep of node.metadata.declaredDependencies) {
      if (nodePathSet.has(dep)) {
        edges.push({
          from: node.id,
          to: nodeId(dep),
          type: 'depends-on',
          declared: true,
        });
      }
    }
  }

  const subsystems = [...subsystemMap.values()];
  const stats = buildStats(nodes, edges, subsystems);

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    generatedBy,
    scope: 'full',
    repoContext,
    subsystems,
    nodes,
    edges,
    stats,
  };
}

// ---------------------------------------------------------------------------
// Inferred graph — built from actual import analysis
// ---------------------------------------------------------------------------

/**
 * Build an inferred dependency graph by scanning imports in source files.
 *
 * Only relative imports produce edges (external imports like node:* are
 * excluded from the architecture graph). Inferred nodes are created for
 * import targets not present in fileSources.
 *
 * @param {Array<{file: string, text: string}>} fileSources
 * @param {{ repoContext?: string, generatedBy?: string }} options
 */
export function buildInferredGraph(fileSources, options = {}) {
  const { repoContext = 'unknown', generatedBy = 'scripts/reports/architecture-report.mjs' } =
    options;

  const edges = [];
  const knownFiles = new Set(fileSources.map((s) => toPosix(s.file)));
  const inferredTargets = new Set();

  for (const { file, text } of fileSources) {
    const posixFile = toPosix(file);
    if (!/\.(mjs|cjs|js|jsx|ts|tsx)$/i.test(posixFile)) continue;

    const imports = importsFrom(text);
    for (const source of imports) {
      // Only include relative imports in the architecture graph
      if (!source.startsWith('.')) continue;

      const resolved = resolveImportTarget(posixFile, source);
      if (!resolved) continue;

      edges.push({
        from: nodeId(posixFile),
        to: nodeId(resolved),
        type: 'imports',
        declared: false,
        evidence: `import in ${posixFile}`,
      });

      if (!knownFiles.has(resolved)) {
        inferredTargets.add(resolved);
      }
    }
  }

  // Build inferred nodes for import targets not in fileSources
  const nodes = [];
  for (const p of inferredTargets) {
    nodes.push({
      id: nodeId(p),
      type: 'file',
      name: path.posix.basename(p),
      path: p,
      entityRef: nodeId(p),
      subsystem: null,
      hexLayer: '_none_',
      boundedContext: '_none_',
      portType: '_none_',
      adapterType: '_none_',
      declared: false,
      inferredFrom: 'import-target',
      metadata: {},
    });
  }

  const stats = buildStats(nodes, edges, []);

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    generatedBy,
    scope: 'full',
    repoContext,
    subsystems: [],
    nodes,
    edges,
    stats,
  };
}

// ---------------------------------------------------------------------------
// Drift computation
// ---------------------------------------------------------------------------

/**
 * Compare declared graph against inferred graph and report drift.
 *
 * When fileSources is provided, also checks forbidden/allowed dependency
 * violations by re-scanning raw imports.
 *
 * @param {{ nodes: object[], edges: object[] }} declared
 * @param {{ nodes: object[], edges: object[] }} inferred
 * @param {Array<{file: string, text: string}>} fileSources
 */
export function computeDrift(declared, inferred, fileSources = []) {
  const violations = [];

  // --- 1. Forbidden / allowed dependency checks (requires fileSources) ---
  if (fileSources.length > 0) {
    const declaredPathMap = new Map(declared.nodes.map((n) => [n.path, n]));

    for (const { file, text } of fileSources) {
      const posixFile = toPosix(file);
      if (!/\.(mjs|cjs|js|jsx|ts|tsx)$/i.test(posixFile)) continue;

      const node = declaredPathMap.get(posixFile);
      if (!node) continue;

      const forbidden = node.metadata.forbiddenDependencies || [];
      const allowed = node.metadata.allowedDependencies || [];

      const imports = importsFrom(text);
      for (const source of imports) {
        const resolved = resolveImportTarget(posixFile, source);

        // Check forbidden dependencies
        for (const pattern of forbidden) {
          if (source.includes(pattern) || (resolved && resolved.includes(pattern))) {
            violations.push({
              type: 'forbidden-dependency',
              node: node.id,
              file: posixFile,
              message: `imports "${source}" which matches forbidden pattern "${pattern}"`,
              severity: 'error',
            });
          }
        }

        // Check allowed-only dependencies (relative imports only)
        if (allowed.length > 0 && source.startsWith('.')) {
          const isAllowed = allowed.some(
            (a) => source.includes(a) || (resolved && resolved.includes(a)),
          );
          if (!isAllowed) {
            violations.push({
              type: 'undeclared-dependency',
              node: node.id,
              file: posixFile,
              message: `imports "${source}" which is not in AllowedDependencies`,
              severity: 'warning',
            });
          }
        }
      }
    }
  }

  // --- 2. Missing declarations ---
  const declaredNodeIds = new Set(declared.nodes.map((n) => n.id));

  // Build nodeId→path map for reporting
  const nodeIdToPath = new Map();
  for (const { file } of fileSources) {
    const posixFile = toPosix(file);
    nodeIdToPath.set(nodeId(posixFile), posixFile);
  }
  for (const n of [...declared.nodes, ...inferred.nodes]) {
    nodeIdToPath.set(n.id, n.path);
  }

  // Sources in inferred edges not in declared graph
  const inferredSourceIds = new Set(inferred.edges.map((e) => e.from));
  for (const srcId of inferredSourceIds) {
    if (!declaredNodeIds.has(srcId)) {
      violations.push({
        type: 'missing-declaration',
        node: srcId,
        file: nodeIdToPath.get(srcId) || null,
        message: 'file has imports but no structured header metadata',
        severity: 'warning',
      });
    }
  }

  // Inferred target nodes not in declared graph (avoid duplicates with above)
  for (const n of inferred.nodes) {
    if (!declaredNodeIds.has(n.id) && !inferredSourceIds.has(n.id)) {
      violations.push({
        type: 'missing-declaration',
        node: n.id,
        file: n.path,
        message: 'file appears as import target but has no structured header metadata',
        severity: 'warning',
      });
    }
  }

  // --- 3. Orphan nodes (declared nodes with no edges in either graph) ---
  const nodesWithEdges = new Set();
  for (const edge of [...declared.edges, ...inferred.edges]) {
    nodesWithEdges.add(edge.from);
    nodesWithEdges.add(edge.to);
  }
  const orphanNodes = declared.nodes.filter((n) => !nodesWithEdges.has(n.id)).map((n) => n.id);

  // --- 4. Edge diff ---
  const edgeKey = (e) => `${e.from}|${e.to}`;

  const inferredEdgeKeys = new Set(inferred.edges.map(edgeKey));
  const declaredOnlyEdges = declared.edges
    .filter((e) => !inferredEdgeKeys.has(edgeKey(e)))
    .map((e) => ({ from: e.from, to: e.to, type: e.type }));

  const declaredEdgeKeys = new Set(declared.edges.map(edgeKey));
  const inferredOnlyEdges = inferred.edges
    .filter((e) => !declaredEdgeKeys.has(edgeKey(e)))
    .map((e) => ({ from: e.from, to: e.to, type: e.type }));

  // --- 5. Status ---
  const status = violations.length > 0 ? 'drift-detected' : 'clean';

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    generatedBy: 'scripts/reports/architecture-report.mjs',
    scope: 'full',
    declaredNodeCount: declared.nodes.length,
    inferredNodeCount: inferred.nodes.length,
    declaredEdgeCount: declared.edges.length,
    inferredEdgeCount: inferred.edges.length,
    violations,
    orphanNodes,
    declaredOnlyEdges,
    inferredOnlyEdges,
    status,
  };
}
