<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Top-level map of the product, design, and engineering documentation families used by this template.
@sidecar README.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit rewrite-ok -->

# docs

- `prd/` — product requirements. PRD owns requirement intent, scope, constraints, non-functional requirements, and acceptance boundaries.
- `usm/` — persona-centered story maps and workflow scenarios. USM owns persona-centered workflows, story granularity, and scenario decomposition.
- `backlog/` — actionable work queue. Backlog owns intake, priority, ordering, and execution status.
- `design/` — design-lane artifacts. Design owns brandbook, design-system, reusable prompt templates, accepted design assets, and implementation handoff references for user-facing work.
- `product-data/` — commercial and adoption metadata. Product-data owns persona economics (segment size, LTV, CAC, subscription mix) as structured, repository-local inputs for product surfaces.
- `adr/` — durable repository decisions.
- `guides/` — step-by-step guides for platforms, getting started, AI workflow, tree-shaking, and module detachment.
- `architecture/` — hex metadata convention and report artifact shapes.
- `agent-contract/` — vendor-neutral Claude↔Codex compatibility contract and migration guidance.

Top-level documents:

- **[System Map](SYSTEM_MAP.md)** — ultra-compact entry point for AI agents (~1900 tokens full, ~950 focused, measured by `bytes ÷ 4`). Category-grouped per ADR 0011. **Load this first.**
- [Context Loading Protocol](context-loading-protocol.md) — informational reference for orchestrators: loading strategies, capability declarations, and tiered loading keyed to agent context budgets.
- [Whitepaper](whitepaper.md) — architecture philosophy, design decisions, and comparison with alternatives.
- [Technical Reference](technical-reference.md) — complete API and feature reference.
- [Module Catalog](module-catalog.md) — all 38 hex modules with APIs and usage examples.
- [FAQ](faq.md) — frequently asked questions and troubleshooting.
- [Quality Assessment](quality-assessment.md) — 10-dimension quality scoring with methodology and evidence.
- `_generated/` — machine-readable artifacts (dependency graph, spec index, integrity manifest).
- `demo/` — demo presentation scripts and assets.

Additional notes:

- Canonical personas live under `docs/usm/personas/`.
- Significant workflows should get separate USM scenario maps instead of being forced into one giant map.
- Design docs supplement PRD and USM for user-facing work; they do not replace either source-of-truth layer.
- BPMN is optional and should not be treated as a canonical layer for ordinary product work.
- The shared cross-tool process contract lives under `docs/agent-contract/` and should be updated before regenerating tool-specific adapters.


- User-facing implementation must stop until real persona/workflow USM coverage and PRD intent exist.
