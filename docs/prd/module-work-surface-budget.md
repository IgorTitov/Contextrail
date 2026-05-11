<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Requirement intent for measuring and budgeting per-module work surface against the local-LLM 16K context floor.
@sidecar module-work-surface-budget.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Module work-surface budget — PRD

## Intent

Make Contextrail's "16K-context local-LLM support" claim measurably true by budgeting each hex module's work-surface tokens against a deterministic per-module ceiling, so a small-tier agent (e.g. Qwen-2.5-Coder-7B in Aider+LM Studio) can hold the module it is editing in one context window after harness overhead and conversation buffer are subtracted.

## Outcome

A pre-commit gate, a measurement script, and an ADR that together:

1. Define the **work surface** of a module deterministically: `manifest + public-api + sidecars + one representative impl + one representative test`.
2. Measure it across all `modules/<name>/` and report distribution statistics (`p50`, `p75`, `p95`, `max`).
3. Apply two thresholds anchored to the 16K floor: **warn at 8K tokens** (the natural ceiling of well-shaped modules), **error at 12K tokens** (the headroom limit; reserved for a follow-up cleanup TPL).
4. Wire the check into pre-commit Phase 6 in **warn-only** mode initially, so existing oversized modules surface as warnings without blocking unrelated commits.
5. Provide a `pnpm modules:fit-report` command that writes a structured report for longitudinal tracking.

## Constraints

- Token approximation must be free (no real tokenizer dependency). `Math.ceil(bytes / 4)` is the established repository convention (see `docs/SYSTEM_MAP.md`).
- The check must run in <100ms across the full module set so it stays in pre-commit Phase 6 without latency cost.
- Pure helpers (`approximateTokenCount`, `pickRepresentativeImpl`, `pickRepresentativeTest`, `measureWorkSurface`, `computeDistribution`) must be exported for direct unit-test coverage; the script must not require a temporary repo to test its logic.
- Missing surface files (no public-api, no test, etc.) must not throw — minimal modules are intentional.
- File picks must be deterministic across runs.
- The hard-error mode must not be enabled until oversized modules are addressed by a follow-up TPL.

## Scope

- **In scope:** the script (`scripts/checks/module-fit-check.mjs`), its unit tests, ADR-0013, the warn-only pre-commit wiring, the `pnpm modules:fit-report` script alias, the backlog entry.
- **Out of scope:** the cleanup of currently-oversized modules (separate follow-up TPL), real-tokenizer dependencies, per-tier thresholds, integrity-manifest tracking of the report file, promotion of the gate from warn to error.

## Decision reference

See [ADR 0013](../adr/0013-module-work-surface-budget.md) for the rationale, the measured distribution at v0.7.17, the threshold reasoning, and the cleanup strategy.

Background analysis: `docs/analysis/multi-tier-agent-universality-v0.7.17.md` (Section 4 "Constraints", Section 6 TPL-210 — gitignored, on-disk).

Backlog: `docs/backlog/inter-agent-coordination.md` — TPL-210.
