---
fileId: contextrail-template:docs:guides:parallel-work-quickstart
module: docs/guides
stability: evolving
steward: shared
api: Documentation
summary: One-pager quickstart for running multiple agents in parallel on the same repository.
owns: Simplified parallel-work onboarding covering BBA-first, claims, and scope assignment.
boundaries: Quick reference only. Full protocol detail lives in inter-agent-coordination.md and ADR-0008.
invariants: Must stay consistent with claim-check.mjs CLI flags and .claims/ schema.
risks: Stale CLI examples if claim-check flags are renamed.
securityPrivacy: No secrets.
notesForLLM: This is the entry point for parallel-work questions. Link to inter-agent-coordination.md for depth.
related:
  - docs/guides/inter-agent-coordination.md
  - .claims/README.md
  - docs/adr/0008-inter-agent-coordination-protocol.md
---

# parallel-work-quickstart.md
