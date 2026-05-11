/* @HEADER
 * @version 0.7.108 | 2026-05-06
 * @purpose Slice-aware context briefer for harness-agnostic delivery (ADR-0028).
 * @sidecar agent-context.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public true
 * @edit careful
 */

// SpecRefs: TPL-289, TPL-290, TPL-292, TPL-293
//
// Emits a token-budgeted markdown context brief for a given slice's touched files.
// Tier-1 (SYSTEM_MAP category fragment), Tier-2 (module manifests + public-API),
// Tier-3 (sidecar neighborhood, configurable radius), and Tier-4 (full touched-file
// source) are implemented. Drop priority: Tier-3 first, Tier-2 second; Tier-1 and
// Tier-4 never dropped (error if their combined cost exceeds budget).
//
// Usage:
//   node scripts/agent-context.mjs --files=modules/auth/domain/session.mjs --budget=16000
//   node scripts/agent-context.mjs --profile=small --slice=TPL-290 --files=<paths>
//   node scripts/agent-context.mjs --files=modules/auth/domain/session.mjs --neighborhood-radius=large

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  listModuleAllSidecars,
  discoverDirectModuleDependencies,
  measureWorkSurface,
  approximateTokenCount,
} from './lib/module-work-surface.mjs';

const __dirname =
  import.meta.dirname ?? fileURLToPath(import.meta.url).replace(/[/\\][^/\\]+$/, '');
const ROOT = resolve(__dirname, '..');

const PROFILE_BUDGETS = { small: 12000, mid: 16000, frontier: 64000 };
const VALID_PROFILES = new Set(Object.keys(PROFILE_BUDGETS));

// ---------------------------------------------------------------------------
// Tier-3 neighborhood radius rules (Design Call A):
//
//   small  — ≤5 sidecars: manifest.json.header.md + public-api.*.header.md only
//   medium — ≈10 sidecars: all .header.md files in the module directory tree
//   large  — ≈20 sidecars: medium + 1-hop cross-module dependency module sidecars
//
// Range assertions used in tests:
//   small:  count >= 1 && count <= 5
//   medium: count >= 4 && count <= 30
//   large:  count >= medium count (adds dependency module sidecars)
// ---------------------------------------------------------------------------
const VALID_RADII = new Set(['small', 'medium', 'large']);

export function resolveBudget(profile, explicitBudget) {
  if (explicitBudget != null) return explicitBudget;
  return PROFILE_BUDGETS[profile];
}

const VALID_FORMATS = new Set(['markdown', 'md', 'json']);

export function parseArgs(argv) {
  let profile = 'mid';
  let explicitBudget = null;
  let files = [];
  let slice = null;
  let out = '-';
  let neighborhoodRadius = 'medium';
  let format = 'markdown';
  let explain = false;

  for (const arg of argv) {
    if (arg.startsWith('--profile=')) {
      profile = arg.slice('--profile='.length);
      if (!VALID_PROFILES.has(profile)) {
        throw new Error(`Invalid profile: "${profile}". Valid: ${[...VALID_PROFILES].join(', ')}`);
      }
    } else if (arg.startsWith('--budget=')) {
      explicitBudget = parseInt(arg.slice('--budget='.length), 10);
    } else if (arg.startsWith('--files=')) {
      files = arg
        .slice('--files='.length)
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean);
    } else if (arg.startsWith('--slice=')) {
      slice = arg.slice('--slice='.length);
    } else if (arg.startsWith('--out=')) {
      out = arg.slice('--out='.length);
    } else if (arg.startsWith('--neighborhood-radius=')) {
      neighborhoodRadius = arg.slice('--neighborhood-radius='.length);
      if (!VALID_RADII.has(neighborhoodRadius)) {
        throw new Error(
          `Invalid --neighborhood-radius: "${neighborhoodRadius}". Valid: ${[...VALID_RADII].join(', ')}`,
        );
      }
    } else if (arg.startsWith('--format=')) {
      format = arg.slice('--format='.length);
      if (!VALID_FORMATS.has(format)) {
        throw new Error(`Invalid --format: "${format}". Valid: ${[...VALID_FORMATS].join(', ')}`);
      }
    } else if (arg === '--explain') {
      explain = true;
    }
  }

  const budget = resolveBudget(profile, explicitBudget);
  return { profile, budget, files, slice, out, neighborhoodRadius, format, explain };
}

/**
 * Build the ## Why this brief contains what it contains section.
 *
 * @param {object} opts
 * @param {number} opts.tier1Tokens
 * @param {number} opts.tier2Tokens
 * @param {number} opts.tier3Tokens
 * @param {number} opts.tier4Tokens
 * @param {boolean} opts.tier2Dropped
 * @param {boolean} opts.tier3Dropped
 * @param {string} [opts.radius='medium']
 */
