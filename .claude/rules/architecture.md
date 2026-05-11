<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Capture the short repository-local architecture rules that keep bounded modules, explicit seams, and LLM-friendly structure intact.
@sidecar architecture.md.header.md
@layer control-plane | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# Architecture rules

- Prefer a modular monolith.
- Place bounded contexts under `modules/<module-name>/`.
- Cross-module imports are allowed only through `public-api.ts`.
- Domain and ports must stay framework-free. Adapters may use any UI framework (React, Vue, Svelte, Angular) — see [ADR-0012](../../docs/adr/0012-framework-adapters-in-hex-modules.md).
- The app layer (`apps/*`) orchestrates and wires module adapters. It may use any framework for routing, global state, and shell.
- A hex module's `adapters/` directory may contain React components (`.tsx`), Vue composables, Svelte stores — as long as domain/ and ports/ import nothing from the framework.
- When migrating a framework-based application into COA, extract business logic into domain/ — keep the framework in adapters/. **Deleting the existing UI framework and rebuilding in vanilla JS is explicitly prohibited.** See [docs/guides/framework-in-hex-modules.md](../../docs/guides/framework-in-hex-modules.md) and [docs/guides/brownfield-migration.md](../../docs/guides/brownfield-migration.md).
- Application orchestrates use cases.
- Ports define boundaries.
- Adapters isolate infrastructure and frameworks (including UI frameworks).
- DI wires dependencies only.
- Prefer SOLID-style responsibility boundaries and explicit seams.
- Keep files small, narrow in responsibility, low-magic, and LLM-friendly.
- Only deep-read implementation in files you are touching and their direct collaborators.
- Use headers, public APIs, tests, and nearby docs to navigate untouched areas.
- Prefer modules and seams small enough that one bounded slice can be understood without chasing the whole codebase.
- If a feature requires wide code wandering, shrink the slice or carve a better seam.
- Stable `data-testid`, reusable DOM `id`, and derived selectors should come from a bounded UI registry instead of being scattered as hardcoded literals across templates, JS, and tests. See `apps/starter/ui-selectors.mjs` for the starter example.
- Keep selector registries bounded to the relevant feature or visible slice instead of creating one giant global table.
- Do not deep-import another module internals.


## User-facing copy

All user-facing application copy should flow through a simple i18n/messages layer, even when only one locale exists today.
