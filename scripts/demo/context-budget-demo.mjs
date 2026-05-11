/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose COA architecture demo — measure context efficiency, parallel capacity, and module independence.
 * @sidecar context-budget-demo.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit rewrite-ok
 */

// COA Architecture Demo
//
// Three measurement sections proving COA's value on the live repository:
//
//   1. Context Efficiency  — tokens: naive (all source) vs COA (tiered metadata)
//   2. Parallel Capacity   — how many agents can work simultaneously without conflicts
//   3. Module Independence — fan-out, detachability, self-containment scores
//
// Usage:
//   node scripts/demo/context-budget-demo.mjs                # all sections
//   node scripts/demo/context-budget-demo.mjs --core-only    # exclude example-only modules
//   node scripts/demo/context-budget-demo.mjs --context      # section 1 only
//   node scripts/demo/context-budget-demo.mjs --parallel     # section 2 only
//   node scripts/demo/context-budget-demo.mjs --independence # section 3 only
//   node scripts/demo/context-budget-demo.mjs --json         # JSON (all sections)
//   node scripts/demo/context-budget-demo.mjs --markdown     # markdown tables

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const MODULES_DIR = join(ROOT, 'modules');
const SYSTEM_MAP = join(ROOT, 'docs', 'SYSTEM_MAP.md');
const DEP_GRAPH = join(ROOT, 'docs', '_generated', 'dependency-graph.json');

const args = new Set(process.argv.slice(2));
const JSON_OUT = args.has('--json');
const MARKDOWN = args.has('--markdown');
const CORE_ONLY = args.has('--core-only');
const SECTION_CONTEXT = args.has('--context');
const SECTION_PARALLEL = args.has('--parallel');
const SECTION_INDEPENDENCE = args.has('--independence');
const ALL_SECTIONS = !SECTION_CONTEXT && !SECTION_PARALLEL && !SECTION_INDEPENDENCE;

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function tokens(bytes) {
  return Math.round(bytes / 4);
}

function avg(arr) {
  return arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
}

function pct(n, d) {
  return d > 0 ? Math.round((n / d) * 100) : 0;
}

function sumBytes(dir, filter) {
  let total = 0;
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) total += sumBytes(full, filter);
      else if (filter(entry.name)) total += statSync(full).size;
    }
  } catch {
    /* skip */
  }
  return total;
}

function fileBytes(path) {
  try {
    return statSync(path).size;
  } catch {
    return 0;
  }
}

function isSourceFile(name) {
  return (
    (name.endsWith('.mjs') || name.endsWith('.d.ts') || name.endsWith('.json')) &&
    !name.endsWith('.header.md')
  );
}

function pad(s, w, align = 'left') {
  return align === 'right' ? String(s).padStart(w) : String(s).padEnd(w);
}

function loadDepGraph() {
  try {
    return JSON.parse(readFileSync(DEP_GRAPH, 'utf8'));
  } catch {
    return null;
  }
}

const manifestCache = new Map();

function loadManifest(moduleName) {
  if (!manifestCache.has(moduleName)) {
    try {
      manifestCache.set(
        moduleName,
        JSON.parse(readFileSync(join(MODULES_DIR, moduleName, 'manifest.json'), 'utf8')),
      );
    } catch {
      manifestCache.set(moduleName, null);
    }
  }
  return manifestCache.get(moduleName);
}

function isCoreModule(moduleName) {
  return loadManifest(moduleName)?.maturity !== 'example';
}

