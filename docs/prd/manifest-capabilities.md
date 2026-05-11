<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Define the umbrella PRD for surfacing port capability data in module manifests via a generator that reads JSDoc typedefs and sibling types.d.ts files, closing Mode B audit finding F3.
@sidecar manifest-capabilities.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Manifest Capabilities (F3)

## Requirement intent

The Mode B agent-navigation audit (`docs/analysis/mode-b-review.md`, 2026-04-07) measured real token cost for three capability-class navigation tasks against the advertised three-tier surface (SYSTEM_MAP → manifest + public-api + README → module-catalog). Finding F3 (major) is that tier 2 surfaces **file topology** but not **domain capability**. For the question "does the cache port already support TTL?" the agent must still spend ~565 extra tokens opening the port file because neither `manifest.json`, `public-api.mjs`, nor `README.md` surfaces method-level capabilities. The same gap applies to "what adapters does module X have" and "what options does method Y accept".

This epic closes F3 by generating a structured `capabilities: {...}` block into every `modules/<name>/manifest.json`, sourced from existing JSDoc `@typedef` definitions or sibling `modules/<name>/types.d.ts` files, and wiring a deterministic `--check` mode into the pre-commit hook and CI quality-gates as a hard fail.

The epic also backfills the small set of ports whose capability source is currently partial or missing, so the generator can enforce full coverage from day one.

This epic delivers:

- A generator script `scripts/checks/capabilities-sync.mjs` that reads every `modules/*/ports/*.mjs` plus any sibling `modules/*/types.d.ts`, extracts structured capability data, and writes it into `modules/*/manifest.json` under a new top-level `capabilities` key.
- A `--check` mode on the generator that exits non-zero on drift (mirrors `scripts/checks/spec-sync.mjs --check` and `scripts/checks/dependency-graph.mjs --check`).
- Backfilled typedefs for two MISSING ports (`modules/knowledge-graph/ports/entity-extractor-port.mjs`, `modules/knowledge-graph/ports/graph-store-port.mjs`) recovered from existing adapters under `modules/knowledge-graph/adapters/`.
- Resolved capability sources for two PARTIAL ports (`modules/notifications/ports/notification-port.mjs`, `modules/user-preferences/ports/storage-port.mjs`).
- Generated `capabilities` blocks across all 31 ports in 24 modules.
- Pre-commit and CI hard-fail wiring so a manifest missing capabilities or out of sync with its port source cannot land on trunk.
- An ADR (`docs/adr/0010-manifest-capabilities.md`) recording the new architecture rule that every port must expose capability data via JSDoc `@typedef` or sibling `types.d.ts`.
- SYSTEM_MAP, README, and ADR updates advertising the new tier-2 capability surface.

## Classification

This is **technical/architectural** work. It adds navigation metadata used by agents, not user-facing application behavior. USM is intentionally skipped: the only "persona" here is "any agent doing capability-class navigation", which is already covered by the COA principal-user framing in ADR-0006. The change does not introduce a new user workflow in any hosted application.

## Variant 2 decision (hard fail from day one)

The project chose **variant 2** of F3: hard fail from day one, no grandfathering, no soft warn. The OSS launch is delayed to absorb the backfill and any bugs the first full-repo run surfaces. This PRD records that decision and the scope that follows from it:

- The generator enforces coverage across every port in the repo, not a curated subset.
- The pre-commit hook and CI quality-gate exit non-zero on drift, from the first commit that introduces the generator.
- No "soft warn" mode is shipped. A warning mode would silently accept drift and defeat the tier-2 navigation guarantee this epic exists to establish.

## Out of scope (F5 deferred)

`failureModes` (Mode B finding F5) is **not** part of this epic. F5 needs its own design pass after F3 ships, because the shape of failure-mode metadata depends on what we learn from running F3 across all 31 ports. Do not fold F5 work into any slice below.

Also out of scope:

- Changing port semantics or public API shape.
- Rewriting retrieval's `types.d.ts` into inline JSDoc. The TypeScript interface form is load-bearing for retrieval and stays as a first-class capability source.
- Generating capability data from adapters instead of ports (adapters may diverge; the port is the source of truth).
- Human-authored `capabilities` blocks. The block is generator-owned; hand-edits are overwritten on the next sync.
- Full module-catalog regeneration. The existing `module-catalog.md` flow is untouched.
- Publishing capability data outside the manifest (no JSON schema export, no separate `capabilities.json` sidecar).

## Cross-cutting constraints

- **Zero external dependencies.** The generator uses only Node.js built-ins, matching `scripts/checks/spec-sync.mjs` and `scripts/checks/import-graph.mjs`.
- **Two valid sources.** The generator must accept both inline JSDoc `@typedef` and sibling `modules/<name>/types.d.ts` as capability source. Forcing retrieval to migrate is explicit non-goal.
- **Deterministic output.** Same inputs produce byte-identical manifest output so `--check` drift detection is reliable.
- **Idempotent.** Running the generator twice in a row produces no diff on the second run.
- **Pure extraction.** The generator reads port files and writes manifests. It does not execute port code, require any module, or reach out to the network.
- **No hand-editing invariant.** `capabilities` blocks are generator-owned. The ADR documents this so future contributors do not try to maintain them manually.

