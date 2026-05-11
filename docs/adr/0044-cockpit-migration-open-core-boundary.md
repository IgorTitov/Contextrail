<!-- @HEADER
@version 0.8.0 | 2026-05-07
@purpose Document 0044-cockpit-migration-open-core-boundary for this repository.
@sidecar 0044-cockpit-migration-open-core-boundary.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# ADR-0044 — Cockpit migration M1: open-core boundary between Contextrail and Cockpit (TPL-318)

**Status:** Accepted
**Date:** 2026-05-07
**Deciders:** Igor Titov
**Refs:** TPL-318, TPL-306 (extracted dispatch wrapper), TPL-313 (extracted fence-strip wrapper),
ADR-0008 (`docs/adr/0008-inter-agent-coordination-protocol.md` — claim-check coordination, engine-side, stays),
ADR-0041 (`docs/adr/0041-test-deletion-guard.md` — R9, engine-side, stays),
ADR-0042 (`docs/adr/0042-sidecar-referents-check.md` — R10, engine-side, stays),
ADR-0043 (`docs/adr/0043-claim-check-frozen-paths.md` — R11, engine-side, stays),
`docs/analysis/byollm-delivery-plan.md` Entry 14 (strategic discussion — gitignored aggregator working file)

## Context

Contextrail's BYO-LLM ladder (TPL-288 → TPL-317) accumulated operator-facing
dispatch tooling and stack-discipline operational details inside the
template:

- `scripts/dispatch-local-llm.mjs` (TPL-306) — wrapper that combined the
  slice-aware briefer with an Aider invocation, exposing
  `pnpm byollm:dispatch`.
- `scripts/aider-fence-strip-wrapper.mjs` (TPL-313 / partial) — wrapper
  that post-processed Variant 3 (Qwen3-Coder MoE) code-file outputs to
  strip the trailing markdown fence (F15 mitigation), exposed as
  `pnpm byollm:dispatch:coder`.
- `docs/guides/local-frameworks.md` operational subsections — F13 prompt
  prefix verbatim for Variant B, fence-strip wrapper instructions for
  Variant 3.