export function buildExplainSection({
  tier1Tokens,
  tier2Tokens,
  tier3Tokens,
  tier4Tokens,
  tier2Dropped,
  tier3Dropped,
  radius = 'medium',
}) {
  const t1line = `Tier-1 (architectural map): included — ${tier1Tokens} tokens; always included (architectural foundation)`;
  const t2line = tier2Dropped
    ? `Tier-2 (module manifests): partially or fully dropped — ${tier2Tokens} tokens; would have exceeded remaining budget`
    : `Tier-2 (module manifests): included — ${tier2Tokens} tokens; all module manifests fit within budget`;
  const t3line = tier3Dropped
    ? `Tier-3 (sidecar neighborhood): dropped — ${tier3Tokens} tokens; would have exceeded remaining budget by the allocated amount`
    : `Tier-3 (sidecar neighborhood): included — ${tier3Tokens} tokens; radius=${radius}; all sidecars fit within budget`;
  const t4line = `Tier-4 (touched files): included — ${tier4Tokens} tokens; always included (full source of touched files)`;

  return [
    `## Why this brief contains what it contains`,
    ``,
    `- ${t1line}`,
    `- ${t2line}`,
    `- ${t3line}`,
    `- ${t4line}`,
    ``,
  ].join('\n');
}

/** Resolve the module name from a file path; returns null for paths outside modules/. */
export function resolveModuleName(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  const match = normalized.match(/(?:^|\/)modules\/([^/]+)/);
  return match ? match[1] : null;
}

/** Return deduplicated module names in first-seen order from a file list. */
export function uniqueModulesFromFiles(files) {
  const seen = new Set();
  const result = [];
  for (const f of files) {
    const m = resolveModuleName(f);
    if (m !== null && !seen.has(m)) {
      seen.add(m);
      result.push(m);
    }
  }
  return result;
}

/**
 * Compute the Tier-3 sidecar neighborhood for the given module names and radius.
 *
 * Radius rules (Design Call A):
 *   small  — only manifest.json.header.md + public-api.*.header.md (≤5 per module)
 *   medium — all .header.md files in the touched module directory trees
 *   large  — medium + .header.md files from 1-hop cross-module dependencies
 *
 * Returns a deduplicated, sorted array of relative paths ending with .header.md.
 * Only paths that actually exist on disk are included.
 *
 * @param {object} opts
 * @param {string[]} opts.modules - module names to include
 * @param {string} [opts.radius='medium'] - 'small' | 'medium' | 'large'
 * @param {string} opts.repoRoot - absolute path to repo root
 */
export function computeNeighborhood({ modules = [], radius = 'medium', repoRoot }) {
  if (!VALID_RADII.has(radius)) {
    throw new Error(
      `Invalid --neighborhood-radius: "${radius}". Valid: ${[...VALID_RADII].join(', ')}`,
    );
  }

  const paths = new Set();

  for (const moduleName of modules) {
    if (radius === 'small') {
      // Only manifest + public-api sidecars from measureWorkSurface
      const ws = measureWorkSurface(moduleName, { rootAbs: repoRoot });
      for (const sc of ws.files.sidecars) {
        if (sc) paths.add(sc);
      }
    } else {
      // medium and large: all sidecars in the module directory
      const allSidecars = listModuleAllSidecars(moduleName, { rootAbs: repoRoot });
      for (const sc of allSidecars) paths.add(sc);

      if (radius === 'large') {
        // Add 1-hop cross-module dependency sidecars
        const deps = discoverDirectModuleDependencies(moduleName, { rootAbs: repoRoot });
        for (const dep of deps) {
          const depSmall = measureWorkSurface(dep, { rootAbs: repoRoot });
          for (const sc of depSmall.files.sidecars) {
            if (sc) paths.add(sc);
          }
        }
      }
    }
  }

  // Filter to only existing paths (skip missing sidecars)
  const result = [...paths].filter((p) => existsSync(join(repoRoot, p)));

  // Stable sort
  result.sort();
  return result;
}

/**
 * Build the ## How to read this brief section.
 */
export function buildHowToReadSection() {
  return [
    `## How to read this brief`,
    ``,
    `Read this brief top to bottom. Deep-read only the Touched files section to understand current behavior; the other sections provide architectural context and can be skimmed. Sidecars give file intent without full source. Use the Token budget footer to verify the brief fits your context window before beginning work.`,
    ``,
  ].join('\n');
}

/**
 * Build the ## Suggested next actions section.
 */
export function buildSuggestedNextActionsSection() {
  return [
    `## Suggested next actions`,
    ``,
    `- Read the Touched files section to understand current behavior`,
    `- Identify the smallest change that satisfies the slice's acceptance criteria`,
    `- Consult Module manifests for public-API obligations the change must preserve`,
    `- Acquire a claim before editing files outside your single target module: \`node scripts/checks/claim-check.mjs --acquire ...\``,
    `- Commit via \`node scripts/coa-merge.mjs --message="..."\` — never bump VERSION/CHANGELOG manually`,
    ``,
  ].join('\n');
}

