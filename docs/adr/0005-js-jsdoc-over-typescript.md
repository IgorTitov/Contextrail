<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Record the accepted architectural decision to use plain ES module JavaScript with JSDoc annotations and .d.ts sidecars instead of TypeScript across all template hex modules.
@sidecar 0005-js-jsdoc-over-typescript.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# ADR 0005 — JS + JSDoc + .d.ts Over TypeScript

## Status

Accepted

## Context

The template needs a language strategy that satisfies multiple constraints:

- **Zero build step**: the starter app runs directly from source via `<script type="module">` and `file://` protocol.
- **Type safety**: module boundaries must be explicitly typed for IDE autocompletion and consumer guidance.
- **LLM-friendliness**: AI coding assistants read and write source files directly. Fewer transformation layers mean fewer misunderstandings.
- **Portability**: the template targets PWA, Electron, browser extensions, and Capacitor. Each platform has different bundler expectations.
- **Low barrier**: contributors and consumers should not need a toolchain to understand or modify the code.

TypeScript is the industry standard for typed JavaScript, but it requires a compile step that conflicts with the template's zero-build-step philosophy. The template is a delivery-pattern reference, not a production application — it demonstrates how to structure code, not how to ship optimized bundles.

## Decision

Use **plain ES module JavaScript (.mjs)** with **JSDoc type annotations** and **companion .d.ts sidecar files** for all module code.

### The pattern

- `.mjs` files contain runtime code with JSDoc `@typedef` imports from `.d.ts` sidecars.
- `.d.ts` files define interfaces, factory signatures, and port contracts.
- `public-api.mjs` + `public-api.d.ts` form the typed module boundary.
- No `tsc`, no `tsconfig.json`, no build step required.

## Arguments for

1. **Zero build step** — source files are the deployed files. `<script type="module" src="app.mjs">` works directly in browsers and via `file://`.

2. **Native ESM** — no module resolution surprises. Import specifiers are real file paths, not synthetic module names resolved by a bundler.

3. **Runtime-inspectable source** — what runs is what you read. No source-map indirection, no generated output drift.

4. **LLM-friendliness** — AI assistants read `.mjs` files directly and can modify them without understanding a build pipeline. JSDoc types are inline and visible in context. `.d.ts` sidecars provide IDE support without polluting runtime files with verbose generics.

5. **IDE support** — VS Code and JetBrains IDEs provide full autocompletion, hover types, and go-to-definition for JSDoc + `.d.ts` without any additional tooling.

6. **Gradual adoption** — consumers who want TypeScript can rename `.mjs` to `.ts`, remove JSDoc annotations, and the `.d.ts` files become the natural type definitions. The migration path is incremental.

## Arguments against

1. **No compile-time type checking** — errors that `tsc --strict` would catch at build time can reach runtime. Mitigated by port assertion functions that validate adapter conformance at runtime.

2. **JSDoc verbosity for complex generics** — JSDoc syntax for generics, conditional types, and mapped types is more verbose than TypeScript's native syntax. Mitigated by keeping most complex types in `.d.ts` sidecars and referencing them via `@typedef {import(...)}`.

3. **TypeScript ecosystem advantages** — many libraries ship TypeScript-first. Template consumers using TypeScript will have a slightly smoother experience with native `.ts` files. Mitigated by providing `.d.ts` sidecars that TypeScript consumers import seamlessly.

4. **Dual maintenance cost** — runtime JSDoc annotations and `.d.ts` sidecars can drift apart. Mitigated by keeping `.d.ts` as the single type authority and using `@typedef` imports rather than duplicating type definitions in JSDoc.

## Current state

The template uses this pattern across all 38 hex modules:

| Layer | File | Purpose |
|-------|------|---------|
| Types | `types.d.ts` | All shared interfaces and type definitions |
| Port | `ports/*.mjs` + `ports/*.d.ts` | Runtime assertion + type sidecar |
| Domain | `domain/*.mjs` + `domain/*.d.ts` | Pure logic + type sidecar |
| Adapter | `adapters/*.mjs` | Infrastructure implementations |
| Public API | `public-api.mjs` + `public-api.d.ts` | Barrel export + type sidecar |

Every module follows this structure. The `.d.ts` sidecar is the canonical type authority. Runtime code imports types via JSDoc `@typedef {import('../types.d.ts').InterfaceName}`.

## Migration path for TypeScript consumers

Consumers who prefer TypeScript can migrate incrementally:

1. Add `tsconfig.json` with `"allowJs": true, "checkJs": true` to get type checking on existing `.mjs` files immediately.
2. Rename `.mjs` to `.ts` one module at a time, converting JSDoc annotations to native TypeScript syntax.
3. The existing `.d.ts` files become standard TypeScript declaration files — no changes needed.
4. Remove JSDoc `@typedef` imports as they're replaced by native TypeScript imports.
5. Add a build step (`tsc` or bundler) when ready.

This migration can happen per-module, preserving the hex boundary at each step.

## Consequences

### Positive

- Template runs everywhere without tooling
- Contributors need only a text editor and a browser
- AI assistants can read, modify, and test code without build-step awareness
- Type safety exists at module boundaries via `.d.ts` + port assertions
- Migration to TypeScript is incremental and non-breaking

### Negative

- Ongoing dual maintenance of JSDoc annotations and `.d.ts` sidecars
- Complex generic types require verbose JSDoc syntax or delegation to `.d.ts`
- Some TypeScript-first libraries may need `@ts-ignore` in JSDoc mode
- No compile-time exhaustiveness checking for switch/union patterns