Strategic review (Entry 14 of the local-LLM aggregator's delivery plan)
classified this functionality as **product-UX territory, not engine
territory**. The engine layer (R-rules, gates, ceremony, briefer,
contracts) defends ANY agent class — frontier or local. The dispatch
layer is operator-UX: which stack to route a slice to, how to inject the
F13 prefix, how to wire the fence-strip post-processor. That UX is
exactly what Cockpit (a separate application built on Contextrail)
exists to provide.

The boundary needed to be drawn explicitly so that:

- Contextrail attracts a developer community on the engine value
  proposition without dragging operator-UX scaffolding through public
  audits.
- Cockpit can monetize the operator-UX layer without overlap or
  duplicate authority.

## Decision

Extract the operator-UX layer (L4 in the 5-layer stack defined in Entry
14.1: dispatch wrappers, stack-discipline auto-application) from
Contextrail. Reserve Contextrail for the engine/language layer (L1: rules,
ceremony, briefer, contracts, gates). Cockpit (L5) takes ownership of L4.

### What stays in Contextrail (engine)

- All R-rules and pre-commit gates (R1 test-isolation through R11
  frozen-paths).
- `scripts/agent-context.mjs` briefer — every harness consumes it; this
  is language, not UX.
- `coa-merge`, `coa-worktree`, `claim-check` — ceremony primitives.
- `LOCAL.md`, `MICRO.md`, `AGENTS.md`, `.cursorrules` — agent contract
  adapters generated from `docs/agent-contract/compatibility-contract.json`.
- `docs/guides/byollm-feature-dispatch.md` — manual-workflow guide for
  non-Cockpit operators. F13 prompt prefix verbatim and Variant 3
  fence-strip discipline live here verbatim.
- `docs/guides/local-frameworks.md` — install, model picks, setup
  gotchas, stack-safety classification reference table. Operational
  discipline subsections moved out (now in the dispatch guide).

### What moves to Cockpit (product)

- `scripts/dispatch-local-llm.mjs` (TPL-306) — replaced by Cockpit's
  Kanban "Dispatch" UI (slices C1-C5 in Cockpit codebase).
- `scripts/aider-fence-strip-wrapper.mjs` (TPL-313 partial) — replaced
  by Cockpit's per-stack auto post-processing (slice C3).
- `pnpm byollm:dispatch` and `pnpm byollm:dispatch:coder` package script
  entries — replaced by Cockpit UI.
- F13 prompt-prefix injection — automatic in Cockpit per stack-config.
- `--edit-format` selection per stack — automatic in Cockpit per
  stack-config.

### Versioning

This commit bumps Contextrail from 0.7.124 to **0.8.0** — a deliberate
minor bump signaling the major reorganization rather than a routine
patch. Pre-1.0.0 minor bumps are acceptable per semver. The 1.0.0
release is reserved for after the Publication Readiness Audit Driver
track lands (Entry 14.6).

### Migration impact (breaking)

Removing `pnpm byollm:dispatch` and `pnpm byollm:dispatch:coder` is a
**breaking change** for any user who had scripted against those entries.
Pre-1.0.0 we accept the breakage; downstream users (Zvenix, Cockpit-in-
development, future MedOps) update their automation. Non-Cockpit
operators following the manual workflow have always invoked
`agent-context.mjs` + `aider` directly — the documented workflow in
`byollm-feature-dispatch.md` is unchanged.

## Rationale

- **Cleaner template surface area** — the public-release audit
  (Publication Readiness Audit Driver track) sees only language/engine
  artifacts. Operator-UX scaffolding is no longer in scope of the
  template's public face.
- **Cockpit value-add** — the operator-UX layer is precisely what
  Cockpit charges for. Leaving it in the open template diluted the value
  proposition without serving non-Cockpit users any better than the
  manual workflow already does.
- **Recursive dogfooding** — Cockpit is itself a COA-app developed using
  Contextrail. Extracting L4 into Cockpit demonstrates the
  methodology: Cockpit slices C1-C5 will be planned, sliced, and
  delivered through Contextrail's own ceremony.

## Consequences

- The four-stack safety classification table in
  `docs/guides/local-frameworks.md` continues to inform any Contextrail
  user (Cockpit or not) which stacks are recommendable. The mandatory
  disciplines are still flagged in the table; how to apply them is
  documented in `byollm-feature-dispatch.md` for manual operators.
- A user who relied on `pnpm byollm:dispatch:coder` discovers the
  removal at next `pnpm` invocation; the CHANGELOG `## [0.8.0]` Removed
  block names the replacement explicitly.
- Future BYO-LLM-class concerns raised by public usage land in
  Contextrail at the engine layer (a new R-rule, a new gate) and in
  Cockpit at the UX layer (a new stack-config, a new dispatch button)
  with the boundary already established.
- One-time navigation index at
  `docs/archive/cockpit-migration-index-v0.8.0.md` records the
  pre-migration state and forward pointers, so anyone reading commit
  history at v0.8.0 has a discoverable explanation of where the moved
  artifacts went.

## Related

- ADR-0008 — claim-check coordination protocol (engine, stays in
  Contextrail).
- ADR-0041 — R9 test-deletion-guard (engine, stays).
- ADR-0042 — R10 sidecar-referents-check (engine, stays).
- ADR-0043 — R11 claim-check frozen paths (engine, stays).
- `docs/analysis/byollm-delivery-plan.md` Entry 14 — strategic
  discussion underpinning the boundary decision (gitignored aggregator
  working file).
- `docs/archive/cockpit-migration-index-v0.8.0.md` — navigational index
  for the migrated artifacts.
- Cockpit codebase — slices C1-C5 reimplement the migrated functionality
  as product UI (separate codebase, out of scope for this slice).
