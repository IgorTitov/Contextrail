---
fileId: contextrail-template:scripts:agent-contract:README
module: scripts/agent-contract
stability: evolving
steward: shared
api: Documentation
dependsOn:
  - scripts/agent-contract/sync.mjs
  - scripts/agent-contract/check.mjs
  - docs/agent-contract/compatibility-contract.json
summary: Explain the sync and parity-check scripts for the shared Claude↔Codex compatibility layer.
owns: The folder-level guide to the shared agent-contract tooling.
boundaries: This file is script navigation only. It must not become a second process contract or duplicate the JSON schema.
invariants: The documented commands and generated targets stay aligned with the real script behavior.
risks: Drift here can hide how adapters are regenerated or validated and encourage manual edits to generated files.
securityPrivacy: Local filesystem only; avoid secrets and network access.
notesForLLM: Use sync.mjs to regenerate adapters and check.mjs to prove parity. Keep this folder deterministic and local-only.
tests:
  - node scripts/agent-contract/check.mjs
  - tests/integration/agent-compatibility-coherence.test.mjs
linkedDocs:
  - scripts/README.md
  - docs/agent-contract/README.md
related:
  - AGENTS.md
  - .claude/CLAUDE.md
---

# README.md
