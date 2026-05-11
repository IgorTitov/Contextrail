/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Batch fill semantic header fields (Owns, Boundaries, Invariants, NotesForLLM) using path-pattern heuristics.
 * @sidecar header-semantic-fill.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit rewrite-ok
 */

/**
 * Batch semantic fill for header fields: Owns, Boundaries, Invariants, NotesForLLM.
 * Also fixes Summary and Purpose when they are placeholder text.
 *
 * Usage: node scripts/checks/header-semantic-fill.mjs [--dry-run]
 */

import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { toPosix, readText, ensureWriteIfChanged, walk } from '../lib/fs-helpers.mjs';
import {
  collectRepoFiles,
  parseStructuredHeaderText,
  sidecarPath,
  commentStyle,
} from '../lib/header.mjs';

const DRY_RUN = process.argv.includes('--dry-run');
// Parallel-session safety: require --scope or --dry-run when called manually.
// Prevents accidental repo-wide sidecar overwrites in parallel sessions.
if (!DRY_RUN && !process.argv.includes('--scope') && process.env.COA_PRE_COMMIT !== '1') {
  const name = import.meta.url.split('/').pop();
  console.error(
    name +
      ': repo-wide run requires --scope=<dir> or --dry-run.\n' +
      "Running without scope in a parallel session can overwrite other sessions' files.\n" +
      'Use: node scripts/checks/' +
      name +
      ' --scope=modules/my-module',
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function humanName(slug) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function moduleName(file) {
  const m = toPosix(file).match(/^modules\/([^/]+)\//);
  return m ? m[1] : null;
}

function appName(file) {
  const m = toPosix(file).match(/^apps\/([^/]+)\//);
  return m ? m[1] : null;
}

function basename(file) {
  return path.basename(file, path.extname(file));
}

function parentDir(file) {
  return path.basename(path.dirname(file));
}

// ---------------------------------------------------------------------------
// Pattern matchers — return { summary, owns, boundaries, invariants, notes }
// Each field may be null if no override is needed.
// ---------------------------------------------------------------------------

function semanticForModule(file) {
  const p = toPosix(file);
  const mod = moduleName(file);
  if (!mod) return null;
  const base = basename(file);
  const ext = path.extname(file);

  // public-api.mjs
  if (/^modules\/[^/]+\/public-api\.mjs$/.test(p)) {
    return {
      summary: `Public API surface for the ${mod} hex module.`,
      owns: `The only import surface for the ${mod} module. All cross-module access goes through this file.`,
      boundaries: `Re-exports only. No business logic or infrastructure code lives here.`,
      invariants: `Every public symbol of the ${mod} module must be exported here. No deep imports allowed.`,
      notes: `Import from this file only when depending on ${mod}. Deep imports into module internals are forbidden.`,
    };
  }

  // manifest.json.header.md (sidecar)
  if (/^modules\/[^/]+\/manifest\.json\.header\.md$/.test(p)) {
    return {
      summary: `Sidecar header for the ${mod} module manifest.`,
      owns: `Metadata header for the ${mod} module manifest.json.`,
      boundaries: `Sidecar metadata only. Module configuration lives in manifest.json.`,
      invariants: `Must stay aligned with manifest.json content and module exports.`,
      notes: `Sidecar header for JSON. Read manifest.json for actual module configuration.`,
    };
  }

  // messages.mjs
  if (/^modules\/[^/]+\/messages\.mjs$/.test(p)) {
    return {
      summary: `i18n message registry for the ${mod} module.`,
      owns: `All user-facing text for the ${mod} module.`,
      boundaries: `Message key-value definitions only. No business logic.`,
      invariants: `Every user-facing string in the ${mod} module must come from this registry.`,
      notes: `i18n layer for ${mod}. Add new user-facing strings here, not inline in code.`,
    };
  }

  // types.d.ts or types.d.ts.header.md
  if (/types\.d\.ts(\.header\.md)?$/.test(p)) {
    const isSidecar = p.endsWith('.header.md');
    return {
      summary: `TypeScript type definitions for the ${mod} module${isSidecar ? ' (sidecar header)' : ''}.`,
      owns: `Type contracts and interfaces for the ${mod} module.`,
      boundaries: `Type definitions only. No runtime code.`,
      invariants: `Types must match the module's public API exports and port contracts.`,
      notes: `${isSidecar ? 'Sidecar header for the type definitions file. ' : ''}Reference for TypeScript consumers of the ${mod} module.`,
    };
  }

  // ports/*.mjs
  if (/\/ports\/[^/]+\.mjs$/.test(p)) {
    const portName = humanName(base.replace(/-port$/, ''));
    return {
      summary: `${portName} port contract for the ${mod} module.`,
      owns: `The ${portName} port interface definition for the ${mod} module.`,
      boundaries: `Port interface only. No implementation details or infrastructure code.`,
      invariants: `Must define and export a contract assertion function.`,
      notes: `Port contract. Adapters in adapters/ must satisfy this interface.`,
    };
  }

  // adapters/*.mjs
  if (/\/adapters\/[^/]+\.mjs$/.test(p)) {
    const adapterName = humanName(base.replace(/-adapter$/, ''));
    return {
      summary: `${adapterName} adapter for the ${mod} module.`,
      owns: `The ${adapterName} adapter implementation for the ${mod} module.`,
      boundaries: `Infrastructure-specific code. Must satisfy the module's port contract.`,
      invariants: `Must pass the port contract assertion defined in ports/.`,
      notes: `Infrastructure adapter. Swap for a different backend without touching domain logic.`,
    };
  }

  // domain/*.mjs
  if (/\/domain\/[^/]+\.mjs$/.test(p)) {
    const domainName = humanName(base);
    return {
      summary: `${domainName} domain logic for the ${mod} module.`,
      owns: `Core ${domainName} domain logic for the ${mod} module.`,
      boundaries: `Pure domain logic. No infrastructure dependencies allowed.`,
      invariants: `Must remain framework-free and testable in isolation.`,
      notes: `Core domain logic. Test in isolation without adapters.`,
    };
  }

  // Module-level README.md
  if (/^modules\/[^/]+\/README\.md$/.test(p)) {
    return {
      summary: `Overview and navigation guide for the ${mod} hex module.`,
      owns: `Directory listing and purpose description for the ${mod} module.`,
      boundaries: `Documentation only. Must not duplicate code or config.`,
      invariants: `Must stay current with the module's file structure and exports.`,
      notes: `Start here to understand the ${mod} module. Then read public-api.mjs for the export surface.`,
    };
  }

  // Sub-directory README.md (adapters/, domain/, ports/)
  if (/^modules\/[^/]+\/(adapters|domain|ports)\/README\.md$/.test(p)) {
    const layer = parentDir(file);
    return {
      summary: `Directory overview for the ${layer} layer of the ${mod} module.`,
      owns: `Navigation index for ${mod}/${layer}/.`,
      boundaries: `Index only. Implementation lives in sibling files.`,
      invariants: `Must list all files in the ${layer} directory.`,
      notes: `Start here for the ${layer} layer of the ${mod} module.`,
    };
  }

  // Catch-all for other module files
  const fileRole = base.includes('adapter')
    ? 'adapter'
    : base.includes('port')
      ? 'port'
      : ext === '.css'
        ? 'styles'
        : 'implementation';
  return {
    summary: `${humanName(base)} ${fileRole} for the ${mod} module.`,
    owns: `${humanName(base)} ${fileRole} within the ${mod} module.`,
    boundaries: `Scoped to the ${mod} module. Do not use outside this module boundary.`,
    invariants: `Must remain consistent with the ${mod} module's port contracts.`,
    notes: `Part of the ${mod} module. Access through public-api.mjs from outside the module.`,
  };
}

function semanticForApp(file) {
  const p = toPosix(file);
  const app = appName(file);
  if (!app) return null;
  const base = basename(file);
  const ext = path.extname(file);
  const dir = parentDir(file);

  // App-level README.md
  if (new RegExp(`^apps/${app}/README\\.md$`).test(p)) {
    return {
      summary: `Overview and setup guide for the ${app} app.`,
      owns: `Documentation entry point for the ${app} application.`,
      boundaries: `Documentation only. App logic lives in sibling source files.`,
      invariants: `Must describe the app's purpose, setup, and module wiring.`,
      notes: `Start here to understand the ${app} app. Check app.mjs or main entry for runtime details.`,
    };
  }

  // Sub-directory README.md
  if (/\/README\.md$/.test(p) && !new RegExp(`^apps/${app}/README\\.md$`).test(p)) {
    return {
      summary: `Directory overview for ${app}/${dir}/.`,
      owns: `Navigation index for ${app}/${dir}/.`,
      boundaries: `Index only. Implementation lives in sibling files.`,
      invariants: `Must stay current with directory contents.`,
      notes: `Directory guide for the ${dir} area of the ${app} app.`,
    };
  }

  // manifest.json.header.md / package.json.header.md
  if (/\.(json|yaml|yml)\.header\.md$/.test(p)) {
    const target = base.replace(/\.header$/, '');
    return {
      summary: `Sidecar header for ${app}/${target}.`,
      owns: `Metadata header for the ${app} app's ${target} file.`,
      boundaries: `Sidecar metadata only. Configuration lives in the target file.`,
      invariants: `Must stay aligned with ${target} content.`,
      notes: `Sidecar header for a config file. Read the target file for actual configuration.`,
    };
  }

  // app.mjs / main entry
  if (/\/(app|main|index)\.(mjs|js|jsx|ts|tsx)$/.test(p)) {
    return {
      summary: `Main entry point for the ${app} application.`,
      owns: `Application bootstrap and wiring for the ${app} app.`,
      boundaries: `App-layer orchestration only. Business logic lives in hex modules.`,
      invariants: `Must wire hex module adapters and expose the app's public surface.`,
      notes: `Main entry point. Wires hex module adapters into the application context.`,
    };
  }

  // app-config.mjs
  if (/app-config\.mjs$/.test(p)) {
    return {
      summary: `Configuration management for the ${app} application.`,
      owns: `Mode detection, config resolution, and environment setup for ${app}.`,
      boundaries: `Configuration only. No business logic or request handling.`,
      invariants: `Must export MODES, detectMode, getMode, setMode, resolveConfig, resetConfig.`,
      notes: `App config module. Used by app.mjs to wire the correct mode and settings.`,
    };
  }

  // routes/*.mjs
  if (/\/routes\/[^/]+\.mjs$/.test(p)) {
    const routeName = humanName(base);
    return {
      summary: `${routeName} route handler for the ${app} API.`,
      owns: `HTTP handler for the ${routeName.toLowerCase()} endpoint in ${app}.`,
      boundaries: `Route handling only. Business logic lives in hex modules.`,
      invariants: `Must accept (req, ctx) and return a response. Must use ctx adapters, not direct infra.`,
      notes: `Route handler. Uses app context adapters for caching, logging, and data access.`,
    };
  }

  // ui-selectors.mjs / selectors.js
  if (/selectors?\.(mjs|js)$/.test(p)) {
    return {
      summary: `Bounded UI selector registry for the ${app} app.`,
      owns: `All stable data-testid, DOM id, and derived selectors for ${app}.`,
      boundaries: `Selector definitions only. No DOM manipulation or business logic.`,
      invariants: `Templates, JS, and tests must use selectors from this registry, not hardcoded strings.`,
      notes: `UI selector registry. Import selectors here instead of hardcoding data-testid values.`,
    };
  }

  // i18n / messages
  if (/messages?\.(mjs|js)$/.test(p) || /\/i18n\//i.test(p)) {
    return {
      summary: `i18n messages for the ${app} app.`,
      owns: `User-facing text and locale management for ${app}.`,
      boundaries: `Message definitions and locale helpers only. No business logic.`,
      invariants: `All user-facing copy in ${app} must go through this layer.`,
      notes: `i18n layer. Add new user-facing strings here, not inline in templates.`,
    };
  }

  // CSS files
  if (ext === '.css') {
    return {
      summary: `Styles for ${humanName(base)} in the ${app} app.`,
      owns: `Visual styling for the ${humanName(base).toLowerCase()} feature area.`,
      boundaries: `CSS only. No JavaScript logic.`,
      invariants: `Selectors should reference stable class names or the UI selector registry.`,
      notes: `Stylesheet. Keep selectors stable and scoped to the feature area.`,
    };
  }

  // HTML files
  if (ext === '.html') {
    return {
      summary: `HTML entry point for the ${app} app.`,
      owns: `The HTML shell for the ${app} application.`,
      boundaries: `HTML structure only. Behavior lives in JS modules.`,
      invariants: `Must load the app's main JS module and reference the UI selector registry.`,
      notes: `HTML entry point. DOM hooks should come from the UI selector registry.`,
    };
  }

  // React components (*.jsx)
  if (ext === '.jsx') {
    const compName = humanName(base);
    return {
      summary: `${compName} React component for the ${app} app.`,
      owns: `The ${compName} UI component and its rendering logic.`,
      boundaries: `Presentation layer only. Business logic lives in hex modules via adapter hooks.`,
      invariants: `Must use adapter hooks for data access. Must use i18n for user-facing text.`,
      notes: `React component. Uses adapter hooks from src/adapters/ to access hex module functionality.`,
    };
  }

  // React adapter hooks (use-*.js)
  if (/^use-/.test(path.basename(file)) && (ext === '.js' || ext === '.jsx')) {
    const hookName = humanName(base.replace(/^use-/, ''));
    return {
      summary: `${hookName} adapter hook for the ${app} React app.`,
      owns: `React hook bridging the ${hookName.toLowerCase()} hex module to React components.`,
      boundaries: `Adapter layer only. Wraps hex module API in React hook conventions.`,
      invariants: `Must delegate to hex module public API. No direct infrastructure access.`,
      notes: `React adapter hook. Bridges hex modules to the React component layer.`,
    };
  }

  // Vite config
  if (/vite\.config\.(js|mjs|ts)$/.test(p)) {
    return {
      summary: `Vite build configuration for the ${app} app.`,
      owns: `Build tool configuration for the ${app} application.`,
      boundaries: `Build config only. No runtime application code.`,
      invariants: `Must align with the app's entry point and dependency structure.`,
      notes: `Vite config. Update when adding new entry points or build plugins.`,
    };
  }

  // Catch-all for app files
  return {
    summary: `${humanName(base)} for the ${app} app.`,
    owns: `${humanName(base)} within the ${app} application.`,
    boundaries: `Scoped to the ${app} app layer. Business logic lives in hex modules.`,
    invariants: `Must use hex module public APIs for cross-module access.`,
    notes: `Part of the ${app} app. Uses hex module adapters for business logic.`,
  };
}

function semanticForTemplate(file) {
  const p = toPosix(file);
  const parts = p.split('/');
  const tplName = parts[1] || 'unknown';
  const base = basename(file);
  const ext = path.extname(file);

  if (/^templates\/README\.md$/.test(p)) {
    return {
      summary: `Overview and navigation guide for all platform deployment templates.`,
      owns: `Directory listing and purpose description for the templates collection.`,
      boundaries: `Documentation only. Template implementations live in subdirectories.`,
      invariants: `Must list all available templates and their intended platform targets.`,
      notes: `Entry point for template discovery. Each subdirectory is a deployable platform scaffold.`,
    };
  }

  if (/^templates\/[^/]+\/README\.md$/.test(p)) {
    return {
      summary: `Setup and deployment guide for the ${tplName} platform template.`,
      owns: `Documentation for deploying the starter app as a ${tplName} application.`,
      boundaries: `Documentation only. Template configuration lives in sibling files.`,
      invariants: `Must describe prerequisites, setup steps, and platform-specific considerations.`,
      notes: `Read this before using the ${tplName} template. Covers platform-specific wiring.`,
    };
  }

  if (/\.(json|yaml|yml)$/.test(ext)) {
    return {
      summary: `${humanName(base)} configuration for the ${tplName} platform template.`,
      owns: `Platform-specific configuration for ${tplName} deployment.`,
      boundaries: `Configuration only. No runtime code.`,
      invariants: `Must stay aligned with the ${tplName} platform requirements and the app's entry points.`,
      notes: `${humanName(tplName)} platform config. Update when changing entry points or platform requirements.`,
    };
  }

  if (ext === '.html') {
    return {
      summary: `HTML entry point for the ${tplName} platform template.`,
      owns: `The HTML shell for the ${tplName} platform deployment.`,
      boundaries: `HTML structure only. Behavior lives in JS modules.`,
      invariants: `Must load the app's main JS module and match platform requirements.`,
      notes: `HTML entry point for ${tplName}. Keep aligned with the main app's index.html.`,
    };
  }

  return {
    summary: `${humanName(base)} for the ${tplName} platform template.`,
    owns: `${humanName(base)} within the ${tplName} template scaffold.`,
    boundaries: `Scoped to ${tplName} platform deployment. App logic lives in hex modules.`,
    invariants: `Must remain compatible with the app's public API and module wiring.`,
    notes: `Part of the ${tplName} template. Uses the same hex module adapters as the starter app.`,
  };
}

function semanticForDoc(file) {
  const p = toPosix(file);
  const base = basename(file);

  if (/^docs\/adr\//.test(p)) {
    return {
      summary: `Architecture Decision Record: ${humanName(base.replace(/^\d+-/, ''))}.`,
      owns: `The rationale, context, and decision for ${humanName(base.replace(/^\d+-/, '')).toLowerCase()}.`,
      boundaries: `Decision record only. Implementation lives in the codebase.`,
      invariants: `Must document context, decision, status, and consequences. Must not be silently changed after acceptance.`,
      notes: `ADR. If this decision needs revisiting, add a new ADR that supersedes this one.`,
    };
  }

  if (/^docs\/analysis\//.test(p)) {
    return {
      summary: `Internal analysis document: ${humanName(base)}.`,
      owns: `Analysis content for ${humanName(base).toLowerCase()}.`,
      boundaries: `Internal planning document. Not part of the template deliverable.`,
      invariants: `Must reflect the analysis as performed. Update conclusions if underlying facts change.`,
      notes: `Internal analysis. Not shipped with the template.`,
    };
  }

  if (/quality-assessment/.test(p)) {
    return {
      summary: `Quality assessment snapshot for the template at the indicated version.`,
      owns: `Evaluation findings, scores, and recommendations at a specific version milestone.`,
      boundaries: `Point-in-time assessment. Does not auto-update with code changes.`,
      invariants: `Must record the exact version evaluated and the methodology used.`,
      notes: `Historical quality snapshot. Compare across versions to track progress.`,
    };
  }

  return {
    summary: `Documentation: ${humanName(base)}.`,
    owns: `${humanName(base)} documentation content.`,
    boundaries: `Documentation only. Implementation lives in the codebase.`,
    invariants: `Must stay current with the described content.`,
    notes: `Documentation file. Update when the described subject changes.`,
  };
}

function semanticForScript(file) {
  const base = basename(file);

  return {
    summary: `${humanName(base)} script for repository automation.`,
    owns: `The ${humanName(base).toLowerCase()} automation task.`,
    boundaries: `Tooling script. Must not contain application business logic.`,
    invariants: `Must remain idempotent and safe to re-run.`,
    notes: `Repository automation script. Run via node scripts/checks/${path.basename(file)}.`,
  };
}

function semanticForClaim() {
  return {
    summary: `Example claim file for the inter-agent coordination protocol.`,
    owns: `Sample claim demonstrating the claim format and lifecycle.`,
    boundaries: `Example only. Not an active claim.`,
    invariants: `Must remain a valid claim JSON matching the schema in .claims/README.md.`,
    notes: `Reference example. Use claim-check.mjs --create to generate real claims.`,
  };
}

function semanticForRootConfig(file) {
  const base = basename(file);
  return {
    summary: `${humanName(base)} configuration for the repository.`,
    owns: `Repository-level ${humanName(base).toLowerCase()} settings.`,
    boundaries: `Configuration only. No runtime application code.`,
    invariants: `Must stay aligned with the project's tooling requirements.`,
    notes: `Root config file. Changes affect the entire repository.`,
  };
}

function semanticForTest(file) {
  const p = toPosix(file);
  const base = basename(file);
  const dir = parentDir(file);

  if (/^tests\/bdd\//.test(p)) {
    return {
      summary: `BDD support for the ${dir} test area.`,
      owns: `BDD step definitions or feature specifications for ${dir}.`,
      boundaries: `Test infrastructure only. No production code.`,
      invariants: `Each scenario must be independent with no shared mutable state.`,
      notes: `BDD tests. Selectors come from the UI selector registry.`,
    };
  }

  return {
    summary: `${humanName(base)} test infrastructure.`,
    owns: `Test support for the ${dir} area.`,
    boundaries: `Test code only. No production logic.`,
    invariants: `Tests must be independent and deterministic.`,
    notes: `Test file. Run via the project's test scripts.`,
  };
}

function generateSemantic(file) {
  const p = toPosix(file);

  if (p.startsWith('modules/')) return semanticForModule(file);
  if (p.startsWith('apps/')) return semanticForApp(file);
  if (p.startsWith('templates/')) return semanticForTemplate(file);
  if (p.startsWith('docs/')) return semanticForDoc(file);
  if (p.startsWith('scripts/')) return semanticForScript(file);
  if (p.startsWith('.claims/')) return semanticForClaim(file);
  if (p.startsWith('tests/')) return semanticForTest(file);

  // Root config files
  const ext = path.extname(file);
  if (['.mjs', '.js', '.json', '.yaml', '.yml', '.toml'].includes(ext)) {
    return semanticForRootConfig(file);
  }

  const base = basename(file);
  if (ext === '.md' || p.endsWith('.header.md')) {
    return {
      summary: `Documentation for ${humanName(base)}.`,
      owns: `${humanName(base)} documentation content.`,
      boundaries: `Documentation only.`,
      invariants: `Must stay current with the described content.`,
      notes: `Documentation file. Update when the described subject changes.`,
    };
  }

  return {
    summary: `${humanName(base)} utility.`,
    owns: `${humanName(base)} functionality.`,
    boundaries: `Scoped to its declared responsibility.`,
    invariants: `Must remain consistent with its documented role.`,
    notes: `Check the file header Summary for the specific role.`,
  };
}

// ---------------------------------------------------------------------------
// YAML quoting helper
// ---------------------------------------------------------------------------

function yamlQuote(val) {
  if (/[:#{}[\]|>&*!,?'"]/.test(val) || val.startsWith('@') || val.startsWith('`')) {
    return `"${val.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return val;
}

// ---------------------------------------------------------------------------
// Sparse sidecar fill — inject missing YAML fields
// ---------------------------------------------------------------------------

const SEMANTIC_TO_YAML = {
  summary: 'summary',
  owns: 'owns',
  boundaries: 'boundaries',
  invariants: 'invariants',
  notes: 'notesForLLM',
};

function fillSparseSidecar(sidecarFile, text, semantic) {
  const lines = text.split('\n');
  // Find closing ---
  let closingIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') {
      closingIdx = i;
      break;
    }
  }
  if (closingIdx === -1) return null;

  const existingFields = new Set();
  for (let i = 1; i < closingIdx; i++) {
    const m = lines[i].match(/^([a-zA-Z]+):/);
    if (m) existingFields.add(m[1]);
  }

  const newLines = [];
  for (const [semKey, yamlKey] of Object.entries(SEMANTIC_TO_YAML)) {
    if (existingFields.has(yamlKey)) continue;
    const val = semantic[semKey];
    if (!val) continue;
    newLines.push(`${yamlKey}: ${yamlQuote(val)}`);
  }

  if (newLines.length === 0) return null;

  // Insert before closing ---
  lines.splice(closingIdx, 0, ...newLines);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const SEMANTIC_FIELDS = ['Owns', 'Boundaries', 'Invariants', 'NotesForLLM'];
const FIELD_MAP = {
  Owns: 'owns',
  Boundaries: 'boundaries',
  Invariants: 'invariants',
  NotesForLLM: 'notes',
};

const mainFiles = await collectRepoFiles();
let fixedCount = 0;

// --- Pass 1: fill sparse YAML sidecars ---
for (const file of mainFiles) {
  const sc = sidecarPath(file);
  if (!existsSync(sc)) continue;
  const text = readFileSync(sc, 'utf8');
  if (!text.startsWith('---\n')) continue;

  const semantic = generateSemantic(file);
  if (!semantic) continue;

  const result = fillSparseSidecar(sc, text, semantic);
  if (!result) continue;

  if (DRY_RUN) {
    console.log(`[dry-run] ${sc}`);
  } else {
    await ensureWriteIfChanged(sc, result);
  }
  fixedCount++;
}

// --- Pass 2: fill old-format heavy headers (legacy compat) ---
const sidecarFiles = [];
for (const file of mainFiles) {
  if (commentStyle(file) === 'sidecar') {
    const sc = sidecarPath(file);
    try {
      await readText(sc);
      sidecarFiles.push(sc);
    } catch {
      /* no sidecar */
    }
  }
}
const allWalked = (await Promise.all(['modules', 'apps'].map(walk))).flat().map(toPosix);
for (const f of allWalked) {
  if (f.endsWith('.header.md') && !sidecarFiles.includes(f)) {
    sidecarFiles.push(f);
  }
}
const legacyFiles = [...mainFiles, ...sidecarFiles];

for (const file of legacyFiles) {
  let text;
  try {
    text = await readText(file);
  } catch {
    continue;
  }

  // Skip sparse sidecars (already handled in pass 1)
  if (text.startsWith('---\n') && file.endsWith('.header.md')) continue;

  const parsed = parseStructuredHeaderText(file, text);
  if (!parsed) continue;

  const { fileinfo } = parsed;
  const needsFix = SEMANTIC_FIELDS.some((f) => fileinfo[f] === '_none_');
  if (!needsFix) continue;

  const semantic = generateSemantic(file);
  if (!semantic) continue;

  let newText = text;
  let changed = false;

  for (const field of SEMANTIC_FIELDS) {
    if (fileinfo[field] !== '_none_') continue;
    const value = semantic[FIELD_MAP[field]];
    if (!value) continue;

    const pattern = `${field}: _none_`;
    const replacement = `${field}: ${value}`;
    const idx = newText.indexOf(pattern);
    if (idx !== -1) {
      newText = newText.slice(0, idx) + replacement + newText.slice(idx + pattern.length);
      changed = true;
    }
  }

  if (fileinfo.Summary === '_none_' && semantic.summary) {
    const summaryPattern = 'Summary: _none_';
    const fiIdx = newText.indexOf('FILEINFO-BEGIN');
    if (fiIdx !== -1) {
      const sIdx = newText.indexOf(summaryPattern, fiIdx);
      if (sIdx !== -1) {
        newText =
          newText.slice(0, sIdx) +
          `Summary: ${semantic.summary}` +
          newText.slice(sIdx + summaryPattern.length);
        changed = true;
      }
    }
  }

  const purposeMatch = newText.match(/Purpose: Describe the role of [^\n]+ in this repository\./);
  if (purposeMatch && semantic.summary) {
    newText = newText.replace(purposeMatch[0], `Purpose: ${semantic.summary}`);
    changed = true;
  }

  if (changed) {
    if (DRY_RUN) {
      console.log(`[dry-run] ${file}`);
    } else {
      await ensureWriteIfChanged(file, newText);
    }
    fixedCount++;
  }
}

console.log(`header-semantic-fill ${DRY_RUN ? 'would update' : 'updated'} ${fixedCount} file(s)`);