// Language hint map for Tier-4 fenced code blocks
const LANG_HINTS = {
  '.mjs': 'javascript',
  '.js': 'javascript',
  '.cjs': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.json': 'json',
  '.md': 'markdown',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.html': 'html',
  '.css': 'css',
};

function langHintFromPath(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  const dotIdx = normalized.lastIndexOf('.');
  if (dotIdx === -1) return '';
  const ext = normalized.slice(dotIdx);
  return LANG_HINTS[ext] ?? '';
}

function isBinaryBuffer(buf) {
  // Treat as binary if it contains any null bytes
  for (let i = 0; i < Math.min(buf.length, 8000); i++) {
    if (buf[i] === 0) return true;
  }
  return false;
}

/**
 * Build the ## Touched files (full source) section for Tier-4.
 *
 * For each file in the files list:
 *   - If missing: throws with a clear error message
 *   - If binary (null bytes): emits a [binary file: N bytes — not included] placeholder
 *   - Otherwise: emits full source in a fenced code block with language hint
 *
 * @param {object} opts
 * @param {string[]} opts.files - absolute or relative file paths to include
 * @param {string} opts.repoRoot - absolute path to repo root (for relative path display)
 * @returns {string} the full Tier-4 section markdown
 */
export function buildTier4Section({ files, repoRoot }) {
  if (!files || files.length === 0) return '';

  const heading = `## Touched files (full source)\n\n`;
  let body = '';

  for (const filePath of files) {
    const absPath = existsSync(filePath) ? filePath : join(repoRoot, filePath);

    if (!existsSync(absPath)) {
      throw new Error(`Tier-4: file not found — "${filePath}" (resolved: "${absPath}")`);
    }

    const buf = readFileSync(absPath);
    const relPath = absPath.replace(/\\/g, '/').replace(repoRoot.replace(/\\/g, '/') + '/', '');

    if (isBinaryBuffer(buf)) {
      body += `### ${relPath}\n\n[binary file: ${buf.length} bytes — not included]\n\n`;
    } else {
      const source = buf.toString('utf8');
      const lang = langHintFromPath(filePath);
      body += `### ${relPath}\n\n\`\`\`${lang}\n${source.trimEnd()}\n\`\`\`\n\n`;
    }
  }

  return heading + body;
}

// Budget resolution algorithm (TPL-293):
// 1. Compute fixed costs: tier1 + tier4 (never dropped)
// 2. If fixed > budget: throw error — operator must raise budget or reduce --files
// 3. remaining = budget - tier1 - tier4
// 4. Fit tier2 first (higher priority): take all if fits, else record droppedTier2Count
// 5. Fit tier3 with what's left: take all if fits, else record droppedTier3Count
// 6. Return { tier2Survivors, tier3Survivors, droppedTier2Count, droppedTier3Count }

/**
 * Resolve budget allocation across tiers.
 *
 * Tier-1 and Tier-4 are fixed (never dropped). Tier-2 gets remaining budget
 * after fixed costs; Tier-3 gets what remains after Tier-2.
 *
 * Drop priority: Tier-3 drops first (lowest priority), then Tier-2 if still over.
 * Because Tier-2 gets priority over Tier-3, the effect is that when budget is
 * tight Tier-3 is sacrificed first, then Tier-2.
 *
 * @param {object} opts
 * @param {number} opts.tier1Cost - token cost of Tier-1 (fixed)
 * @param {number} opts.tier2Cost - token cost of Tier-2
 * @param {number} opts.tier3Cost - token cost of Tier-3
 * @param {number} opts.tier4Cost - token cost of Tier-4 (fixed)
 * @param {number} opts.budget - total token budget
 * @returns {{ remainingForTier2: number, remainingForTier3: number, droppedTier2Count: number, droppedTier3Count: number }}
 */
export function resolveBudgetAllocation({ tier1Cost, tier2Cost, tier3Cost, tier4Cost, budget }) {
  const fixedCost = tier1Cost + tier4Cost;
  if (fixedCost > budget) {
    throw new Error(
      `Tier-1 + Tier-4 cost (${fixedCost} tokens) exceeds --budget (${budget} tokens). ` +
        `Raise --budget or reduce --files to fix this.`,
    );
  }

  const remaining = budget - fixedCost;

  // Tier-2 gets priority (drops last): all remaining budget goes to Tier-2 first
  const remainingForTier2 = remaining;
  const tier2Fits = tier2Cost <= remainingForTier2;
  // If tier2 does not fully fit, report 1 drop unit (actual per-module drops
  // are handled internally by buildTier2Section)
  const droppedTier2Count = tier2Fits ? 0 : 1;

  // Tier-3 gets what is left after Tier-2 actual usage
  const tier2ActualUsage = Math.min(tier2Cost, remainingForTier2);
  const afterTier2 = remaining - tier2ActualUsage;
  const remainingForTier3 = afterTier2;
  const tier3Fits = tier3Cost <= remainingForTier3;
  const droppedTier3Count = tier3Fits ? 0 : 1;

  return {
    remainingForTier2,
    remainingForTier3,
    droppedTier2Count,
    droppedTier3Count,
    tier2Survivors: remainingForTier2,
    tier3Survivors: remainingForTier3,
  };
}

