<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Overview and navigation guide for the feature-seams hex module.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx feature-seams
@public false
@edit careful -->

<!--
SpecRefs: TPL-036
-->

# Feature Seams

Hexagonal module for Branch by Abstraction (BBA) and Trunk-Based Development (TBD).

## Purpose

Provides a formal, safe mechanism for introducing new behavior behind feature seams.
AI agents and developers can register a seam, test both paths, switch, and clean up — all on trunk.

## Port contract

`SeamPort` — the interface every adapter must satisfy:

| Method                   | Description                                        |
| ------------------------ | -------------------------------------------------- |
| `isEnabled(flag)`        | Returns `true` only when state is `active`         |
| `register(flag, config)` | Register a new seam with state, owner, description |
| `enable(flag)`           | Switch seam to `active`                            |
| `disable(flag)`          | Switch seam to `disabled`                          |
| `list()`                 | Return all registered seams (copies)               |
| `remove(flag)`           | Delete a seam                                      |

## Seam states

| State      | `isEnabled()` | Meaning                              |
| ---------- | ------------- | ------------------------------------ |
| `active`   | `true`        | New path is used                     |
| `shadow`   | `false`       | Both paths could run; old path wins  |
| `disabled` | `false`       | Old path is used                     |

## Adapters

- **memory** — in-memory registry, no persistence (default)
- **config** — reads initial state from a plain object (app-config, JSON file)

## Guard helpers

```javascript
import { whenEnabled, ifEnabled, createMemorySeamAdapter } from './public-api.mjs';

const seams = createMemorySeamAdapter();
seams.register('new-auth', { state: 'active', owner: 'auth-team' });

// Branch: returns result of the matching path
const result = whenEnabled(seams, 'new-auth',
  () => newAuthFlow(),
  () => legacyAuthFlow(),
);

// Conditional: runs action only if enabled
ifEnabled(seams, 'new-auth', () => {
  logNewAuthMetrics();
});
```

## Type support

Each `.mjs` file has a companion `.d.ts` sidecar providing TypeScript-compatible type definitions.
IDE autocompletion and type checking work via JSDoc `@typedef` in source and `.d.ts` for stricter tooling.

## Audit

```bash
node scripts/checks/seam-audit.mjs
```

Scans the codebase for seam registrations and guard usage. Warns about orphaned or ghost seams.

## Guides

- [Seam Creation Checklist](../../docs/guides/seam-creation-checklist.md) — decision tree, naming convention, step-by-step template
- [BBA Walkthrough](../../docs/guides/bba-walkthrough.md) — 3-commit example from seam to cleanup
- [Seam Rollback Procedure](../../docs/guides/seam-rollback-procedure.md) — emergency runbook
- [Seam Data Migration](../../docs/guides/seam-data-migration.md) — dual-read/dual-write patterns
- [Seam Deployment Integration](../../docs/guides/seam-deployment-integration.md) — health endpoint + CI contract