## Empirical basis

Coverage scorecard: `docs/analysis/port-jsdoc-coverage.md` (2026-04-08).

- **31 ports** across **24 modules**.
- **27 READY**: 20 use inline JSDoc `@typedef`; 7 retrieval ports use `modules/retrieval/types.d.ts`.
- **2 PARTIAL**: `modules/notifications/ports/notification-port.mjs`, `modules/user-preferences/ports/storage-port.mjs` — typedefs reference shapes living in sibling domain files.
- **2 MISSING**: `modules/knowledge-graph/ports/entity-extractor-port.mjs`, `modules/knowledge-graph/ports/graph-store-port.mjs` — no typedef at all. Method shapes must be recovered from existing adapters.

Audit context: `docs/analysis/mode-b-review.md` (2026-04-07), finding F3 (major).

## Deliverables in scope

### 1. Generator skeleton + JSDoc parser pilot (TPL-179)

Create `scripts/checks/capabilities-sync.mjs` with zero external dependencies. Implement a JSDoc `@typedef` parser sufficient to extract a structured capability shape from one pilot module. **Pilot module: cache** (cleanest READY example). Extracted shape per port:

```
{
  portName: "CachePort",
  methods: [
    { name, params: [{ name, type }], returns: "<type>", optionsType?: "<type>" }
  ],
  supportingTypes: [ { name, properties: [{ name, type }] } ],
  adapters: ["memory-cache-adapter", "..."]
}
```

Write the result into `modules/cache/manifest.json` under top-level `capabilities`. Add a contract test proving round-trip: parse cache port → serialize → compare to committed manifest.

### 2. Extend parser to types.d.ts source (TPL-180)

Extend the generator to parse TypeScript `interface` declarations from `modules/<name>/types.d.ts`. Validate against the retrieval module (7 ports, single shared types file). The extracted shape must match the JSDoc-sourced shape exactly — downstream consumers cannot tell which source was used.

**Decision: custom parser, ~300 lines, no runtime dependencies.** Pulling in `typescript` (60+ MB) or `@babel/parser` for one pre-commit script contradicts the lean-tooling positioning of contextrail-template. Pre-commit startup time matters because it runs on every commit. The TS subset we actually need is narrow because we control it via ADR-0010's port-types convention. The parser MUST live at `scripts/checks/lib/types-d-parser.mjs` and have unit tests at `tests/unit/types-d-parser.test.mjs` that lock down each supported feature with at least one positive and one negative case. The supported subset is enumerated in ADR-0010's "Port-types convention" section.

Implementer is allowed to **escalate** if `modules/retrieval/types.d.ts` actually uses TS features outside the documented subset. Escalation triggers a re-evaluation of the dep choice with real data, not estimates. Expected outcome: no escalation — the file stays inside the subset.

### 3. Backfill knowledge-graph entity-extractor-port typedef (TPL-181)

Add a JSDoc `@typedef EntityExtractorPort` block to `modules/knowledge-graph/ports/entity-extractor-port.mjs`. Recover method signatures from existing adapters under `modules/knowledge-graph/adapters/` that currently implement the port. Start with a failing regression test that runs the generator against knowledge-graph and asserts a non-empty capabilities block is emitted for entity-extractor-port.

### 4. Backfill knowledge-graph graph-store-port typedef (TPL-182)

Same approach as TPL-181, applied to `modules/knowledge-graph/ports/graph-store-port.mjs`. Start with a failing regression test asserting the generator emits a non-empty capabilities block for graph-store-port.

### 5. Resolve PARTIAL ports (TPL-183)

For `modules/notifications/ports/notification-port.mjs` and `modules/user-preferences/ports/storage-port.mjs`: **the generator MUST resolve typedef references by following `import` declarations within the module's own boundary** (`modules/<name>/`). Inlining domain shapes into the port's JSDoc is rejected on architectural grounds — domain owns its shapes, and copying them into the port layer would push domain types into the port (architectural smell) and create silent drift against the source with no gate watching it. The "one-file-one-read" argument disappears once capabilities are generated, because agents read the manifest, not the port.

The generator follows imports only **within `modules/<name>/`**. Cross-module typedef references are forbidden by hex rules and the generator MUST error out if a port references a shape from another module. Parser cost is paid once in S5; the architectural correctness is permanent.

### 6. Full-repo generator run + commit (TPL-184)

Run `node scripts/checks/capabilities-sync.mjs` across all 31 ports. Commit the generated manifest diffs. Fix any surprises that surface (unexpected syntax, missing adapters list, edge cases in parameter parsing). This is the first commit where every manifest in the repo carries a `capabilities` block.

