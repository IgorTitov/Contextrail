---
fileId: contextrail-template:docs:adr:0013-module-work-surface-budget
module: docs/adr
stability: evolving
steward: shared
api: ADR document
dependsOn:
  - docs/adr/0006-context-optimized-architecture.md
  - docs/adr/0007-tiered-file-size-limits.md
  - docs/adr/0009-sidecar-first-headers.md
  - docs/prd/module-work-surface-budget.md
  - docs/analysis/multi-tier-agent-universality-v0.7.17.md
summary: Record the decision to budget each hex module's work-surface tokens against the local-LLM 16K context floor, with measured warn/error thresholds (8K/12K) anchored to the v0.7.17 distribution.
owns: The architecture rule that every hex module's "work surface" (manifest + public-api + sidecars + one representative impl + one representative test) must stay under the documented per-module token budget so a 16K-context local-tier agent can hold the module in one window.
boundaries: This ADR owns the rule, the threshold reasoning, and the cleanup strategy. It does not own the script implementation (PRD + backlog), per-tier thresholds (deferred), or the cleanup of currently-oversized modules (separate follow-up TPL).
invariants: The 16K local-LLM context floor is the immovable anchor. Token approximation is Math.ceil(bytes/4). Warn threshold (8K) is data-derived from p75+buffer and 16K headroom arithmetic, not a round number picked blindly. Error threshold (12K) is reserved for a follow-up cleanup TPL; pre-commit gate ships in `--warn-only` mode. No waiver process exists — oversized modules must be decomposed.
risks: Drift here could allow future contributors to bump thresholds without re-measuring the distribution, weakening the empirical anchor. Could also allow introduction of a waiver process that defeats the local-tier support claim.
securityPrivacy: Documentation content only.
notesForLLM: This ADR is the architectural keystone of the multi-tier-agent-universality plan (v0.7.17). It is in Accepted status as of TPL-210 (this slice). The follow-up cleanup TPL must reduce the six over-warn modules (realtime, retrieval, analytics, feature-seams, auth, cache) before promoting the gate from `--warn-only` to enforcing mode. The data shows test files dominate the bloat — direct cleanup at the BDD-modularity layer per .claude/rules/testing.md.
tests:
  - node scripts/checks/module-fit-check.mjs
  - node scripts/checks/product-docs-check.mjs
linkedDocs:
  - docs/prd/module-work-surface-budget.md
  - docs/backlog/inter-agent-coordination.md
  - docs/analysis/multi-tier-agent-universality-v0.7.17.md
  - scripts/checks/module-fit-check.mjs
specRefs: TPL-210
related:
  - docs/adr/0006-context-optimized-architecture.md
  - docs/adr/0007-tiered-file-size-limits.md
  - docs/adr/0009-sidecar-first-headers.md
---

# 0013-module-work-surface-budget.md