/**
 * Parse SYSTEM_MAP into an ordered array of category sections.
 * Only sections whose table header contains "| Module |" are treated as module categories.
 * This excludes the "Column Legend" section which has a "| Notation |" header.
 */
function parseSystemMapCategories(systemMapText) {
  const categories = [];
  const lines = systemMapText.split('\n');
  let currentHeading = null;
  let currentLines = [];
  let inCategory = false;

  const flushCurrent = () => {
    if (currentHeading && inCategory) {
      const content = currentLines.join('\n');
      // Only keep sections that have a module table (header row contains "| Module |")
      if (/\|\s*Module\s*\|/.test(content)) {
        categories.push({ heading: currentHeading, content });
      }
    }
    currentHeading = null;
    currentLines = [];
    inCategory = false;
  };

  for (const line of lines) {
    if (line.startsWith('### ') && !line.startsWith('#### ')) {
      flushCurrent();
      currentHeading = line.trim();
      currentLines = [line];
      inCategory = true;
    } else if (line.startsWith('## ') || line.startsWith('---')) {
      flushCurrent();
    } else if (inCategory) {
      currentLines.push(line);
    }
  }
  flushCurrent();

  return categories;
}

function findCategoryForModule(moduleName, categories) {
  for (const cat of categories) {
    if (new RegExp(`\\|\\s*${moduleName}\\s*\\|`).test(cat.content)) {
      return cat;
    }
  }
  return null;
}

function loadSystemMap(repoRoot) {
  const path = join(repoRoot, 'docs', 'SYSTEM_MAP.md');
  return readFileSync(path, 'utf8');
}

/**
 * Resolve SYSTEM_MAP categories for the given files and return the arch section string.
 * Exits with an error if a module-path file cannot be found in SYSTEM_MAP.
 */
function resolveArchSection(files, systemMapText) {
  const categories = parseSystemMapCategories(systemMapText);

  const seenModules = new Set();
  const errors = [];
  const matchedCategoryIndices = new Map();

  for (const filePath of files) {
    const modName = resolveModuleName(filePath);
    if (!modName) continue;
    if (seenModules.has(modName)) continue;
    seenModules.add(modName);

    const cat = findCategoryForModule(modName, categories);
    if (!cat) {
      errors.push(`Module "${modName}" (from "${filePath}") not in SYSTEM_MAP`);
      continue;
    }
    const idx = categories.indexOf(cat);
    matchedCategoryIndices.set(idx, cat);
  }

  if (errors.length > 0) {
    process.stderr.write(errors.join('\n') + '\n');
    process.exit(1);
  }

  const sortedCategories = [...matchedCategoryIndices.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, cat]) => cat);

  return sortedCategories.map((cat) => cat.content.trimEnd()).join('\n\n');
}

function emitTier1Brief({ files, budget, systemMapText, slice, repoRoot }) {
  const archSection = resolveArchSection(files, systemMapText);
  const sliceLine = slice ? `**Slice:** ${slice}  \n` : '';
  const filesLine = `**Files:** ${files.join(', ')}  \n`;

  const howToReadSection = buildHowToReadSection();
  const suggestedNextActionsSection = buildSuggestedNextActionsSection();
  const tier2EmptySection = `## Module manifests\n\n_(no modules in scope)_\n\n`;
  const tier3EmptySection = `## Sidecar neighborhood\n\n_(no modules in scope)_\n\n`;

  const prefixParts = [
    `# Slice context`,
    ``,
    sliceLine + filesLine,
    howToReadSection,
    `## Architectural map`,
    ``,
    archSection,
    ``,
  ].join('\n');

  const tier1Tokens = approximateTokenCount(prefixParts + '\n## Token budget\n');

  if (tier1Tokens > budget) {
    process.stderr.write(
      `Error: Tier-1 output (${tier1Tokens} tokens) exceeds budget (${budget}). Tier-1 cannot be dropped.\n`,
    );
    process.exit(1);
  }

  // Build Tier-4 for non-module files (fixed, never dropped)
  let tier4Section = '';
  if (repoRoot) {
    try {
      tier4Section = buildTier4Section({ files, repoRoot });
    } catch (e) {
      process.stderr.write(e.message + '\n');
      process.exit(1);
    }
  }
  const tier4Tokens = approximateTokenCount(tier4Section);

  if (tier1Tokens + tier4Tokens > budget) {
    process.stderr.write(
      `Error: Tier-1 + Tier-4 cost (${tier1Tokens + tier4Tokens} tokens) exceeds --budget (${budget} tokens). ` +
        `Raise --budget or reduce --files to fix this.\n`,
    );
    process.exit(1);
  }

  const totalTokens = tier1Tokens + tier4Tokens;

  const tokenBudgetSection = [
    `## Token budget`,
    ``,
    `- Tier-1 (architectural map): ${tier1Tokens} tokens`,
    `- Tier-2 (module manifests): 0 tokens`,
    `- Tier-3 (sidecar neighborhood): 0 tokens`,
    `- Tier-4 (touched files): ${tier4Tokens} tokens`,
    `- Total: ${totalTokens} tokens / --budget=${budget} tokens`,
    ``,
  ].join('\n');

  return (
    prefixParts +
    '\n' +
    tier2EmptySection +
    tier3EmptySection +
    tier4Section +
    suggestedNextActionsSection +
    tokenBudgetSection
  );
}

