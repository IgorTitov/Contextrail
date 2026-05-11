---
fileId: contextrail-template:LOCAL
module: root
stability: evolving
steward: shared
api: Local-tier repository instructions
dependsOn:
  - docs/agent-contract/compatibility-contract.json
  - AGENTS.md
  - .claude/CLAUDE.md
summary: Slim adapter for mid- and small-tier agent harnesses (16K-32K context floor).
owns: The slim local-tier adapter to the shared delivery contract.
boundaries: This file is an adapter. It must not become an independent process source that drifts from the canonical JSON contract.
invariants: Token budget under 5K tokens; omits Claude-class concepts (subagents, hooks, MCP, slash commands).
risks: Manual edits here can fork local-tier guidance away from frontier-tier adapters.
securityPrivacy: Documentation content only; avoid secrets or credentials.
notesForLLM: Read this in Aider/Cline/Continue or any harness driving a local 7B/70B model. Regenerated from the contract; do not edit by hand.
tests:
  - node scripts/agent-contract/check.mjs
linkedDocs:
  - AGENTS.md
  - .claude/CLAUDE.md
  - docs/adr/0013-module-work-surface-budget.md
related:
  - MICRO.md
  - docs/agent-contract/compatibility-contract.json
generated: true
---

# LOCAL.md
