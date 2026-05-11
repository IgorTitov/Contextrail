<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Document ADR 0010 — module manifests must carry generator-owned capability blocks sourced from JSDoc @typedef or sibling types.d.ts so tier-2 navigation surfaces domain capability without opening port files.
@sidecar 0010-manifest-capabilities.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# ADR 0010 — Manifest capabilities

## Status

Accepted

## Context

ADR-0006 established COA — the three-tier navigation surface for agents: SYSTEM_MAP (tier 1), manifest + public-api + README (tier 2), and module-catalog (tier 3). The tier-2 promise is that an agent can answer "does module X support capability Y" without opening implementation files.

The Mode B audit (`docs/analysis/mode-b-review.md`, 2026-04-07) measured real token cost for three agent navigation tasks and found that promise is partially broken. Finding F3 (major):

- Tier 2 currently surfaces **file topology** — which files exist, what they export at the public-API shell level, and where adapters live.
- Tier 2 does **not** surface **domain capability** — method-level shapes, option types, return types, or the list of supporting adapters for a given port.
- For the question "does the cache port already support TTL?", an agent still has to spend ~565 extra tokens opening `modules/cache/ports/cache-port.mjs` because none of the tier-2 files expose method signatures.
- The same gap breaks "what adapters does module X have" and "what options does method Y accept".

The empirical coverage scorecard (`docs/analysis/port-jsdoc-coverage.md`, 2026-04-08) establishes:

- 31 ports across 24 modules.
- 27 ports have a valid capability source: 20 use inline JSDoc `@typedef`, 7 retrieval ports use `modules/retrieval/types.d.ts`.
- 2 ports are PARTIAL (typedefs reference shapes in sibling domain files).
- 2 ports are MISSING (no typedef at all — shapes only exist in adapters).

Two capability-source patterns are load-bearing in the repo today and neither should be forced to migrate:

1. **Inline JSDoc `@typedef`** in the port file itself.
2. **Sibling `types.d.ts`** with TypeScript `interface` declarations (retrieval is the canonical example — one shared file for every port in the module).

## Decision

Adopt **manifest capabilities**: every module manifest carries a generator-owned `capabilities` block that describes the domain capability of each port in that module.

### Rules

1. Every `modules/<name>/ports/*.mjs` port file must expose capability data via **inline JSDoc `@typedef`** OR the module must provide a **sibling `modules/<name>/types.d.ts`** that describes the port using TypeScript `interface` declarations. A port with neither source is a hard failure.
2. Each `modules/<name>/manifest.json` must carry a top-level `capabilities: {...}` block generated from those sources, keyed by port name, containing at minimum: method names, parameter names and types, return types, supporting option/result typedefs, and the list of adapters found under `modules/<name>/adapters/`.
3. `capabilities` blocks are **generator-owned**. They are written by `scripts/checks/capabilities-sync.mjs` and must not be hand-edited. Hand edits are overwritten on the next sync.
4. The generator has a `--check` mode that exits non-zero on drift between the port source and the manifest. `--check` is wired into the pre-commit hook and CI quality-gates as a **hard fail**. No soft-warn mode exists.
5. Retrieval's `types.d.ts` form is a first-class capability source equal to inline JSDoc and is not required to migrate.
6. The generator uses only Node.js built-ins (same constraint as `scripts/checks/spec-sync.mjs` and `scripts/checks/import-graph.mjs`).
7. The generator is pure extraction: it reads source files and writes manifests. It does not execute port code, require any module, or perform network I/O.

### Hard fail from day one

No grandfathering. The rule is enforced from the first commit that introduces `capabilities-sync.mjs --check` into the gate chain. Any PARTIAL or MISSING ports must be resolved before that commit lands.

### Domain shape resolution

When a port's JSDoc `@typedef` references a shape defined in another file (the PARTIAL pattern observed in `modules/notifications/` and `modules/user-preferences/`), the generator MUST resolve the reference by following `import` declarations **within the module's own boundary** (`modules/<name>/`).