### 7. Wire --check into pre-commit + CI (TPL-185)

The generator is **read-only by design**. It belongs in Phase 6 of the pre-commit hook (parallel read-only validation), NOT Phase 5 (fix/sync). Phase 5 is reserved for tools that modify files; `--check` only reads JSDoc/types.d.ts + manifest.json and exits non-zero on drift. No `--fix` mode is in scope for this epic — manifest regeneration happens by running `node scripts/checks/capabilities-sync.mjs` (no `--check`) explicitly when a port changes, and the developer commits the resulting manifest.json delta.

Concrete wiring targets (named with line anchors so the implementer cannot drift):

- **`.githooks/pre-commit:51-56`** — add `"node scripts/checks/capabilities-sync.mjs --check"` to the existing Phase 6 `run_parallel` block, alongside `architecture-check`, `delivery-flow-check`, `control-plane-check`, `agent-contract/check`, `changeset-size-check`.
- **`.github/workflows/ci.yml:93`** — add a new `- run: node scripts/checks/capabilities-sync.mjs --check` step right after the existing `pnpm header-check` step in the `quality-gates` job.
- **`scripts/checks/control-plane-check.mjs:122-133`** — add `'capabilities-check'` to the `required-scripts` list so the control-plane gate validates that the new gate stays wired.
- **`package.json`** — add a `capabilities-check` npm script alias for `node scripts/checks/capabilities-sync.mjs --check`, mirroring the pattern of `architecture-check`, `header-check`, `readme-check`.

Both pre-commit and CI must exit non-zero on drift. No soft-warn mode. Update documentation of the pre-commit chain to mention `capabilities-check`.

### 8. Advertise the new tier-2 surface (TPL-186)

Update:

- `docs/SYSTEM_MAP.md` — mention that manifests now carry capabilities.
- `modules/README.md` (or the module-catalog explanation doc) — document the new `capabilities` key.
- `docs/adr/0010-manifest-capabilities.md` — the architecture rule stating every port must expose capability data via JSDoc `@typedef` or sibling `types.d.ts`.
- Close the F3 entry in `docs/analysis/mode-b-review.md` with a pointer to this PRD.

## Acceptance boundaries

- Generator script exists at `scripts/checks/capabilities-sync.mjs` and uses only Node.js built-ins.
- Generator reads inline JSDoc `@typedef` blocks from `modules/*/ports/*.mjs`.
- Generator reads TypeScript `interface` declarations from `modules/*/types.d.ts` when present.
- Generator writes a top-level `capabilities` block into `modules/*/manifest.json`.
- Extracted capability shape is identical regardless of source (JSDoc vs types.d.ts).
- Generator lists adapters for each port by scanning `modules/<name>/adapters/`.
- Generator is deterministic and idempotent (second run produces no diff).
- Generator has a `--check` mode that exits non-zero on drift.
- All 31 ports across 24 modules have a non-empty `capabilities` block in their manifest.
- Knowledge-graph entity-extractor-port and graph-store-port have JSDoc typedefs recovered from adapters.
- Notifications and user-preferences partial ports are resolved (shapes inline or generator follows imports).
- Retrieval module continues to use `modules/retrieval/types.d.ts` without migration.
- Pre-commit hook exits non-zero when a manifest is out of sync with its port source.
- CI quality-gates workflow exits non-zero when a manifest is out of sync.
- No soft-warn mode exists.
- ADR-0010 exists documenting the new architecture rule.
- SYSTEM_MAP and relevant README files mention the tier-2 capability surface.
- F5 (`failureModes`) is not introduced in this epic.

```trace-yaml
work_item:
  id: TPL-178
  type: technical_story
  title: Manifest Capabilities (F3) — generator-owned capability blocks in module manifests
  parent_ref:
  status: done
  module_ref: control-plane
  spec_refs:
    - docs/prd/manifest-capabilities.md
    - docs/prd/index.md
    - docs/analysis/mode-b-review.md
    - docs/analysis/port-jsdoc-coverage.md
  test_refs:
    - tests/contract/product-docs-contract.test.mjs
    - tests/unit/capabilities-sync.test.mjs
  bdd_refs:
  acceptance:
    - Generator script at scripts/checks/capabilities-sync.mjs reads JSDoc @typedef and types.d.ts and writes capabilities blocks into module manifests.
    - Generator --check mode exits non-zero on drift and is wired into pre-commit and CI as a hard fail.
    - All 31 ports across 24 modules have non-empty capabilities blocks.
    - Knowledge-graph MISSING ports have recovered typedefs; notifications and user-preferences PARTIAL ports are resolved.
    - Retrieval module continues to use types.d.ts without migration.
    - ADR-0010 documents the new architecture rule that every port must expose capability data via JSDoc @typedef or sibling types.d.ts.
    - failureModes (F5) is explicitly out of scope.
```
