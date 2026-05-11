<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Record the decision that hex module adapters may use UI frameworks (React, Vue, Svelte, Angular) while domain and port layers remain framework-free.
@sidecar 0012-framework-adapters-in-hex-modules.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# ADR 0012 — Framework Adapters in Hex Modules

**Status:** Accepted
**Date:** 2026-04-16
**Context:** Real-world projects (AI Cockpit, MedOps, Zvenix) adopted COA
but encountered confusion about whether hex modules can contain React/Vue/Angular code.

---

## Context

The COA methodology requires hexagonal architecture: domain stays pure,
ports define contracts, adapters isolate infrastructure. The Contextrail
template ships 38 modules — all in vanilla JS — which creates a false
impression that hex modules must be framework-free at every layer.

Real projects overwhelmingly use UI frameworks. When adopters see a
hex-only-vanilla-JS template, they face a perceived choice:

1. Rewrite everything in vanilla JS (impractical, anti-pattern per CLAUDE.md)
2. Put all React code in `apps/` (domain logic leaks into the app layer)
3. Ignore hex and keep framework-coupled feature folders (loses COA benefits)

None of these are correct. The correct answer is option 4: **framework
code lives in the adapter layer of hex modules**.

## Decision

**Domain and port layers are framework-free.** They contain pure
business logic and contracts with zero framework imports.

**Adapter layers may use any UI framework.** A hex module's `adapters/`
directory may contain React components, Vue composables, Svelte stores,
Angular services — as long as they implement the module's port contract
and don't leak into domain.

**The app layer (`apps/*`) orchestrates and wires adapters**, but does
not own business logic.

### What this means concretely

```
modules/kanban/
  domain/
    board-logic.mjs          ← pure JS: column rules, WIP limits, card ordering
    types.d.ts               ← TypeScript types (optional)
  ports/
    board-port.mjs           ← contract: what the adapter must provide
  adapters/
    react-board-view.tsx     ← React component implementing the port
    react-board-hooks.ts     ← React hooks wrapping domain logic
    memory-board-adapter.mjs ← framework-free adapter for tests
  public-api.mjs             ← exports domain + all adapters
  manifest.json
```

### Layer dependency rules

```
domain/  → imports nothing (pure)
ports/   → imports domain types only
adapters/
  react-*.tsx  → imports domain/, ports/, React
  memory-*.mjs → imports domain/, ports/ (no framework)
apps/    → imports modules/*/public-api.mjs only
```

### What this does NOT allow

- **Domain importing React** (or any framework)
- **Port contracts depending on React types** (e.g., `JSX.Element` in a port)
- **Cross-module React imports** (module A's adapter importing module B's adapter directly)
- **App layer containing business logic** that should be in domain

## Consequences

### Positive

- **Real-world adoption path is clear.** React projects can adopt COA
  by moving business logic to domain/ and keeping React in adapters/.
- **Testing is simpler.** Domain tested with vanilla unit tests. React
  adapters tested with React Testing Library. Both through the same port.
- **Framework migration is safe.** Swapping React for Vue means replacing
  adapter files only — domain and ports don't change.
- **COA benefits preserved.** Context efficiency, parallel safety, and
  hex boundaries all work identically with framework adapters.

### Negative

- **Module size may increase.** A module with both `memory-adapter.mjs`
  and `react-view.tsx` has more files than a vanilla-only module.
- **Build tooling required.** React/TSX adapters need Vite, webpack, or
  similar. This is an app-layer concern — the build tool lives in `apps/`,
  not in the module.
- **File-size limits apply.** ADR-0007 limits still hold: 180 lines for
  domain, 400 for adapters. React components that exceed this should be
  split into sub-components within `adapters/`.

## Relationship to ADR-0005 (JS + JSDoc over TypeScript)

ADR-0005 says the template uses plain JS + JSDoc. This decision is
**complementary, not contradictory**: the template demonstrates hex
in vanilla JS, but real projects may use TypeScript in their adapter
layer (especially React + TSX). The constraint is:

- **Domain files:** `.mjs` with JSDoc (or `.ts` per ADR-0005 migration path)
- **Adapter files:** `.mjs`, `.tsx`, `.ts`, `.vue`, `.svelte` — whatever
  the framework needs
- **Port files:** `.mjs` with JSDoc (contracts are framework-free)

## Prior art

This aligns with the existing rules that were already written but
insufficiently emphasized:

- `.claude/rules/architecture.md`: "The app layer may use any UI framework."
- `.claude/CLAUDE.md`: "Deleting the existing UI framework and rebuilding
  in vanilla JS is explicitly prohibited."
- `docs/guides/brownfield-migration.md`: "Extract business logic into
  hex modules — never rewrite the UI framework layer."
