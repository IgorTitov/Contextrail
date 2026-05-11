<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Guide operators through safely removing unused hex modules from the template using scripts/detach-module.mjs, covering prerequisite checks, CLI flags, dependency order, and manual follow-up steps.
@sidecar module-detachment.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Module Detachment Guide

This guide explains how to safely remove hex modules from the template that your application does not need.

## Why detach modules?

The template ships with 38 hex modules covering common application concerns. Most projects need only a subset. Detaching unused modules:

- Reduces the codebase surface area
- Eliminates unused code from the import graph
- Simplifies maintenance and onboarding

## Prerequisites

Each module has a `manifest.json` at its root declaring:

| Field | Purpose |
|-------|---------|
| `name` | Module directory name |
| `description` | Human-readable summary |
| `exports` | Public API files (always `public-api.mjs`) |
| `dependencies.modules` | Other hex modules this one imports |
| `dependencies.external` | npm packages (most modules have none) |
| `dependencies.builtins` | Node.js built-in modules used |
| `testFiles` | Associated test files (relative to repo root) |

## Using the detach script

### List all modules

```bash
node scripts/detach-module.mjs --list
```

Shows every module with its dependencies and dependents. Modules marked "leaf (safe to remove)" have no dependents and can be detached without affecting other modules.

### Dry-run removal

```bash
node scripts/detach-module.mjs <module-name> --dry-run
```

Shows what files would be removed without actually deleting anything. Always start here.

### Detach a module

```bash
node scripts/detach-module.mjs <module-name>
```

Removes the module directory and its associated test files.

### Force removal with dependents

```bash
node scripts/detach-module.mjs <module-name> --force
```

Proceeds even if other modules depend on this one. You will need to update or remove the dependent modules manually.

## Dependency graph

Current cross-module dependencies (all others are standalone):

```
local-llm → ai-chat → api-client
auth → api-client
state → user-preferences
```

### Safe removal order

To remove a dependency chain, start from the leaves:

1. `local-llm` (depends on ai-chat)
2. `ai-chat` (depends on api-client)
3. `api-client` (standalone after removing ai-chat and auth)

Standalone modules (no dependents, safe to remove anytime):
- `example-greeter`
- `knowledge-graph`
- `retrieval`
- `notifications`
- `event-bus`
- `feature-seams`

## Manual follow-up after detachment

The script handles file removal but cannot update:

1. **App shell imports** — remove any `import` of the detached module from `apps/starter/app.mjs` or other wiring files.
2. **HTML references** — remove any `<script>` or `<link>` tags referencing the module's UI.
3. **Backlog docs** — the script warns about `docs/backlog/` references. Update or remove those entries.
4. **Cross-module types** — if another module had a JSDoc `@typedef` import from the removed module, update it.

After cleanup, run the test suite to catch any remaining broken imports:

```bash
pnpm test
```

## Recovery

If detachment breaks something:

1. **Git restore** — `git checkout -- modules/<name>/ tests/` restores the removed files.
2. **Selective restore** — restore only the module directory if tests were not yet affected.
3. **Re-run tests** — verify the restored state works before continuing.

## Common patterns

### Removing the example module

The `example-greeter` module exists purely as a reference. Remove it first:

```bash
node scripts/detach-module.mjs example-greeter
```

### Removing AI features

If your app does not need AI/LLM capabilities:

```bash
node scripts/detach-module.mjs local-llm
node scripts/detach-module.mjs ai-chat
node scripts/detach-module.mjs knowledge-graph
node scripts/detach-module.mjs retrieval
```

### Keeping only core infrastructure

For a minimal template with just state management and preferences:

```bash
node scripts/detach-module.mjs local-llm
node scripts/detach-module.mjs ai-chat
node scripts/detach-module.mjs auth
node scripts/detach-module.mjs api-client
node scripts/detach-module.mjs knowledge-graph
node scripts/detach-module.mjs retrieval
node scripts/detach-module.mjs example-greeter
```

This leaves: `event-bus`, `state`, `user-preferences`, `notifications`, `feature-seams`.