Inlining domain shapes into the port file is **rejected**. Reasons:

- Domain owns its shapes. Copying them into the port layer pushes domain types into the port (architectural smell).
- A copy creates silent drift against the source, and no existing gate watches that specific copy.
- The "one-file-one-read" argument disappears once capabilities are generated, because agents read the manifest, not the port.

The generator follows imports only within `modules/<name>/`. **Cross-module typedef references are forbidden** by hex rules and the generator MUST error out if a port references a shape from another module. Parser cost is paid once; architectural correctness is permanent.

### Port-types convention (TS interface subset)

The custom `types.d.ts` parser at `scripts/checks/lib/types-d-parser.mjs` supports a narrow, bounded TypeScript subset. Port authors MUST stay within this subset; anything outside it requires escalation and a re-evaluation of the parser dependency choice.

**Supported features:**

- `export interface Name { ... }` declarations
- Method signatures with named parameters and a return type annotation
- Optional fields with `?`
- Reference types defined in the same file or imported from the same module
- Built-in generics: `Promise<T>`, `Record<K, V>`, `Array<T>` / `T[]`, union `T | U`
- Primitive types and `unknown` / `void` / `never`
- Cross-references between interfaces in the same file

**NOT supported (escalation required):**

- Interface generics (`interface Foo<T> { ... }`)
- Conditional types, mapped types
- Namespaces
- `extends` clauses on interfaces
- Function-type aliases (`type Handler = (x: string) => void`)
- Decorators

**Escalation rule.** If a port file legitimately needs a feature outside this subset, the implementer escalates instead of expanding the parser silently. Escalation triggers a fresh dep-choice review with real data (do we still avoid pulling `typescript` or `@babel/parser`?), not estimates. The expected outcome for the F3 epic is **no escalation** — `modules/retrieval/types.d.ts` was reviewed and stays inside the subset.

**Why a custom parser.** Pulling in `typescript` (60+ MB) or `@babel/parser` for one pre-commit script contradicts the lean-tooling positioning of contextrail-template. Pre-commit startup time matters because the hook runs on every commit. The grammar stays narrow because this ADR controls it.

### Parser extensions added during implementation

The following idiomatic JSDoc forms were already used by domain and port files in the repo and were folded into the parser during TPL-183 and TPL-184. Each extension is locked by a parser-level test in `tests/unit/jsdoc-typedef-parser.test.mjs` and does not widen the supported grammar beyond forms that already shipped in the repo.

Added in TPL-183 (PARTIAL ports — `notifications`, `user-preferences`):

1. **Inline-record typedefs** — `@typedef {{ field: Type, other?: Other }} Name`. Used by domain shape files such as `modules/notifications/domain/notification.mjs`. The form is idiomatic JSDoc and is the natural way to declare a record without a separate `@property` block.
2. **Alias typedefs over union literals** — `@typedef {'a' | 'b' | 'c'} Name`. Used to declare bounded enums (e.g. `NotificationLevel`). Surfaced in the manifest as a single `alias` field on the supporting typedef so the literal union text survives.

Added in TPL-184 (full-repo run):

1. **Capital-O `@typedef {Object} Name`** is accepted alongside the previously-supported lowercase `@typedef {object} Name`. Both forms are idiomatic JSDoc and appear interchangeably across the repo.
2. **Rest parameters** — `...args: any[]` in arrow signatures. Threaded as a `rest: true` flag through `parseParam` and downstream record builders so the manifest captures variadic methods faithfully.
3. **Multiple object-form typedefs in a single JSDoc block.** The original parser assumed one typedef header per block; modules like `log`, `db`, and `task` declare several typedefs together. The block routing pass now buckets `@property` lines onto the correct preceding header.
4. **Multi-line inline-record typedefs.** Records spanning several lines (`@typedef {{\n  id: string,\n  ...\n}} TourStep`) are coalesced by a `joinTagContinuations` preprocessor that uses curly-brace-only depth counting (so `=>` arrows in method signatures do not confuse the join).

