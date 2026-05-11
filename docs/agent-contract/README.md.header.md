---
fileId: contextrail-template:docs:agent-contract:README
module: docs/agent-contract
stability: evolving
steward: shared
api: Folder guide
dependsOn:
  - docs/agent-contract/compatibility-contract.json
  - AGENTS.md
  - .claude/CLAUDE.md
  - .agents/skills/README.md
  - scripts/agent-contract/sync.mjs
  - scripts/agent-contract/check.mjs
summary: Describe the canonical Claude↔Codex compatibility layer, its source of truth, generated adapters, migration notes, and verification steps.
owns: The human-readable explanation of the shared agent contract and how Claude and Codex adapters relate to it.
boundaries: This file explains the compatibility layer. It must not become a second canonical machine source that drifts from the JSON contract.
invariants: The canonical machine source remains compatibility-contract.json; AGENTS.md and generated Codex skills remain adapters.
risks: If this guide drifts from the JSON or generated adapters, humans may edit the wrong layer and reintroduce two competing process contracts.
securityPrivacy: Documentation content only; avoid secrets or private credentials.
notesForLLM: Read this file when you need the architecture of the compatibility layer. Edit the JSON for shared process facts, then regenerate adapters.
tests:
  - node scripts/agent-contract/check.mjs
  - tests/integration/agent-compatibility-coherence.test.mjs
  - tests/contract/agent-adapter-consistency.test.mjs
linkedDocs:
  - docs/README.md
  - AGENTS.md
  - .claude/CLAUDE.md
related:
  - scripts/agent-contract/README.md
  - tests/contract/agent-adapter-consistency.test.mjs
---

# README.md
