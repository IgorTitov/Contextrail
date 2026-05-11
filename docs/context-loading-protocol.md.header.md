---
fileId: contextrail-template:docs:context-loading-protocol
module: docs
stability: evolving
steward: shared
api: Documentation
dependsOn:
  - docs/SYSTEM_MAP.md
  - docs/_generated/dependency-graph.json
  - docs/adr/0006-context-optimized-architecture.md
  - docs/whitepaper.md
  - docs/analysis/context-window-threshold-analysis-v0.5.2.md
summary: Informational reference for orchestrator authors — how agents load metadata within context budgets, with four preset loading strategies keyed to effective context window size.
owns: Loading strategy presets (minimal-8k, tiered-16k, comfortable-32k, unlimited), agent capability declaration format, tiered loading model, orchestrator integration patterns.
boundaries: Must not duplicate ADR 0006 rationale or SYSTEM_MAP.md content. Points to both instead. Informational only — no normative gates or CI checks.
invariants: Token estimates must reflect current whitepaper §6.4 budget table. Loading strategy table must match analysis §6.2 presets.
risks: Stale if whitepaper token budgets change or new loading strategies are added without updating this doc.
securityPrivacy: No secrets.
notesForLLM: This is the informational reference for how orchestrators should route tasks based on agent context budgets. If you are building multi-agent tooling on COA, start here. Not a mandatory gate — agents at 16K+ can navigate adaptively without this protocol.
linkedDocs:
  - docs/SYSTEM_MAP.md
  - docs/adr/0006-context-optimized-architecture.md
  - docs/_generated/dependency-graph.json
  - docs/whitepaper.md
  - .claude/CLAUDE.md
related:
  - docs/analysis/context-window-threshold-analysis-v0.5.2.md
---

# context-loading-protocol.md
