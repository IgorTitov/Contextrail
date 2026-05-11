---
fileId: contextrail-template:docs:adr:0006-context-optimized-architecture
module: docs/adr
stability: evolving
steward: shared
api: Documentation
summary: ADR for Context-Optimized Architecture — designing code and metadata so small LLMs (4K-8K ctx) can develop software without reading all source.
owns: Authoritative rationale for the tiered documentation model, context loading protocols, and metadata-first navigation strategy.
boundaries: Must not prescribe specific LLM models or hardware. Must not duplicate operational details from SYSTEM_MAP.md or agent definitions.
invariants: The three tiers must stay aligned with actual repository structure. Token budget estimates must be updated when header format changes.
risks: Token estimates become stale as header format evolves. Tier boundaries may need adjustment as modules grow.
securityPrivacy: No secrets.
notesForLLM: This ADR explains WHY the repository is structured for small-context agents. Refer to it when making decisions about metadata density, documentation layering, or header field additions.
linkedDocs:
  - docs/SYSTEM_MAP.md
  - docs/_generated/dependency-graph.json
  - .claude/CLAUDE.md
related:
  - docs/adr/0003-architecture-metadata-for-ai-cockpit.md
  - docs/adr/0005-js-jsdoc-over-typescript.md
---

# 0006-context-optimized-architecture.md