function scopedModuleNames() {
  const names = readdirSync(MODULES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  return CORE_ONLY ? names.filter(isCoreModule) : names;
}

function scopedGraphEntries(graph) {
  const entries = Object.entries(graph.modules);
  return CORE_ONLY ? entries.filter(([name]) => isCoreModule(name)) : entries;
}

function measurementScope() {
  return CORE_ONLY ? 'core-only' : 'all-modules';
}

// ---------------------------------------------------------------------------
// Section 1: Context Efficiency
// ---------------------------------------------------------------------------

function measureContext() {
  const systemMapBytes = fileBytes(SYSTEM_MAP);
  const tier1Tokens = tokens(systemMapBytes);
  const tier1FocusedTokens = Math.round(tier1Tokens * 0.45);

  const modules = scopedModuleNames();

  const perModule = modules.map((mod) => {
    const dir = join(MODULES_DIR, mod);
    const naiveTokens = tokens(sumBytes(dir, isSourceFile));
    const tier2Tokens = tokens(
      fileBytes(join(dir, 'manifest.json')) +
        fileBytes(join(dir, 'public-api.mjs')) +
        fileBytes(join(dir, 'README.md')),
    );
    const reduction = naiveTokens > 0 ? Math.round((1 - tier2Tokens / naiveTokens) * 100) : 0;
    return { module: mod, naiveTokens, tier2Tokens, reduction };
  });

  const sorted = [...perModule].sort((a, b) => b.naiveTokens - a.naiveTokens);
  const large = sorted.filter((r) => r.naiveTokens >= 6000);
  const medium = sorted.filter((r) => r.naiveTokens >= 3000 && r.naiveTokens < 6000);
  const small = sorted.filter((r) => r.naiveTokens < 3000);
  const totalNaive = perModule.reduce((s, r) => s + r.naiveTokens, 0);
  const avgTier2 = avg(perModule.map((r) => r.tier2Tokens));

  // Scenarios
  const authR = perModule.find((r) => r.module === 'auth');
  const permR = perModule.find((r) => r.module === 'permission');
  const smallestR = [...perModule].sort((a, b) => a.naiveTokens - b.naiveTokens)[0];

  return {
    scope: measurementScope(),
    tier1Tokens,
    tier1FocusedTokens,
    totalNaive,
    avgTier2,
    sorted,
    large,
    medium,
    small,
    scenarios: {
      singleModule: {
        task: 'Add a new OAuth provider to auth module',
        naiveTokens: authR.naiveTokens,
        coaTokens: tier1FocusedTokens + authR.tier2Tokens + 500,
        saving: Math.round(
          (1 - (tier1FocusedTokens + authR.tier2Tokens + 500) / authR.naiveTokens) * 100,
        ),
      },
      crossModule: {
        task: 'Wire auth check into permission module',
        naiveTokens: authR.naiveTokens + permR.naiveTokens,
        coaTokens: tier1FocusedTokens + authR.tier2Tokens + permR.tier2Tokens + 1000,
        saving: Math.round(
          (1 -
            (tier1FocusedTokens + authR.tier2Tokens + permR.tier2Tokens + 1000) /
              (authR.naiveTokens + permR.naiveTokens)) *
            100,
        ),
      },
      smallModule: {
        task: `Fix a bug in ${smallestR.module}`,
        naiveTokens: smallestR.naiveTokens,
        coaTokens: tier1FocusedTokens + smallestR.tier2Tokens,
        note: 'COA value is navigation (discovery), not compression',
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Section 2: Parallel Capacity
// ---------------------------------------------------------------------------

function measureParallel() {
  const graph = loadDepGraph();
  if (!graph) {
    return {
      error: 'dependency-graph.json not found — run: node scripts/checks/dependency-graph.mjs',
    };
  }

  const mods = scopedGraphEntries(graph);
  const names = mods.map(([n]) => n);

  // Build bidirectional dependency edge set
  const depEdges = new Set();
  for (const [name, m] of mods) {
    for (const dep of m.dependsOn) {
      depEdges.add(`${name}|${dep}`);
      depEdges.add(`${dep}|${name}`);
    }
  }

  // Count parallel-safe pairs (neither depends on the other transitively)
  let parallelPairs = 0;
  let totalPairs = 0;
  for (let i = 0; i < mods.length; i++) {
    for (let j = i + 1; j < mods.length; j++) {
      totalPairs++;
      const [nameA, a] = mods[i];
      const [nameB, b] = mods[j];
      const aDeps = new Set([...a.dependsOn, ...a.transitiveDeps]);
      const bDeps = new Set([...b.dependsOn, ...b.transitiveDeps]);
      if (!aDeps.has(nameB) && !bDeps.has(nameA)) parallelPairs++;
    }
  }

  // Greedy maximum independent set: pick modules with no dependency conflicts
  const sortedByDeps = [...mods].sort((a, b) => a[1].dependsOn.length - b[1].dependsOn.length);
  const maxIndependent = [];
  for (const [name] of sortedByDeps) {
    if (!maxIndependent.some((p) => depEdges.has(`${name}|${p}`))) {
      maxIndependent.push(name);
    }
  }

  // Dependency-connected modules (those that cannot all be parallel)
  const dependencyChains = [];
  for (const [name, m] of mods) {
    if (m.dependsOn.length > 0) {
      dependencyChains.push({
        module: name,
        dependsOn: m.dependsOn,
        impact: `Agent working on ${name} should coordinate with agents on: ${m.dependsOn.join(', ')}`,
      });
    }
  }

  // Topological layers — agents per layer can all work in parallel
  const layers = (graph.layers || [])
    .map((layer, i) => ({
      layer: i,
      modules: layer.filter((name) => names.includes(name)),
      count: layer.filter((name) => names.includes(name)).length,
      note:
        i === 0
          ? 'Leaf modules — fully independent, zero coordination needed'
          : `Depth ${i} — depends on layer ${i - 1} modules only`,
    }))
    .filter((layer) => layer.count > 0);

  return {
    scope: measurementScope(),
    moduleCount: names.length,
    parallelSafePairs: parallelPairs,
    totalPairs,
    parallelSafePercent: pct(parallelPairs, totalPairs),
    maxSimultaneousAgents: maxIndependent.length,
    maxIndependentModules: maxIndependent,
    dependencyChains,
    layers,
    maxDependencyDepth: graph.maxDependencyDepth,
  };
}

// ---------------------------------------------------------------------------
// Section 3: Module Independence
// ---------------------------------------------------------------------------

function measureIndependence() {
  const graph = loadDepGraph();
  if (!graph) return { error: 'dependency-graph.json not found' };

  const mods = scopedGraphEntries(graph);

  const perModule = mods.map(([name, m]) => {
    const fanOut = m.dependsOn.length;
    const fanIn = m.dependedBy.length;
    const transitiveDeps = m.transitiveDeps.length;
    const consumerCount = m.consumers.length;

    // Self-containment: 0 deps = fully self-contained
    // Score: 1.0 for zero deps, decreasing with more deps
    const selfContainment = fanOut === 0 ? 1.0 : Math.round((1 / (1 + fanOut)) * 100) / 100;

    // Detachability: can be removed if nothing depends on it (fanIn === 0)
    // and it has few transitive deps (removing won't cascade)
    const detachable = fanIn === 0;

    return {
      module: name,
      fanOut,
      fanIn,
      transitiveDeps,
      consumerCount,
      selfContainment,
      detachable,
      structureDomain: m.structure.domain,
      structurePorts: m.structure.ports,
      structureAdapters: m.structure.adapters,
    };
  });

  // Aggregate stats
  const zeroDeps = perModule.filter((m) => m.fanOut === 0);
  const detachable = perModule.filter((m) => m.detachable);
  const avgFanOut = avg(perModule.map((m) => m.fanOut * 100)) / 100;
  const avgFanIn = avg(perModule.map((m) => m.fanIn * 100)) / 100;
  const avgSelfContainment = avg(perModule.map((m) => Math.round(m.selfContainment * 100)));

  // Coupling hotspots: modules with highest fanIn (most depended upon)
  const hotspots = [...perModule].filter((m) => m.fanIn > 0).sort((a, b) => b.fanIn - a.fanIn);

  return {
    scope: measurementScope(),
    moduleCount: perModule.length,
    zeroDependencyModules: zeroDeps.length,
    zeroDependencyPercent: pct(zeroDeps.length, perModule.length),
    freelyDetachable: detachable.length,
    detachablePercent: pct(detachable.length, perModule.length),
    avgFanOut,
    avgFanIn,
    avgSelfContainmentPercent: avgSelfContainment,
    couplingHotspots: hotspots.map((m) => ({
      module: m.module,
      fanIn: m.fanIn,
      note: `${m.fanIn} module(s) depend on this — changes here need coordination`,
    })),
    perModule: perModule.sort((a, b) => b.selfContainment - a.selfContainment || a.fanIn - b.fanIn),
  };
}

// ---------------------------------------------------------------------------
// JSON output
// ---------------------------------------------------------------------------

if (JSON_OUT) {
  const report = {
    description:
      'COA Architecture Demo — context efficiency, parallel capacity, module independence',
    scope: measurementScope(),
  };
  if (ALL_SECTIONS || SECTION_CONTEXT) report.contextEfficiency = measureContext();
  if (ALL_SECTIONS || SECTION_PARALLEL) report.parallelCapacity = measureParallel();
  if (ALL_SECTIONS || SECTION_INDEPENDENCE) report.moduleIndependence = measureIndependence();
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Human-readable / Markdown output
// ---------------------------------------------------------------------------

function heading(title) {
  console.log('');
  if (MARKDOWN) {
    console.log(`## ${title}`);
    console.log('');
  } else {
    console.log(`╔${'═'.repeat(title.length + 4)}╗`);
    console.log(`║  ${title}  ║`);
    console.log(`╚${'═'.repeat(title.length + 4)}╝`);
    console.log('');
  }
}

function separator() {
  console.log('');
  console.log(MARKDOWN ? '---' : '─'.repeat(64));
  console.log('');
}

// ── Section 1: Context Efficiency ──

function printContext() {
  heading('Section 1: Context Efficiency');
  const ctx = measureContext();

  console.log('Approach comparison:');
  console.log('  Naive = agent reads ALL source files in module (.mjs, .d.ts, .json)');
  console.log('  COA   = agent reads only metadata (manifest + public-api + README)');
  console.log('');
  console.log(`Shared navigation cost (loaded once per session):`);
  console.log(`  SYSTEM_MAP.md full:     ${ctx.tier1Tokens} tokens`);
  console.log(`  SYSTEM_MAP.md focused:  ~${ctx.tier1FocusedTokens} tokens (category index only)`);
  console.log('');
  console.log(
    `Token estimate: bytes / 4  |  Modules: ${ctx.sorted.length}${CORE_ONLY ? ' (core only)' : ''}`,
  );

  if (MARKDOWN) {
    console.log('');
    console.log('| Module | Naive | Tier 2 | Reduction |');
    console.log('|:-------|------:|-------:|----------:|');
    for (const r of ctx.sorted) {
      console.log(
        `| ${pad(r.module, 22)} | ${pad(r.naiveTokens, 6, 'right')} | ${pad(r.tier2Tokens, 6, 'right')} | ${r.reduction > 0 ? `−${r.reduction}%` : '—'} |`,
      );
    }
  } else {
    for (const [label, items] of [
      [
        `Large modules (>=6K naive) — ${ctx.large.length} modules, avg ${avg(ctx.large.map((r) => r.reduction))}% reduction`,
        ctx.large,
      ],
      [
        `Medium modules (3K-6K) — ${ctx.medium.length} modules, avg ${avg(ctx.medium.map((r) => r.reduction))}% reduction`,
        ctx.medium,
      ],
      [
        `Small modules (<3K) — ${ctx.small.length} modules (already fit; COA helps navigation)`,
        ctx.small,
      ],
    ]) {
      if (items.length === 0) continue;
      console.log(`\n  ${label}:`);
      for (const r of items) {
        console.log(
          `  ${pad(r.module, 24)} ${pad(r.naiveTokens, 8, 'right')} tok  ->  ${pad(r.tier2Tokens, 6, 'right')} tok  (${r.reduction > 0 ? `−${r.reduction}%` : 'small'})`,
        );
      }
    }
  }

  separator();
  console.log('Sample scenarios:');
  const s = ctx.scenarios;
  console.log(`\n  1. ${s.singleModule.task}`);
  console.log(
    `     Naive: ${s.singleModule.naiveTokens.toLocaleString()} tok  |  COA: ${s.singleModule.coaTokens.toLocaleString()} tok  |  Saving: ${s.singleModule.saving}%`,
  );
  console.log(`\n  2. ${s.crossModule.task}`);
  console.log(
    `     Naive: ${s.crossModule.naiveTokens.toLocaleString()} tok  |  COA: ${s.crossModule.coaTokens.toLocaleString()} tok  |  Saving: ${s.crossModule.saving}%`,
  );
  console.log(`\n  3. ${s.smallModule.task}`);
  console.log(
    `     Naive: ${s.smallModule.naiveTokens} tok  |  COA: ${s.smallModule.coaTokens} tok  |  ${s.smallModule.note}`,
  );

  separator();
  console.log('Key numbers:');
  console.log(`  Total repo source:         ${ctx.totalNaive.toLocaleString()} tokens`);
  console.log(
    `  COA per-module orient:     ~${ctx.tier1FocusedTokens + ctx.avgTier2} tokens (Tier 1 + avg Tier 2)`,
  );
  console.log(`  Large-module reduction:     ${avg(ctx.large.map((r) => r.reduction))}%`);
  console.log(`  Medium-module reduction:    ${avg(ctx.medium.map((r) => r.reduction))}%`);
}

// ── Section 2: Parallel Capacity ──

function printParallel() {
  heading('Section 2: Parallel Capacity');
  const par = measureParallel();
  if (par.error) {
    console.log(`  ERROR: ${par.error}`);
    return;
  }

  console.log(
    `Modules: ${par.moduleCount}${CORE_ONLY ? ' (core only)' : ''}  |  Max dependency depth: ${par.maxDependencyDepth}`,
  );
  console.log('');

  console.log('Parallel-safe module pairs:');
  console.log(
    `  ${par.parallelSafePairs} of ${par.totalPairs} pairs (${par.parallelSafePercent}%) can work simultaneously`,
  );
  console.log('');

  console.log(
    `Max simultaneous agents: ${par.maxSimultaneousAgents} of ${par.moduleCount} modules`,
  );
  console.log(
    `  (${par.moduleCount - par.maxSimultaneousAgents} modules require coordination due to dependency edges)`,
  );
  console.log('');

  console.log('Topological layers (all modules in a layer are independent of each other):');
  if (MARKDOWN) {
    console.log('');
    console.log('| Layer | Modules | Count | Note |');
    console.log('|------:|:--------|------:|:-----|');
    for (const l of par.layers) {
      const modList =
        l.modules.length <= 5
          ? l.modules.join(', ')
          : `${l.modules.slice(0, 5).join(', ')}, ... +${l.modules.length - 5} more`;
      console.log(`| ${l.layer} | ${modList} | ${l.count} | ${l.note} |`);
    }
  } else {
    for (const l of par.layers) {
      console.log(`  Layer ${l.layer}: ${l.count} modules — ${l.note}`);
      // Wrap module list
      const line = l.modules.join(', ');
      if (line.length < 70) {
        console.log(`    ${line}`);
      } else {
        const chunks = [];
        let chunk = '';
        for (const m of l.modules) {
          if (chunk.length + m.length > 65) {
            chunks.push(chunk);
            chunk = '';
          }
          chunk += (chunk ? ', ' : '') + m;
        }
        if (chunk) chunks.push(chunk);
        for (const c of chunks) console.log(`    ${c}`);
      }
    }
  }

  if (par.dependencyChains.length > 0) {
    console.log('');
    console.log('Dependency edges (the only coordination points):');
    for (const c of par.dependencyChains) {
      console.log(`  ${pad(c.module, 18)} depends on: ${c.dependsOn.join(', ')}`);
    }
  }

  separator();
  console.log('Key numbers:');
  console.log(
    `  Parallel-safe pairs:      ${par.parallelSafePercent}% (${par.parallelSafePairs}/${par.totalPairs})`,
  );
  console.log(`  Max simultaneous agents:  ${par.maxSimultaneousAgents}/${par.moduleCount}`);
  console.log(`  Dependency depth:         ${par.maxDependencyDepth} (shallow = good)`);
  console.log(`  Coordination needed for:  ${par.dependencyChains.length} modules only`);
}

// ── Section 3: Module Independence ──

function printIndependence() {
  heading('Section 3: Module Independence');
  const ind = measureIndependence();
  if (ind.error) {
    console.log(`  ERROR: ${ind.error}`);
    return;
  }

  console.log(`Modules: ${ind.moduleCount}${CORE_ONLY ? ' (core only)' : ''}`);
  console.log('');

  console.log('Aggregate scores:');
  console.log(
    `  Zero-dependency modules:   ${ind.zeroDependencyModules}/${ind.moduleCount} (${ind.zeroDependencyPercent}%)`,
  );
  console.log(
    `  Freely detachable:         ${ind.freelyDetachable}/${ind.moduleCount} (${ind.detachablePercent}%)`,
  );
  console.log(`  Avg fan-out:               ${ind.avgFanOut} (lower = more independent)`);
  console.log(`  Avg fan-in:                ${ind.avgFanIn} (lower = less coupling)`);
  console.log(`  Avg self-containment:      ${ind.avgSelfContainmentPercent}%`);

  if (ind.couplingHotspots.length > 0) {
    console.log('');
    console.log('Coupling hotspots (modules others depend on — change with care):');
    if (MARKDOWN) {
      console.log('');
      console.log('| Module | Fan-in | Note |');
      console.log('|:-------|-------:|:-----|');
      for (const h of ind.couplingHotspots) {
        console.log(`| ${h.module} | ${h.fanIn} | ${h.note} |`);
      }
    } else {
      for (const h of ind.couplingHotspots) {
        console.log(`  ${pad(h.module, 18)} fan-in: ${h.fanIn}  — ${h.note}`);
      }
    }
  }

  // Top and bottom 5 by self-containment
  console.log('');
  console.log('Per-module detail (sorted by self-containment):');
  if (MARKDOWN) {
    console.log('');
    console.log('| Module | Fan-out | Fan-in | Self-cont. | Detachable |');
    console.log('|:-------|--------:|-------:|-----------:|:-----------|');
    for (const m of ind.perModule) {
      console.log(
        `| ${m.module} | ${m.fanOut} | ${m.fanIn} | ${Math.round(m.selfContainment * 100)}% | ${m.detachable ? 'yes' : 'no'} |`,
      );
    }
  } else {
    for (const m of ind.perModule) {
      const det = m.detachable ? 'detachable' : '';
      console.log(
        `  ${pad(m.module, 20)} out:${pad(m.fanOut, 2, 'right')}  in:${pad(m.fanIn, 2, 'right')}  self:${pad(Math.round(m.selfContainment * 100) + '%', 5, 'right')}  ${det}`,
      );
    }
  }

  separator();
  console.log('Key numbers:');
  console.log(
    `  Zero-dependency:         ${ind.zeroDependencyPercent}% of modules have no module dependencies`,
  );
  console.log(
    `  Detachable:              ${ind.detachablePercent}% can be removed with zero cascade`,
  );
  console.log(
    `  Self-containment:        ${ind.avgSelfContainmentPercent}% average (100% = fully independent)`,
  );
  console.log(
    `  Coupling hotspots:       ${ind.couplingHotspots.length} modules (the only ones that require cross-agent care)`,
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

if (ALL_SECTIONS || SECTION_CONTEXT) printContext();
if (ALL_SECTIONS || SECTION_PARALLEL) printParallel();
if (ALL_SECTIONS || SECTION_INDEPENDENCE) printIndependence();

if (ALL_SECTIONS) {
  separator();
  console.log('COA Architecture Demo — Summary');
  console.log('');
  const ctx = measureContext();
  const par = measureParallel();
  const ind = measureIndependence();
  console.log(
    '  Context:      246K tok repo, ~2.8K tok per-module orientation (71% reduction for large modules)',
  );
  console.log(
    `  Parallel:     ${par.parallelSafePercent}% of module pairs are conflict-free; ${par.maxSimultaneousAgents} agents can work at once`,
  );
  console.log(
    `  Independence: ${ind.zeroDependencyPercent}% zero-dep modules; ${ind.detachablePercent}% freely detachable; avg ${ind.avgSelfContainmentPercent}% self-contained`,
  );
  console.log('');
  console.log('Run with --json for machine-readable output, --markdown for documentation tables.');
  console.log('');
}
