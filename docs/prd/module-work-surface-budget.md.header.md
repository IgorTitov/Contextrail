---
fileId: contextrail-template:docs:prd:module-work-surface-budget
module: docs/prd
stability: evolving
steward: shared
api: PRD document
dependsOn:
  - docs/adr/0013-module-work-surface-budget.md
  - docs/analysis/multi-tier-agent-universality-v0.7.17.md
summary: Requirement intent for measuring and budgeting per-module work surface against the local-LLM 16K context floor, anchoring the architectural keystone of the multi-tier-agent-universality plan.
owns: The product intent for the module-fit measurement gate, its scope and constraints (free token approximation, sub-100ms run time, deterministic file picks, warn-only initial wiring), and the explicit out-of-scope list (cleanup of currently-oversized modules, real-tokenizer dependencies, per-tier thresholds, hard-error promotion).
boundaries: This PRD owns the requirement intent. The architectural decision and its rationale live in ADR-0013. The slice acceptance lives in docs/backlog/inter-agent-coordination.md (TPL-210).
invariants: The 16K local-LLM context floor is the immovable design anchor. The token approximation must remain free (no tokenizer dependency). Pure helpers must stay exported for direct unit testing.
risks: Scope creep into per-tier thresholds or real-tokenizer dependencies would change the cost profile of the pre-commit gate and is explicitly out of scope.
notesForLLM: Read together with ADR-0013 for the threshold reasoning and the measured v0.7.17 distribution. The follow-up cleanup TPL is a separate work item and is not part of TPL-210's acceptance.
tests:
  - node scripts/checks/product-docs-check.mjs
linkedDocs:
  - docs/adr/0013-module-work-surface-budget.md
  - docs/backlog/inter-agent-coordination.md
  - docs/analysis/multi-tier-agent-universality-v0.7.17.md
specRefs: TPL-210
related:
  - docs/adr/0006-context-optimized-architecture.md
  - docs/adr/0009-sidecar-first-headers.md
---

# module-work-surface-budget.md
