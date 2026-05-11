---
fileId: contextrail-template:docs:adr:0007-tiered-file-size-limits
module: docs/adr
stability: stable
stabilityRationale: Accepted ADR; the per-layer thresholds it sanctions are wired into architecture-check.mjs and shape every file-size decision. Changing this ADR requires re-deciding the tiered limits, not editing the doc.
steward: shared
api: Documentation
dependsOn: docs/adr/0006-context-optimized-architecture.md
summary: ADR for tiered file-size soft limits — adapters get 400 lines, everything else stays at 180.
owns: Authoritative rationale for per-layer file-size thresholds in architecture-check.
boundaries: This ADR governs soft limits only. It does not mandate splitting files or override module-level architecture decisions.
invariants: The thresholds in this ADR must stay in sync with scripts/checks/architecture-check.mjs constants.
risks: Adapters could grow beyond 400 lines without review if the soft limit is taken as permission rather than a ceiling.
securityPrivacy: No secrets.
notesForLLM: This ADR explains why adapters have a higher file-size limit than domain code. Reference it when an adapter exceeds 180 lines — check whether it exceeds 400 before flagging.
linkedDocs:
  - docs/adr/0006-context-optimized-architecture.md
  - scripts/checks/architecture-check.mjs
---

# 0007-tiered-file-size-limits.md
