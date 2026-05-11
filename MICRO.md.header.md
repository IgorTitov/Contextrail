---
fileId: contextrail-template:MICRO
module: root
stability: evolving
steward: shared
api: Local-tier helper instructions
dependsOn:
  - docs/agent-contract/compatibility-contract.json
  - LOCAL.md
summary: Ultra-slim adapter for narrow deterministic-helper tasks (<2K token budget).
owns: The ultra-slim helper adapter for header-fix / README-sync / commit-message bots.
boundaries: This adapter is for deterministic transformations only — never a slice owner. Behavior decisions escalate to LOCAL.md or AGENTS.md.
invariants: Token budget under 2K tokens; covers commit shape, header sidecar, CHANGELOG entry, and stop conditions only.
risks: If this drifts above 2K tokens it loses its niche and operators will reach for LOCAL.md anyway.
securityPrivacy: Documentation content only; avoid secrets or credentials.
notesForLLM: Use as the system prompt for a narrow helper agent. Defer to operator on any behavior change.
tests:
  - node scripts/agent-contract/check.mjs
linkedDocs:
  - LOCAL.md
  - AGENTS.md
related:
  - LOCAL.md
  - docs/agent-contract/compatibility-contract.json
generated: true
---

# MICRO.md