/** Load manifest.json for a module; returns { path, content } or null if not found. */
function loadManifest(repoRoot, moduleName) {
  const filePath = join(repoRoot, 'modules', moduleName, 'manifest.json');
  if (!existsSync(filePath)) return null;
  return { path: `modules/${moduleName}/manifest.json`, content: readFileSync(filePath, 'utf8') };
}

/** Load the public-API surface for a module; tries public-api.mjs, public-api.ts, index.mjs, index.ts. */
function loadPublicApi(repoRoot, moduleName) {
  for (const name of ['public-api.mjs', 'public-api.ts', 'index.mjs', 'index.ts']) {
    const filePath = join(repoRoot, 'modules', moduleName, name);
    if (existsSync(filePath)) {
      return { path: `modules/${moduleName}/${name}`, content: readFileSync(filePath, 'utf8') };
    }
  }
  return null;
}

/**
 * Build the ## Module manifests section with per-module manifest + public-API blocks.
 *
 * Drop priority: modules emitted last from the unique list (last first-seen in --files) are
 * dropped first when budget is tight. We include modules in first-seen order; a module is
 * skipped if its combined block would exceed the remaining token budget.
 *
 * Returns empty string when modules list is empty or the heading itself exceeds remainingBudget.
 */
function buildTier2Section({ modules, repoRoot, remainingBudget }) {
  if (modules.length === 0) return '';

  const heading = `## Module manifests\n\n`;
  const headingTokens = Math.ceil(Buffer.byteLength(heading, 'utf8') / 4);
  if (headingTokens > remainingBudget) return '';

  let used = headingTokens;
  let body = '';
  let droppedCount = 0;

  for (const moduleName of modules) {
    const manifest = loadManifest(repoRoot, moduleName);
    const publicApi = loadPublicApi(repoRoot, moduleName);

    let block = '';
    if (manifest) {
      block += `### ${manifest.path}\n\n\`\`\`json\n${manifest.content.trimEnd()}\n\`\`\`\n\n`;
    }
    if (publicApi) {
      block += `### ${publicApi.path}\n\n\`\`\`js\n${publicApi.content.trimEnd()}\n\`\`\`\n\n`;
    }
    if (!block) continue;

    const blockTokens = Math.ceil(Buffer.byteLength(block, 'utf8') / 4);
    if (used + blockTokens > remainingBudget) {
      droppedCount++;
      continue;
    }

    body += block;
    used += blockTokens;
  }

  if (droppedCount > 0) {
    const marker = `[truncated: ${droppedCount} module${droppedCount !== 1 ? 's' : ''} dropped due to budget]\n\n`;
    body += marker;
  }

  if (!body) return '';
  return heading + body;
}

/**
 * Build the ## Sidecar neighborhood section for Tier-3.
 *
 * Lists .header.md sidecar paths inline (one per line, as a bullet list).
 * Budget-aware: sidecars are dropped from the end when the running cost exceeds
 * remainingBudget. A [truncated: N sidecars dropped due to budget] marker is
 * appended when at least one sidecar is dropped.
 *
 * Returns empty string when modules is empty or heading itself exceeds budget.
 * Throws on invalid radius (propagated from computeNeighborhood).
 */
function buildTier3Section({ modules, radius, repoRoot, remainingBudget }) {
  if (modules.length === 0) return '';

  const sidecars = computeNeighborhood({ modules, radius, repoRoot });

  if (sidecars.length === 0) return '';

  const heading = `## Sidecar neighborhood\n\n`;
  const headingTokens = Math.ceil(Buffer.byteLength(heading, 'utf8') / 4);
  if (headingTokens > remainingBudget) return '';

  let used = headingTokens;
  let body = '';
  let droppedCount = 0;

  for (const sidecarRelPath of sidecars) {
    const line = `- ${sidecarRelPath}\n`;
    const lineTokens = Math.ceil(Buffer.byteLength(line, 'utf8') / 4);
    if (used + lineTokens > remainingBudget) {
      droppedCount++;
      continue;
    }
    body += line;
    used += lineTokens;
  }

  if (droppedCount > 0) {
    const marker = `[truncated: ${droppedCount} sidecar${droppedCount !== 1 ? 's' : ''} dropped due to budget]\n`;
    body += marker;
  }

  if (!body) return '';
  return heading + body + '\n';
}

/**
 * Compute all tier components for a module-aware brief.
 * Extracted from emitBrief to share computation between markdown and JSON paths.
 * Exits the process on budget violations (same behaviour as before).
 */
