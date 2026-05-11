<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Record the decision to apply different file-size soft limits per hex layer, with adapters allowed a higher threshold than domain, ports, and application code.
@sidecar 0007-tiered-file-size-limits.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# ADR 0007 — Tiered file-size soft limits

## Status

Accepted

## Context

COA (ADR-0006) recommends keeping files small enough that a 4K–8K context agent can load them alongside headers and tests. The architecture-check script enforced a single 180-line soft limit for all module source files.

In practice, 18 of 60 adapter files exceed 180 lines. The top offenders are dom-adapter (452), web-worker-adapter (383), blob-adapter (323). These adapters are not poorly structured — they wrap inherently verbose external APIs (DOM, Web Workers, Fetch/XHR, FileReader) while implementing a single port contract. Their internal functions share closure state that cannot be cleanly split across files without introducing artificial coordination overhead.

Domain, application, and port files remain small because they contain pure logic with narrow responsibilities. Adapters are structurally different: their size reflects the surface area of the external API they wrap, not a violation of single responsibility.

## Decision

Apply tiered file-size soft limits based on hex layer:

| Layer | Soft limit | Rationale |
|-------|-----------|-----------|
| domain | 180 lines | Pure logic, must be small and testable |
| application | 180 lines | Orchestration, must stay thin |
| ports | 180 lines | Contracts, inherently small |
| adapters | 400 lines | Wraps external APIs, inherently larger |
| di | 180 lines | Wiring, must stay thin |
| other | 180 lines | Default |

When an adapter approaches 400 lines, first check whether it contains extractable pure logic (CSS generation, data transformation, serialization) that belongs in `domain/`. Extract what is clean, but do not force-split an adapter into multiple files just to hit a number — fragmented adapters that share closure state are harder to understand, not easier.

## Consequences

- architecture-check now uses `LINE_LIMIT_DEFAULT = 180` and `LINE_LIMIT_ADAPTER = 400`.
- The 18 previously-warning adapter files now pass cleanly (all are under 400 lines).
- Extractable pure logic (e.g., `onboarding/domain/tour-styles.mjs`) moves to domain where it naturally belongs, reducing adapter size as a side effect.
- The template no longer contradicts its own rules, making it a more credible reference architecture.
- The `--strict-size` flag still promotes warnings to errors for both thresholds.

## Alternatives considered

1. **Single 180-line limit for all layers.** Rejected: forces artificial file splits in adapters, creating coordination overhead without improving readability.
2. **No limit for adapters.** Rejected: adapters should still have a ceiling — a 600-line adapter likely has extractable logic or mixed responsibilities.
3. **Extract all pure logic from every thick adapter.** Partially adopted: extract what is naturally pure, but don't create 15-line files for trivial helpers.