**Cross-module `@typedef {import('../../other/...').X} Name` re-export aliases are skipped by the generator.** This is a deliberate design rule, not an oversight. The capability surface is module-local: cross-module re-exports are JSDoc-consumer hints for IDE tooling, not contract data, and surfacing them would leak relative file paths into the manifest. Port authors who need to reference a type from another module must use the bare type name in their method signatures and rely on the manifest of the owning module for the full shape. Same-module `import('relative/path').TypeName` references *are* resolved by the import-following resolver added in TPL-183 (see "Domain shape resolution" above).

### Wiring

The `--check` mode is read-only by design and lands in pre-commit Phase 6 (parallel read-only validation), NOT Phase 5 (fix/sync). The four wiring targets are anchored by file and line so the implementation cannot drift:

1. **`.githooks/pre-commit:51-56`** — add `"node scripts/checks/capabilities-sync.mjs --check"` to the existing Phase 6 `run_parallel` block, alongside `architecture-check`, `delivery-flow-check`, `control-plane-check`, `agent-contract/check`, `changeset-size-check`.
2. **`.github/workflows/ci.yml:93`** — add `- run: node scripts/checks/capabilities-sync.mjs --check` right after the existing `pnpm header-check` step in the `quality-gates` job.
3. **`scripts/checks/control-plane-check.mjs:122-133`** — add `'capabilities-check'` to the `required-scripts` list so the control-plane gate validates that the new gate stays wired.
4. **`package.json`** — add a `capabilities-check` npm script alias for `node scripts/checks/capabilities-sync.mjs --check`, mirroring `architecture-check`, `header-check`, `readme-check`.

No `--fix` mode is in scope for this epic. Manifest regeneration happens by running `node scripts/checks/capabilities-sync.mjs` (no `--check`) explicitly when a port changes, and the developer commits the resulting manifest delta.

## Consequences

### Positive

- Tier-2 navigation finally answers capability-class questions without opening port files, closing F3 from the Mode B audit.
- Agents can scan `manifest.json` to discover method signatures, option types, and adapter inventories in one read.
- The two valid source forms both continue to work, so retrieval is not forced into churn.
- Drift is impossible because the pre-commit hook and CI both hard-fail on it.
- The rule makes the unwritten expectation of "ports document themselves" into an enforced invariant.

### Negative

- Every port must now carry a valid capability source. Four ports (2 PARTIAL + 2 MISSING) need backfill before this ADR can land in enforced form.
- OSS launch is delayed to absorb the backfill and any bugs the first full-repo generator run surfaces.
- A second metadata artifact (capabilities block) is now tracked alongside the existing manifest fields, slightly increasing manifest size.
- The generator is new surface area that must stay in sync with evolving port syntax.

### Out of scope for this ADR

- **`failureModes` (Mode B finding F5)** is explicitly **not** part of this ADR. F5 needs its own design pass after capabilities ship, because the shape of failure-mode metadata depends on what the first full-repo capabilities run teaches us.
- Generating capability data from adapters instead of ports. Adapters may diverge; the port remains the source of truth.
- Publishing capability data outside the manifest (no JSON schema export, no separate capabilities sidecar).
- Human-authored capabilities blocks.

## Related

- ADR-0003 — Architecture metadata for AI cockpit
- ADR-0006 — Context-optimized architecture
- ADR-0009 — Sidecar-first headers
- `docs/prd/manifest-capabilities.md` — PRD for TPL-178
- `docs/backlog/manifest-capabilities.md` — slice chain for TPL-178
- `docs/analysis/mode-b-review.md` — empirical audit that surfaced F3
- `docs/analysis/port-jsdoc-coverage.md` — coverage scorecard for the 31 ports
