<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Landing page for shared pure-function helper libraries used by scripts/checks/*.mjs control-plane scripts.
@sidecar README.md.header.md
@layer tooling | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# scripts/checks/lib

Pure-function helper libraries shared by deterministic control-plane scripts under `scripts/checks/`.

Every file in this folder must be:

- **pure** — no file I/O, no network, no `process.exit`, no module `require()`, no code execution
- **deterministic** — same input always produces the same output
- **zero-dependency** — Node.js built-ins only (see ADR-0010)
- **unit-tested** under `tests/unit/<name>.test.mjs`

## Current libraries

- **`jsdoc-typedef-parser.mjs`** — extracts JSDoc `@typedef` blocks (port method signatures, parameter shapes, supporting record typedefs) from inline port source. Consumed by `capabilities-sync.mjs`. Introduced in TPL-179.
- **`types-d-parser.mjs`** — extracts TypeScript `interface` declarations from sibling `types.d.ts` files within the bounded subset enumerated in ADR-0010. Output shape is byte-parallel to `jsdoc-typedef-parser.mjs` so downstream consumers are source-agnostic. Introduced in TPL-180.

## Design rules

1. **Interchangeable output shapes.** When a new parser is added for another capability source, its output must match the existing `{ typedefs: Record<string, { kind: 'interface' | 'record', methods?, fields? }> }` shape so `capabilities-sync.mjs` does not need a branching pipeline.
2. **Bounded grammar.** Parser subsets are governed by ADR-0010. Widening a subset requires an ADR review, not an inline patch. Unsupported syntax must throw a line-numbered `Error`, never silently degrade.
3. **Test-first.** Every supported feature has a positive unit case; every rejected feature has a negative unit case that asserts the feature name and line number appear in the error message.

## Related

- `docs/adr/0010-manifest-capabilities.md` — capability source conventions
- `scripts/checks/capabilities-sync.mjs` — the generator that consumes these parsers
- `tests/unit/jsdoc-typedef-parser.test.mjs`, `tests/unit/types-d-parser.test.mjs`
