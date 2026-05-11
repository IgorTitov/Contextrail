---
fileId: contextrail-template:agents:README
module: .agents
stability: evolving
steward: shared
api: Folder guide
dependsOn:
  - AGENTS.md
  - .agents/skills/README.md
  - docs/agent-contract/compatibility-contract.json
summary: Folder guide for the Codex-facing agent adapter layer.
owns: The folder-level map for generated Codex adapter assets.
boundaries: This file is navigational only. It must not grow into a second process contract.
invariants: The listed files stay aligned with the generated Codex adapter layer.
risks: If this guide drifts, Codex users may edit generated files directly or miss the canonical source of truth.
securityPrivacy: Documentation content only; avoid secrets or credentials.
notesForLLM: Treat this folder as generated Codex-facing adapter surface. Update the canonical contract and rerun sync instead of editing generated skill files by hand.
tests:
  - node scripts/agent-contract/check.mjs
  - tests/integration/agent-compatibility-coherence.test.mjs
linkedDocs:
  - AGENTS.md
  - docs/agent-contract/README.md
related:
  - .agents/skills/README.md
generated: true
---

# README.md