function computeBriefComponents({
  files,
  budget,
  systemMapText,
  slice,
  repoRoot,
  neighborhoodRadius = 'medium',
}) {
  const archSection = resolveArchSection(files, systemMapText);
  const sliceLine = slice ? `**Slice:** ${slice}  \n` : '';
  const filesLine = `**Files:** ${files.join(', ')}  \n`;

  const howToReadSection = buildHowToReadSection();

  const prefixParts = [
    `# Slice context`,
    ``,
    sliceLine + filesLine,
    howToReadSection,
    `## Architectural map`,
    ``,
    archSection,
    ``,
  ].join('\n');

  const tier1HeaderTokens = approximateTokenCount(prefixParts + '\n## Token budget\n');

  if (tier1HeaderTokens > budget) {
    process.stderr.write(
      `Error: Tier-1 output (${tier1HeaderTokens} tokens) exceeds budget (${budget}). Tier-1 cannot be dropped.\n`,
    );
    process.exit(1);
  }

  let tier4Section = '';
  try {
    tier4Section = buildTier4Section({ files, repoRoot });
  } catch (e) {
    process.stderr.write(e.message + '\n');
    process.exit(1);
  }
  const tier4Tokens = approximateTokenCount(tier4Section);

  if (tier1HeaderTokens + tier4Tokens > budget) {
    process.stderr.write(
      `Error: Tier-1 + Tier-4 cost (${tier1HeaderTokens + tier4Tokens} tokens) exceeds --budget (${budget} tokens). ` +
        `Raise --budget or reduce --files to fix this.\n`,
    );
    process.exit(1);
  }

  const modules = uniqueModulesFromFiles(files);

  const remainingForTier2andTier3 = budget - tier1HeaderTokens - tier4Tokens;

  const tier2Section = buildTier2Section({
    modules,
    repoRoot,
    remainingBudget: remainingForTier2andTier3,
  });
  const tier2ActualTokens = approximateTokenCount(tier2Section);

  const remainingForTier3 = remainingForTier2andTier3 - tier2ActualTokens;
  const tier3Section = buildTier3Section({
    modules,
    radius: neighborhoodRadius,
    repoRoot,
    remainingBudget: remainingForTier3,
  });
  const tier3ActualTokens = approximateTokenCount(tier3Section);

  const tier2Full = buildTier2Section({ modules, repoRoot, remainingBudget: budget });
  const tier2FullTokens = approximateTokenCount(tier2Full);
  const tier3Full = buildTier3Section({
    modules,
    radius: neighborhoodRadius,
    repoRoot,
    remainingBudget: budget,
  });
  const tier3FullTokens = approximateTokenCount(tier3Full);

  const tier2DropMatch = tier2Section.match(/\[truncated:\s*(\d+)\s*module/);
  const tier3DropMatch = tier3Section.match(/\[truncated:\s*(\d+)\s*sidecar/);
  const tier2DroppedBool = tier2FullTokens > 0 && tier2ActualTokens < tier2FullTokens;
  const tier3DroppedBool = tier3FullTokens > 0 && tier3ActualTokens < tier3FullTokens;
  const tier2DroppedCount = tier2DropMatch
    ? parseInt(tier2DropMatch[1], 10)
    : tier2DroppedBool
      ? 1
      : 0;
  const tier3DroppedCount = tier3DropMatch
    ? parseInt(tier3DropMatch[1], 10)
    : tier3DroppedBool
      ? 1
      : 0;

  const tier2DropLabel = tier2DroppedCount > 0 ? ` [truncated: ${tier2DroppedCount} dropped]` : '';
  const tier3DropLabel = tier3DroppedCount > 0 ? ` [truncated: ${tier3DroppedCount} dropped]` : '';

  const totalTokens = tier1HeaderTokens + tier2ActualTokens + tier3ActualTokens + tier4Tokens;

  const tokenBudgetSection = [
    `## Token budget`,
    ``,
    `- Tier-1 (architectural map): ${tier1HeaderTokens} tokens`,
    `- Tier-2 (module manifests): ${tier2ActualTokens} tokens${tier2DropLabel}`,
    `- Tier-3 (sidecar neighborhood): ${tier3ActualTokens} tokens${tier3DropLabel}`,
    `- Tier-4 (touched files): ${tier4Tokens} tokens`,
    `- Total: ${totalTokens} tokens / --budget=${budget} tokens`,
    ``,
  ].join('\n');

  const suggestedNextActionsSection = buildSuggestedNextActionsSection();

  return {
    prefixParts,
    tier1Tokens: tier1HeaderTokens,
    tier2Section,
    tier2Tokens: tier2ActualTokens,
    tier2Dropped: tier2DroppedBool,
    tier3Section,
    tier3Tokens: tier3ActualTokens,
    tier3Dropped: tier3DroppedBool,
    tier4Section,
    tier4Tokens,
    totalTokens,
    tokenBudgetSection,
    suggestedNextActionsSection,
    modules,
    neighborhoodRadius,
    budget,
    files,
    slice,
  };
}

/**
 * Emit a brief that includes Tier-1 through Tier-4 with per-tier budget footer.
 * For non-module file lists, delegates to emitTier1Brief for byte-identical output.
 * Output is byte-identical to pre-TPL-295 when --explain and --format=json are not used.
 */
function emitBrief({
  files,
  budget,
  systemMapText,
  slice,
  repoRoot,
  neighborhoodRadius = 'medium',
}) {
  const c = computeBriefComponents({
    files,
    budget,
    systemMapText,
    slice,
    repoRoot,
    neighborhoodRadius,
  });
  // Assemble: # Slice context → How to read → Architectural map → Module manifests → Sidecar neighborhood → Touched files → Suggested next actions → Token budget
  return (
    c.prefixParts +
    '\n' +
    c.tier2Section +
    c.tier3Section +
    c.tier4Section +
    c.suggestedNextActionsSection +
    c.tokenBudgetSection
  );
}

/**
 * Build a JSON object containing the same data as the markdown brief.
 * Used when --format=json is passed.
 */
function buildJsonObject({ components, explain, profile }) {
  const {
    prefixParts,
    tier1Tokens,
    tier2Section,
    tier2Tokens,
    tier2Dropped,
    tier3Section,
    tier3Tokens,
    tier3Dropped,
    tier4Section,
    tier4Tokens,
    totalTokens,
    tokenBudgetSection,
    suggestedNextActionsSection,
    modules,
    neighborhoodRadius,
    budget,
    files,
    slice,
  } = components;

  const headings = [
    '# Slice context',
    '## How to read this brief',
    '## Architectural map',
    '## Module manifests',
    '## Sidecar neighborhood',
    '## Touched files (full source)',
    '## Suggested next actions',
    '## Token budget',
  ];

  // Tier-4 per-file breakdown for JSON consumers
  const tier4Files = [];
  const tier4Heading = '## Touched files (full source)\n\n';
  const tier4Body = tier4Section.startsWith(tier4Heading)
    ? tier4Section.slice(tier4Heading.length)
    : tier4Section;
  // Parse individual file blocks (### path\n\n```lang\ncontent\n```\n\n)
  const fileBlockRe = /###\s+([^\n]+)\n\n(?:```[^\n]*\n([\s\S]*?)```|\[binary file:[^\]]*\])\n\n/g;
  let fileMatch;
  while ((fileMatch = fileBlockRe.exec(tier4Body)) !== null) {
    const filePath = fileMatch[1].trim();
    const fileContent = fileMatch[2] ?? '';
    tier4Files.push({
      path: filePath,
      tokens: approximateTokenCount(fileMatch[0]),
      content: fileContent,
    });
  }

  const explainData = explain
    ? buildExplainData({
        tier1Tokens,
        tier2Tokens,
        tier3Tokens,
        tier4Tokens,
        tier2Dropped,
        tier3Dropped,
        radius: neighborhoodRadius,
      })
    : null;

  return {
    version: 1,
    slice: slice ?? null,
    files,
    profile: profile ?? 'mid',
    budget,
    tiers: {
      tier1: { tokens: tier1Tokens, content: prefixParts },
      tier2: {
        tokens: tier2Tokens,
        content: tier2Section,
        dropped: tier2Dropped ? [{ reason: 'exceeded budget' }] : [],
      },
      tier3: {
        tokens: tier3Tokens,
        content: tier3Section,
        radius: neighborhoodRadius,
        dropped: tier3Dropped ? [{ reason: 'exceeded budget' }] : [],
      },
      tier4: { tokens: tier4Tokens, files: tier4Files },
    },
    totalTokens,
    headings,
    explain: explainData,
  };
}

/** Build structured explain data object (used by --format=json --explain). */
function buildExplainData({
  tier1Tokens,
  tier2Tokens,
  tier3Tokens,
  tier4Tokens,
  tier2Dropped,
  tier3Dropped,
  radius,
}) {
  return {
    tier1: {
      status: 'included',
      tokens: tier1Tokens,
      reason: 'always included (architectural foundation)',
    },
    tier2: {
      status: tier2Dropped ? 'partially dropped' : 'included',
      tokens: tier2Tokens,
      reason: tier2Dropped
        ? 'would have exceeded remaining budget'
        : 'all module manifests fit within budget',
    },
    tier3: {
      status: tier3Dropped ? 'dropped' : 'included',
      tokens: tier3Tokens,
      radius,
      reason: tier3Dropped
        ? 'would have exceeded remaining budget by the allocated amount'
        : `radius=${radius}; all sidecars fit within budget`,
    },
    tier4: {
      status: 'included',
      tokens: tier4Tokens,
      reason: 'always included (full source of touched files)',
    },
  };
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (e) {
    process.stderr.write(e.message + '\n');
    process.exit(1);
  }

  const { files, budget, profile, slice, out, neighborhoodRadius, format, explain } = args;

  if (files.length === 0) {
    process.stderr.write('Error: --files is required (comma-separated list of file paths)\n');
    process.exit(1);
  }

  const systemMapText = loadSystemMap(ROOT);
  const modules = uniqueModulesFromFiles(files);

  let output;

  if (format === 'json') {
    // JSON path: compute components then emit JSON object
    if (modules.length === 0) {
      // Non-module files: use emitTier1Brief for content, build a minimal JSON from it
      const mdContent = emitTier1Brief({ files, budget, systemMapText, slice, repoRoot: ROOT });
      const totalMatch = mdContent.match(/- Total: (\d+) tokens/);
      const tier1Match = mdContent.match(/- Tier-1 \(architectural map\): (\d+) tokens/);
      const tier4Match = mdContent.match(/- Tier-4 \(touched files\): (\d+) tokens/);
      const totalTokens = totalMatch ? parseInt(totalMatch[1], 10) : 0;
      const tier1Tokens = tier1Match ? parseInt(tier1Match[1], 10) : 0;
      const tier4Tokens = tier4Match ? parseInt(tier4Match[1], 10) : 0;
      const explainData = explain
        ? buildExplainData({
            tier1Tokens,
            tier2Tokens: 0,
            tier3Tokens: 0,
            tier4Tokens,
            tier2Dropped: false,
            tier3Dropped: false,
            radius: neighborhoodRadius,
          })
        : null;
      const jsonObj = {
        version: 1,
        slice: slice ?? null,
        files,
        profile,
        budget,
        tiers: {
          tier1: { tokens: tier1Tokens, content: mdContent },
          tier2: { tokens: 0, content: '', dropped: [] },
          tier3: { tokens: 0, content: '', radius: neighborhoodRadius, dropped: [] },
          tier4: { tokens: tier4Tokens, files: [] },
        },
        totalTokens,
        headings: [
          '# Slice context',
          '## How to read this brief',
          '## Architectural map',
          '## Module manifests',
          '## Sidecar neighborhood',
          '## Touched files (full source)',
          '## Suggested next actions',
          '## Token budget',
        ],
        explain: explainData,
      };
      output = JSON.stringify(jsonObj, null, 2);
    } else {
      const components = computeBriefComponents({
        files,
        budget,
        systemMapText,
        slice,
        repoRoot: ROOT,
        neighborhoodRadius,
      });
      const jsonObj = buildJsonObject({ components, explain, profile });
      output = JSON.stringify(jsonObj, null, 2);
    }
  } else {
    // Markdown path (default) — byte-identical to pre-TPL-295 when --explain not set
    const mdOutput =
      modules.length === 0
        ? emitTier1Brief({ files, budget, systemMapText, slice, repoRoot: ROOT })
        : emitBrief({ files, budget, systemMapText, slice, repoRoot: ROOT, neighborhoodRadius });

    if (explain) {
      // Extract tier costs from the token budget section to build explain section
      const tier1Match = mdOutput.match(/- Tier-1 \(architectural map\): (\d+) tokens/);
      const tier2Match = mdOutput.match(/- Tier-2 \(module manifests\): (\d+) tokens/);
      const tier3Match = mdOutput.match(/- Tier-3 \(sidecar neighborhood\): (\d+) tokens/);
      const tier4Match = mdOutput.match(/- Tier-4 \(touched files\): (\d+) tokens/);
      const tier1Tokens = tier1Match ? parseInt(tier1Match[1], 10) : 0;
      const tier2Tokens = tier2Match ? parseInt(tier2Match[1], 10) : 0;
      const tier3Tokens = tier3Match ? parseInt(tier3Match[1], 10) : 0;
      const tier4Tokens = tier4Match ? parseInt(tier4Match[1], 10) : 0;
      const tier2Dropped =
        mdOutput.includes('[truncated:') && /- Tier-2.*\[truncated:/.test(mdOutput);
      const tier3Dropped =
        mdOutput.includes('[truncated:') && /- Tier-3.*\[truncated:/.test(mdOutput);
      const explainSection = buildExplainSection({
        tier1Tokens,
        tier2Tokens,
        tier3Tokens,
        tier4Tokens,
        tier2Dropped,
        tier3Dropped,
        radius: neighborhoodRadius,
      });
      // Insert explain section immediately before ## Token budget
      output = mdOutput.replace('\n## Token budget', '\n' + explainSection + '\n## Token budget');
    } else {
      output = mdOutput;
    }
  }

  if (out === '-') {
    process.stdout.write(output);
  } else {
    writeFileSync(out, output, 'utf8');
  }
}

// Only run main() when invoked directly (not when imported by tests)
const isMain =
  process.argv[1] &&
  (process.argv[1].replace(/\\/g, '/') ===
    import.meta.url.replace(/^file:\/\/\//i, '').replace(/\\/g, '/') ||
    process.argv[1] === fileURLToPath(import.meta.url));

if (isMain) {
  main().catch((e) => {
    process.stderr.write(e.message + '\n');
    process.exit(1);
  });
}
