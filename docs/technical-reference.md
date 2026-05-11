<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Document technical-reference for this repository.
@sidecar technical-reference.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Technical Reference

**Contextrail Template v0.6.6**

Complete technical reference covering architecture, APIs, build system, testing, tooling, and configuration.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Hexagonal Module Contract](#2-hexagonal-module-contract)
3. [Multi-Platform System](#3-multi-platform-system)
4. [Build System](#4-build-system)
5. [Testing Framework](#5-testing-framework)
6. [Design System](#6-design-system)
7. [i18n / Messages Layer](#7-i18n--messages-layer)
8. [Selector Registry Pattern](#8-selector-registry-pattern)
9. [Feature Seams (Branch by Abstraction)](#9-feature-seams-branch-by-abstraction)
10. [Structured Headers v2](#10-structured-headers-v2)
11. [Traceability System](#11-traceability-system)
12. [Quality Gate Scripts](#12-quality-gate-scripts)
13. [Module Detachment CLI](#13-module-detachment-cli)
14. [Artifact Generation](#14-artifact-generation)
15. [Agent Compatibility Contract](#15-agent-compatibility-contract)
16. [Git Hooks](#16-git-hooks)
17. [Configuration Reference](#17-configuration-reference)

---

## 1. Architecture Overview

The template implements a **modular monolith** with strict hexagonal architecture. Each bounded context lives under `modules/<name>/` and communicates with the outside world only through its `public-api.mjs`.

### Layer Model

```
┌─────────────────────────────────────────────────────┐
│  apps/starter/          UI & App Shell (wiring)     │
├─────────────────────────────────────────────────────┤
│  modules/<name>/                                     │
│    ├── public-api.mjs   Single cross-module entry   │
│    ├── domain/          Pure logic (no deps)        │
│    ├── ports/           Contracts (interfaces)      │
│    └── adapters/        Implementations             │
├─────────────────────────────────────────────────────┤
│  scripts/               Tooling & automation        │
├─────────────────────────────────────────────────────┤
│  tests/                 5 test layers               │
├─────────────────────────────────────────────────────┤
│  docs/                  PRD, USM, backlog, ADR      │
└─────────────────────────────────────────────────────┘
```

### Dependency Rules

| From | To | Allowed? |
|------|----|----------|
| App shell | Module public-api | Yes |
| Module A public-api | Module B public-api | Yes |
| Module domain | Module ports | Yes |
| Module adapters | Module ports | Yes |
| Module adapters | Module domain | Yes |
| Any | Module internals (non-public-api) | **No** |
| Module domain | Module adapters | **No** |
| Module domain | External packages | **No** |

### Runtime Contract

**Tooling is Node-only. Modules are runtime-agnostic.**

| Layer | Runtime | Rationale |
|-------|---------|-----------|
| `scripts/`, `.githooks/`, CI workflows | Node.js ≥22 | Quality gates, sync, build tooling use `node:fs`, `node:path`, and other Node builtins |
| `modules/*/domain/` | Any JS runtime | Pure business logic — no Node, browser, or framework APIs |
| `modules/*/ports/` | Any JS runtime | Interface contracts — no runtime coupling |
| `modules/*/adapters/` | Target runtime | Adapters may use browser APIs (DOM, IndexedDB), Node APIs (fs, http), or framework APIs (React hooks) |
| `apps/*/` | Target runtime | App shell wires adapters to the target platform |

This means:
- **Deno/Bun**: Modules work unmodified. Tooling scripts need Node compat flags or a Node installation.
- **TypeScript**: Rename `.mjs` → `.ts` and add types. See the [TypeScript Migration Guide](guides/typescript-migration.md) when available.
- **Browser**: Domain and port layers run in any browser. Adapters use browser-specific APIs behind port interfaces.

---

## 2. Hexagonal Module Contract

### Required Files

Every hex module must have:

| File | Purpose |
|------|---------|
| `public-api.mjs` | The only file importable by other modules |
| `manifest.json` | Declares dependencies, exports, test files |
| `messages.mjs` | i18n strings for module error messages |
| `types.d.ts` | TypeScript definitions for IDE support |
| `README.md` | Module documentation |

### Port Contract Pattern

Every port defines a runtime validator function:

```javascript
// modules/<name>/ports/<name>-port.mjs
import { t } from '../messages.mjs';

export function assertMyPort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError(t('mymodule.error.port_not_object'));
  }
  if (typeof adapter.doSomething !== 'function') {
    throw new TypeError(t('mymodule.error.port_missing_method'));
  }
}
```

### Adapter Factory Pattern

Adapters are created via factory functions:

```javascript
// modules/<name>/adapters/memory-adapter.mjs
export function createMemoryAdapter(options = {}) {
  const store = new Map();
  return {
    doSomething(input) { /* implementation */ },
    clear() { store.clear(); },
  };
}
```

### Manifest Schema

```json
{
  "name": "my-module",
  "description": "Short description",
  "exports": ["public-api.mjs"],
  "dependencies": {
    "modules": ["other-module"],
    "external": [],
    "builtins": []
  },
  "testFiles": [
    "tests/unit/my-module.test.mjs",
    "tests/contract/my-module-hex-contract.test.mjs"
  ]
}
```

### Public API Pattern

```javascript
// modules/<name>/public-api.mjs

// Ports
export { assertMyPort } from './ports/my-port.mjs';

// Adapters
export { createMemoryAdapter } from './adapters/memory-adapter.mjs';
export { createPersistentAdapter } from './adapters/persistent-adapter.mjs';

// Domain utilities (if any)
export { myDomainFunction } from './domain/core.mjs';
```

---

## 3. Multi-Platform System

### Mode Detection Priority

```
1. URL parameter:  ?mode=pwa
2. HTML meta tag:  <meta name="app-mode" content="pwa">
3. package.json:   appConfig.mode (default: "hosted")
```

### Available Modes

| Mode | Storage | Service Worker | Install Prompt | Offline |
|------|---------|---------------|----------------|---------|
| `hosted` | localStorage | No | No | No |
| `pwa` | localStorage + Cache API | Yes | Yes | Yes |
| `local` | IndexedDB | No | No | No |
| `electron` | IndexedDB | No | No | Yes |
| `extension` | Memory | No | No | No |
| `capacitor` | IndexedDB | No | No | Partial |

### App Config API

```javascript
// apps/starter/app-config.mjs

import {
  detectMode,        // → 'hosted' | 'pwa' | 'local' | 'electron' | 'extension' | 'capacitor'
  getMode,           // current mode getter
  setMode,           // mode override (for testing)
  getFeatureFlags,   // → { pwa, offlineCache, installPrompt }
  resolveConfig,     // merged config with overrides
  resetConfig,       // reset to defaults (testing)
  MODES,             // enum: { HOSTED, PWA, LOCAL, ELECTRON, EXTENSION, CAPACITOR }
} from './app-config.mjs';
```

### Environment Detection

```javascript
// apps/starter/platform/environment-detect.mjs

import {
  hasServiceWorker,     // → boolean
  hasIndexedDB,         // → boolean
  hasLocalStorage,      // → boolean
  isElectron,           // → boolean
  isCapacitor,          // → boolean
  isChromeExtension,    // → boolean
  isStandaloneDisplay,  // → boolean (PWA installed)
} from './platform/environment-detect.mjs';
```

### Adapter Factory

```javascript
// apps/starter/platform/adapter-factory.mjs

import {
  getAdapterPlan,       // → { storageType: 'indexeddb'|'localstorage'|'memory' }
  createStorageAdapter,  // → StoragePort adapter based on plan
} from './platform/adapter-factory.mjs';
```

---

## 4. Build System

### Build Script

```bash
node scripts/build-single.mjs [--mode <mode>] [--clean] [--treeshake]
```

| Flag | Purpose |
|------|---------|
| `--mode hosted` | Target platform mode (default: from package.json) |
| `--clean` | Remove `dist/` before building |
| `--treeshake` | Copy only modules referenced by the import graph |

### How Build Works

1. Creates `dist/` directory
2. Copies `apps/starter/` contents into `dist/`
3. Patches `<meta name="app-mode">` in `index.html` to target mode
4. If `--treeshake`: traces import graph from entry point, copies only used modules
5. If not: copies all `modules/` into `dist/modules/`

### npm Scripts

```bash
pnpm build           # default mode from package.json
pnpm build:hosted    # --mode hosted --clean
pnpm build:pwa       # --mode pwa --clean
pnpm build:local     # --mode local --clean
pnpm build:electron  # --mode electron --clean
```

### Import Graph Analyzer

```javascript
// scripts/import-graph.mjs — programmatic API

import {
  parseImports,        // (source: string) → string[] — extract import paths from source
  resolveImportPath,   // (importer, specifier, root) → string|null
  buildImportGraph,    // (entryPoint, root) → Map<string, string[]>
  getReachableFiles,   // (graph, entryPoint) → Set<string>
} from './import-graph.mjs';
```

CLI mode:
```bash
node scripts/import-graph.mjs apps/starter/app.mjs
# Outputs reachable file list
```

---

## 5. Testing Framework

### Test Runner

All tests use Node.js built-in `node:test` module — zero test framework dependencies.

```javascript
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
```

### Test Layers

| Layer | Directory | Command | What It Proves |
|-------|-----------|---------|---------------|
| Unit | `tests/unit/` | `pnpm test:unit` | Pure module logic |
| Integration | `tests/integration/` | `pnpm test:integration` | System-level coherence |
| Contract | `tests/contract/` | `pnpm test:contract` | Hex boundary compliance |
| BDD | `tests/bdd/` | `pnpm test:bdd` | Gherkin scenarios |
| E2E | `tests/e2e/` | `pnpm test:e2e:smoke` | Browser behavior |

### Contract Test Pattern

Every hex module has a contract test that verifies:

```javascript
// tests/contract/<name>-hex-contract.test.mjs

describe('<name> hex contract', () => {
  it('has public-api.mjs', () => { /* file exists */ });
  it('has manifest.json', () => { /* valid JSON */ });
  it('has types.d.ts', () => { /* file exists */ });
  it('has README.md', () => { /* file exists */ });
  it('exports only from public-api', () => { /* no deep imports */ });
  it('domain has no adapter imports', () => { /* boundary check */ });
  it('port validator works', () => { /* runtime check */ });
});
```

### E2E Configuration

```javascript
// playwright.config.mjs

export default {
  testDir: 'tests/e2e',
  use: {
    headless: !process.env.HEADED,
    slowMo: parseInt(process.env.E2E_SLOWMO || '0', 10),
  },
};
```

E2E modes:
```bash
pnpm e2e              # headless
pnpm e2e:visible      # browser visible
pnpm e2e:headed       # alias for visible
pnpm e2e:demo         # slow motion (500ms)
pnpm e2e:ui           # Playwright UI mode
```

---

## 6. Design System

### CSS Architecture

Four files loaded in strict order:

```html
<link rel="stylesheet" href="design/reset.css">
<link rel="stylesheet" href="design/tokens.css">
<link rel="stylesheet" href="theme-toggle/theme-variables.css">
<link rel="stylesheet" href="design/components.css">
```

### Token Categories

| Category | Prefix | Example | Source File |
|----------|--------|---------|-------------|
| Spacing | `--space-` | `--space-sm: 0.5rem` | tokens.css |
| Typography | `--font-`, `--text-` | `--font-sans`, `--text-base` | tokens.css |
| Shadows | `--shadow-` | `--shadow-md` | tokens.css |
| Z-index | `--z-` | `--z-modal: 1000` | tokens.css |
| Width | `--width-` | `--width-content: 80ch` | tokens.css |
| Colors | `--color-` | `--color-primary`, `--color-bg` | theme-variables.css |
| Radius | `--radius-` | `--radius-md` | theme-variables.css |
| Transitions | `--transition-` | `--transition-fast` | theme-variables.css |

### Component Classes

| Class | Variants | Description |
|-------|----------|-------------|
| `.btn` | `--primary`, `--secondary`, `--ghost`, `--sm`, `--lg` | Button styles |
| `.input` | `--error` | Form input styles |
| `.card` | `--elevated` | Card container with `__header`, `__title`, `__body`, `__footer` |
| `.badge` | `--success`, `--error`, `--info` | Status badges |
| `.stack` | — | Vertical flex layout with gap |
| `.row` | — | Horizontal flex layout with gap |
| `.center` | — | Centered flex container |
| `.divider` | — | Horizontal rule |
| `.text-muted` | — | Muted text color |
| `.text-sm` | — | Small text size |
| `.text-lg` | — | Large text size |
| `.text-mono` | — | Monospace font |

### Theming

Dark mode activates automatically via `prefers-color-scheme: dark` or manually via `data-theme="dark"` on the root element.

```javascript
// Toggle theme
document.documentElement.setAttribute('data-theme', 'dark');
document.documentElement.removeAttribute('data-theme'); // auto
```

---

## 7. i18n / Messages Layer

### Module-Level Pattern

Each module has its own `messages.mjs`:

```javascript
// modules/<name>/messages.mjs

const messages = {
  en: {
    'mymodule.error.not_found': 'Item not found',
    'mymodule.error.invalid': 'Invalid input: {field}',
  },
};

let locale = 'en';

export function t(key, params = {}) {
  let msg = messages[locale]?.[key] ?? messages.en?.[key] ?? key;
  for (const [k, v] of Object.entries(params)) {
    msg = msg.replace(`{${k}}`, String(v));
  }
  return msg;
}

export function setLocale(loc) { locale = loc; }
export function getLocale() { return locale; }
export function registerLocale(loc, entries) { messages[loc] = { ...messages[loc], ...entries }; }
```

### App-Level Pattern

The starter app has a central `messages.mjs` that delegates to locale files:

```javascript
// apps/starter/messages.mjs
import { t, setLocale, getLocale, registerLocale, resetLocale } from './messages.mjs';

// Usage
t('nav.home');                         // → "Home"
t('greeting', { name: 'Alice' });     // → "Hello, Alice"
setLocale('ru');
t('nav.home');                         // → "Главная"
```

Locale files live in `apps/starter/locales/`:
```
locales/
├── en.mjs    English (default)
└── ru.mjs    Russian
```

---

## 8. Selector Registry Pattern

### Purpose

Stable `data-testid`, DOM `id`, and derived CSS selectors live in bounded registries — one per feature, not one global table. Product code, tests, and automation import from the same registry.

### Implementation

```javascript
// apps/starter/ui-selectors.mjs (example for bootstrap feature)

export const SEL = {
  APP_ROOT:    { testId: 'app-root',    id: 'app-root' },
  GREETING:    { testId: 'greeting',    id: 'greeting' },
  NAV_MENU:    { testId: 'nav-menu',    id: 'nav-menu' },
};

// Derived selectors for test automation
export const CSS = Object.fromEntries(
  Object.entries(SEL).map(([key, val]) => [key, `[data-testid="${val.testId}"]`])
);
```

### Usage in Code

```javascript
// In app template
element.setAttribute('data-testid', SEL.GREETING.testId);

// In Playwright tests
await page.locator(CSS.GREETING).waitFor();
```

---

## 9. Feature Seams (Branch by Abstraction)

### API

```javascript
import {
  assertSeamPort,             // runtime port validator
  createMemorySeamAdapter,    // in-memory seam store
  createConfigSeamAdapter,    // configuration-driven seams
  SEAM_STATES,                // { ENABLED, DISABLED, SHADOW }
  whenEnabled,                // (seamAdapter, name, fn) → conditional execution
  ifEnabled,                  // (seamAdapter, name) → boolean
} from '../../modules/feature-seams/public-api.mjs';
```

### Usage Pattern

```javascript
// Create seam adapter
const seams = createMemorySeamAdapter();

// Register a seam (disabled by default)
seams.register('new-checkout', SEAM_STATES.DISABLED);

// Guard new behavior
whenEnabled(seams, 'new-checkout', () => {
  // New checkout flow — only runs when seam is enabled
  renderNewCheckout();
});

// Check seam state
if (ifEnabled(seams, 'new-checkout')) {
  // ...
}

// Enable the seam (e.g., after tests pass)
seams.setState('new-checkout', SEAM_STATES.ENABLED);
```

### Seam Audit

```bash
node scripts/checks/seam-audit.mjs
# Reports all registered seams and their states
```

BBA seams compose with the [inter-agent coordination protocol](adr/0008-inter-agent-coordination-protocol.md): when an agent needs cross-boundary access, filing a `bba-additive` claim and creating a new seam is always preferred over modifying existing code. See `.claims/README.md` for claim format.

---

## 10. Structured Headers v2

### Inline Header Format

```javascript
/* @HEADER-START
version 0.2.1 | 2026-03-29
path: modules/my-module/adapters/my-adapter.mjs
Purpose: Short description of what this file does.
CHANGELOG-BEGIN
Summary:
- Brief summary of changes
Added:
- New features
Changed:
- Modified behavior
Fixed:
- Bug fixes
Removed:
- Removed features
Notes:
- Additional notes
CHANGELOG-END
FILEINFO-BEGIN
FileId: project-prefix:modules:my-module:adapters:my-adapter
Path: modules/my-module/adapters/my-adapter.mjs
Layer: adapter
Module/Package: modules/my-module
Public: false
API: file-local
Stability: evolving
EditPolicy: careful
Steward: shared
DependsOn: modules/my-module/ports/my-port.mjs
Owns: Description of what this file uniquely owns.
Boundaries: What this file must NOT do.
Invariants: What must always be true about this file.
Tests: tests/unit/my-module.test.mjs
Risks: What could go wrong.
LinkedDocs: docs/prd/my-feature.md
SpecRefs: TPL-001
UsmRefs: _none_
Related: related files
Generated: false
Security/Privacy: Security notes.
NotesForLLM: Hints for AI agents reading this file.
HexLayer: adapter
PortType: _none_
AdapterType: outbound
BoundedContext: my-module
AllowedDependencies: modules/my-module/ports/*; modules/my-module/domain/*
ForbiddenDependencies: modules/*/adapters/*
ExternalSystems: _none_
FILEINFO-END
HEADER-END */
```

### Sidecar Header Format

For files that cannot contain inline comments (JSON, SVG, images), use `<filename>.header.md`:

```
package.json       → package.json.header.md
data.svg           → data.svg.header.md
```

### Header Management Commands

```bash
# Create new headers
node scripts/checks/header-create.mjs <files...>

# Check headers for errors
node scripts/checks/header-check.mjs

# Auto-fix header issues
node scripts/checks/header-fix.mjs
```

### Key FILEINFO Fields

| Field | Values | Purpose |
|-------|--------|---------|
| `Public` | true, false | Whether this file is a legal cross-module import target. All `public-api.mjs` barrel files must be `true`. Internal domain/port/adapter files are `false`. |
| `Layer` | root, app, domain, adapter, port, tests, docs, tooling | Architectural layer |
| `Stability` | stable, evolving, experimental | Change risk indicator |
| `EditPolicy` | rewrite-ok, careful, frozen | How freely it can be changed |
| `HexLayer` | domain, port, adapter, app, infra | Hex architecture layer |
| `PortType` | inbound, outbound, _none_ | Port direction |
| `AdapterType` | inbound, outbound, _none_ | Adapter direction |

---

## 11. Traceability System

### ID Namespace

Single monotonic sequence: `TPL-001`, `TPL-002`, `TPL-003`, ...

The item type is a field, not part of the ID. Replace `TPL` with your project key.

### trace-yaml Format

```yaml
id: TPL-001
type: feature          # feature | bug | tech | ux | infra
title: Feature title
status: done           # intake | todo | in-progress | done | blocked
priority: must         # must | should | could | wont
parent: TPL-000        # optional parent item
module_ref: my-module  # optional module reference
```

### Traceability Chain

```
docs/prd/*.md          → SpecRefs in trace-yaml blocks
  ↓
docs/usm/scenarios/*.md → UsmRefs in trace-yaml blocks
  ↓
docs/backlog/*.md      → Work items with status tracking
  ↓
source code headers    → SpecRefs, UsmRefs fields
  ↓
test files             → SpecRefs in test descriptions
  ↓
CHANGELOG.md           → Referenced in version entries
  ↓
commit messages        → TPL-xxx references
```

### Validation Commands

```bash
node scripts/checks/spec-check.mjs       # Validate all trace links
node scripts/checks/spec-sync.mjs        # Align spec-linked docs
node scripts/checks/backlog-sync.mjs     # Align backlog references
```

---

## 12. Quality Gate Scripts

All scripts are in `scripts/checks/` and return exit code 0 (pass) or 1 (fail).

| Script | Purpose |
|--------|---------|
| `spec-check.mjs` | Traceability links resolve, no orphan or duplicate IDs |
| `spec-sync.mjs` | Align spec-linked documents |
| `backlog-sync.mjs` | Align backlog references |
| `product-docs-check.mjs` | PRD/USM/backlog structural consistency |
| `usm-check.mjs` | Persona and workflow template validation |
| `pre-impl-gate.mjs` | Block implementation without linked planning artifacts |
| `design-docs-check.mjs` | Design-lane routing and selector-registry wording |
| `architecture-check.mjs` | Hex boundaries, module structure, layer compliance |
| `delivery-flow-check.mjs` | Implementation/frontend/acceptance lane agreement |
| `control-plane-check.mjs` | Instructions/rules/scripts/hooks coherence |
| `header-check.mjs` | Structured header validation |
| `header-fix.mjs` | Auto-repair header issues |
| `header-create.mjs` | Create new structured headers |
| `readme-check.mjs` | Verify meaningful folders have README.md |
| `readme-fix.mjs` | Scaffold missing README files |
| `test-gate.mjs` | Run all deterministic test layers |
| `changeset-size-check.mjs` | Warn when staged changeset is too large |
| `claim-check.mjs` | Inter-agent coordination: overlap detection, enforcement, claim lifecycle |
| `product-data-check.mjs` | Product data file structural validation |
| `changelog-sync.mjs` | Verify CHANGELOG.md is current (`--check` mode) |
| `seam-audit.mjs` | Report all registered feature seams and states |
| `version-bump.mjs` | Update version across all surfaces |

---

## 13. Module Detachment CLI

### Usage

```bash
node scripts/detach-module.mjs <module-name> [--dry-run] [--force]
node scripts/detach-module.mjs --list
```

### Options

| Flag | Purpose |
|------|---------|
| `--list` | Show all modules with dependency status |
| `--dry-run` | Preview removal without deleting files |
| `--force` | Proceed even if other modules depend on target |
| `--help` | Show usage help |

### Programmatic API

```javascript
import {
  loadManifests,          // () → Map<string, ModuleManifest>
  buildDependentMap,      // (manifests) → Map<string, string[]>
  findBacklogReferences,  // (moduleName) → string[]
  detachModule,           // (name, manifests, options) → exitCode
} from './scripts/detach-module.mjs';
```

### What It Does

1. Reads `manifest.json` from every module under `modules/`
2. Builds a reverse dependency graph
3. Checks if any modules depend on the target
4. If dependents exist and `--force` is not set: aborts with error
5. Removes the module directory (`modules/<name>/`)
6. Removes associated test files (from `manifest.json.testFiles`)
7. Reports backlog references for manual cleanup
8. Prints summary with follow-up actions

---

## 14. Artifact Generation

### Merge + ZIP

```bash
pnpm mergezip              # snapshot + zip + auto-bump patch version
pnpm mergezip:quiet        # same, less output
pnpm mergezip:no-bump      # snapshot + zip WITHOUT bumping version
pnpm test:all:mergezip     # run all tests, produce artifacts even if tests fail
pnpm snapshot              # plain-text snapshot only
```

### Output

Artifacts are saved to `.backups/`:

```
.backups/
├── merge-<project-name>(<version>).txt     # Plain-text snapshot
└── merge-<project-name>(<version>).zip     # ZIP archive
```

### Version Bumping

`pnpm mergezip` automatically bumps the patch version:
- Reads current version from `VERSION`
- Increments patch: `0.2.1` → `0.2.2`
- Updates `VERSION` and `package.json`
- Creates snapshot and zip with new version

**After a release commit**, use `pnpm mergezip:no-bump` (or `--no-bump` / `--skip-version-bump`) to produce artifacts aligned with the version that was just released. Otherwise the default flow will bump the patch again and the resulting artifact filenames will not match the release commit.

Manual version control:
```bash
node scripts/checks/version-bump.mjs         # bump patch explicitly
```

---

## 15. Agent Compatibility Contract

### Canonical Source

```
docs/agent-contract/compatibility-contract.json
```

This JSON file defines:
- Shared non-negotiable rules
- Delivery workflow steps
- Available agent roles and routing
- Available skills and their invocation
- Quality gate commands

### Generated Adapters

| Tool | Files |
|------|-------|
| Claude Code | `.claude/CLAUDE.md`, `.claude/rules/`, `.claude/agents/` |
| OpenAI Codex | `AGENTS.md`, `.agents/`, `.agents/skills/` |

### Sync Commands

```bash
# Regenerate adapters from canonical contract
node scripts/agent-contract/sync.mjs

# Verify adapters match contract
node scripts/agent-contract/check.mjs
```

---

## 16. Git Hooks

### Installation

```bash
node scripts/checks/install-hooks.mjs
```

This sets `core.hooksPath` to `.githooks/`.

### Pre-Commit Pipeline

The `.githooks/pre-commit` script runs these checks in order:

1. `spec-check` — traceability validation
2. `spec-sync` — align spec-linked documents
3. `backlog-sync` — align backlog references
4. `product-docs-check` — PRD/USM/backlog consistency
5. `product-data-check` — product data file validation
6. `usm-check` — persona/workflow coverage
7. `claim-check --auto-expire` — expire stale claims
8. `claim-check --enforce --staged` — block on active modify/replace conflicts
9. `claim-check --auto-complete --staged` — complete claims whose targets are all staged
10. `pre-impl-gate` — planning artifact presence
11. `design-docs-check` — design-lane routing
12. `agent-contract:sync` — regenerate agent adapters
13. `readme-fix` — scaffold missing READMEs
14. `agent-contract:sync` — re-sync after readme changes
15. `header-fix` — repair header issues
16. `architecture-check` — hex boundary enforcement
17. `delivery-flow-check` — lane agreement
18. `control-plane-check` — instruction coherence
19. `agent-contract:check` — verify parity
20. `test-gate` — all test layers pass
21. `changeset-size-check` — changeset not too large
22. `changelog-sync` — changelog is current

---

## 17. Configuration Reference

### package.json Fields

```json
{
  "name": "project-name",
  "version": "0.2.2",
  "projectPrefix": "project-prefix",
  "projectPrefixAliases": [],
  "appConfig": {
    "mode": "hosted",
    "features": {
      "pwa": false,
      "offlineCache": false,
      "installPrompt": false
    }
  }
}
```

| Field | Purpose |
|-------|---------|
| `projectPrefix` | Used in header FileId generation and traceability |
| `projectPrefixAliases` | Legacy prefixes recognized during migration |
| `appConfig.mode` | Default platform mode |
| `appConfig.features` | Feature flags for PWA capabilities |

### VERSION File

Single line containing semver string:

```
0.2.2
```

Updated by `version-bump.mjs` and `mergezip`.

### Playwright Config

```javascript
// playwright.config.mjs
export default {
  testDir: 'tests/e2e',
  use: {
    headless: !process.env.HEADED,
    slowMo: parseInt(process.env.E2E_SLOWMO || '0', 10),
  },
};
```

| Env Variable | Purpose |
|--------------|---------|
| `HEADED` | Show browser during E2E tests |
| `E2E_SLOWMO` | Milliseconds to slow each action (for demos) |
