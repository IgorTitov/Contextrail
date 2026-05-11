<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Document brownfield-migration for this repository.
@sidecar brownfield-migration.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Brownfield migration guide

How to bring an existing React, Vue, Angular, or Svelte application into the
Contextrail / COA architecture **without rewriting its UI framework layer**.

## Core principle

> **Extract and restructure. Never rewrite the framework.**

The app layer (`apps/*`) may use any UI framework. Hex modules are
framework-agnostic. A correct brownfield migration moves business logic
_out_ of framework components _into_ hex modules while **keeping the
existing framework code intact**.

Deleting the original framework layer and rewriting it to vanilla JS is
the single most common — and most destructive — AI-agent mistake during
COA migration.

## Why framework rewriting is wrong

| Dimension | Extract & restructure | Rewrite to vanilla JS |
|---|---|---|
| **Code preservation** | ~100 % of original UI intact | 0 % — entire UI layer deleted |
| **Functionality** | Full feature parity from day one | 45-60 % typical loss |
| **Security** | Framework auto-escaping preserved | Manual innerHTML introduces XSS |
| **Speed** | Order of magnitude faster | Slow — every screen rebuilt |
| **Risk** | Incremental, reversible | All-or-nothing, irreversible |
| **Tests** | Existing component tests still pass | All UI tests must be rewritten |

These numbers come from a controlled experiment migrating the same
real-world application (209 files, 45 K LOC) twice — once with rewrite,
once with extraction. See
[Brownfield experiment case study](../analysis/brownfield-experiment-case-study.md).

## Prerequisites

Before starting, ensure:

1. The target app builds and runs.
2. You have a clean git state (`git status` shows nothing untracked).
3. The Contextrail template has been bootstrapped (`pnpm bootstrap` or
   manual placeholder replacement).
4. You understand which domain concepts in the app are candidates for
   hex module extraction.

## Step-by-step migration

### Phase 1 — Place the existing app

Move or copy the existing application into `apps/<app-name>/`:

```
apps/
  my-react-app/          <-- existing React/Vue/Angular/Svelte app
    src/
    package.json
    vite.config.ts        (or webpack, etc.)
    ...
```

Do **not** modify the framework code at this stage. The goal is a
working app inside the COA directory structure with all existing tests
passing.

**Checkpoint:** `pnpm --filter my-react-app dev` launches the app.

### Phase 2 — Identify domain logic to extract

Survey the existing codebase for business logic that is tangled with
framework code. Common candidates:

| Pattern in framework code | Hex module candidate |
|---|---|
| Validation functions in components | `modules/form-validation/` |
| Auth/session management in context/store | `modules/auth/` |
| Notification/toast logic in hooks/services | `modules/notifications/` |
| i18n translation lookups | `modules/i18n/` |
| Business-rule calculations | `modules/<domain>/` |
| Data transformation/normalization | `modules/<domain>/` |
| Permission/role checks | `modules/permission/` |
| State machines or workflow logic | `modules/state/` |

Prioritize by coupling: extract the domain concepts that are
**duplicated across multiple components** or that **contain business
rules** that should not depend on the UI framework.

### Phase 3 — Create hex modules (one at a time)

For each identified domain concept:

1. **Create the module scaffold:**

```bash
mkdir -p modules/<name>/domain modules/<name>/ports modules/<name>/adapters
```

2. **Extract pure functions** from framework components into
   `modules/<name>/domain/`. These functions must have zero framework
   imports.

3. **Define the port** in `modules/<name>/ports/` — the contract that
   any adapter (React hook, Angular service, Vue composable) must
   satisfy.

4. **Write the public API barrel** in `modules/<name>/public-api.mjs` —
   only re-export what consumers need.

5. **Add a port validator** (`assertXPort()`) so adapters are
   checked at initialization.

6. **Write unit tests** for the extracted domain logic:

```bash
# tests/unit/<name>/*.test.mjs
node --test "tests/unit/<name>/**/*.test.mjs"
```

**Checkpoint:** Domain tests pass. No framework imports in
`modules/<name>/`.

### Phase 4 — Wire framework adapters to hex ports

Replace the inline business logic in framework components with calls
to the hex module's public API through a thin adapter:

| Framework | Adapter pattern | Location |
|---|---|---|
| React | Custom hook (`useXxx`) | `apps/<app>/src/adapters/` |
| Vue | Composable (`useXxx`) | `apps/<app>/src/composables/` |
| Angular | Injectable service | `apps/<app>/src/app/services/` |
| Svelte | Store | `apps/<app>/src/lib/stores/` |

Each adapter:

- Imports **only** from `modules/<name>/public-api.mjs` (never deep imports).
- Calls `assertXPort(adapter)` at initialization.
- Bridges the hex port interface to the framework's reactivity system.
- Contains **zero business logic** — only framework glue.

See [Framework integration guide](framework-integration.md) for
concrete adapter examples in every framework.

**Checkpoint:** The component now calls the adapter hook/service instead
of containing its own business logic. Behavior is identical. Existing
component tests still pass.

### Phase 5 — Repeat for remaining domain concepts

Work through the extraction list from Phase 2, one module at a time.
Each extraction is an atomic slice:

1. Create hex module + domain tests.
2. Wire adapter in the app.
3. Verify existing UI tests still pass.
4. Commit.

Do not batch multiple extractions into one commit.

### Phase 6 — Add COA quality gates

Once the domain modules are extracted:

```bash
# Verify architectural boundaries
node scripts/checks/architecture-check.mjs

# Verify headers and READMEs
node scripts/checks/header-check.mjs
node scripts/checks/readme-check.mjs

# Run all tests
pnpm test
```

### Phase 7 — Optional: add BDD coverage

For user-visible flows that now cross hex module boundaries, add
Gherkin scenarios:

```gherkin
Feature: Notification display
  Scenario: User triggers a notification
    Given the app is loaded
    When the user clicks the notification trigger
    Then a toast notification appears
    And it auto-dismisses after the configured duration
```

BDD step definitions use selectors from the bounded UI registry, not
hardcoded CSS selectors.

## What NOT to do

These are the most common mistakes when migrating with AI agents:

| Mistake | Why it's wrong | What to do instead |
|---|---|---|
| Delete `apps/web/` and rewrite in vanilla JS | Destroys all UI code, tests, security | Keep the framework; extract domain only |
| Use `innerHTML` with template literals | Creates XSS vulnerabilities | Use framework's safe rendering (JSX, templates) |
| Copy business logic instead of extracting it | Creates duplication drift | Move the logic; leave an adapter call |
| Extract everything at once | Too large to verify; risky | One module per slice; commit each |
| Deep-import hex module internals | Breaks encapsulation | Import only through `public-api.mjs` |
| Rewrite existing tests | Wastes time; loses coverage | Keep existing tests; add domain unit tests |
| Skip port validators | Adapter bugs surface late | Always call `assertXPort()` at init |

## Migration checklist

Use this checklist to verify each extraction slice:

- [ ] Original framework code is preserved (not rewritten)
- [ ] Extracted domain logic has zero framework imports
- [ ] Port contract is defined with a validator
- [ ] Public API barrel exports only the needed surface
- [ ] Unit tests cover extracted domain logic
- [ ] Framework adapter imports only from `public-api.mjs`
- [ ] Existing component/integration tests still pass
- [ ] `architecture-check.mjs` passes
- [ ] Commit is atomic (one module extraction per commit)

## Diagram

```
BEFORE migration:
┌─────────────────────────────────┐
│  React/Vue/Angular/Svelte App   │
│  ┌───────────────────────────┐  │
│  │ Components with mixed     │  │
│  │ UI + business logic       │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘

AFTER migration:
┌─────────────────────────────────┐
│  Hex Modules (framework-free)   │
│  ┌─────────┐ ┌─────────┐       │
│  │ domain  │ │ ports   │       │
│  └─────────┘ └─────────┘       │
└──────────────┬──────────────────┘
               │ public-api.mjs
┌──────────────┴──────────────────┐
│  Framework Adapters (thin)      │
│  hooks / services / composables │
└──────────────┬──────────────────┘
               │
┌──────────────┴──────────────────┐
│  Original App (preserved)       │
│  Components now call adapters   │
│  instead of containing logic    │
└─────────────────────────────────┘
```

## Related guides

- [Framework integration](framework-integration.md) — adapter patterns
  for React, Vue, Angular, Svelte
- [Module detachment](module-detachment.md) — removing unused hex
  modules
- [Quick start: first module](quick-start-first-module.md) — creating a
  hex module from scratch
