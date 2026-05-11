---
fileId: contextrail-template:AGENTS
module: root
stability: evolving
steward: shared
api: Codex repository instructions
dependsOn:
  - docs/agent-contract/compatibility-contract.json
  - docs/agent-contract/README.md
  - .agents/skills/README.md
  - .claude/CLAUDE.md
summary: Codex adapter for the shared repo-level delivery contract and skill map.
owns: The Codex-facing adapter to the shared Claude↔Codex delivery contract.
boundaries: This file is an adapter. It must not become an independent process source that drifts from the canonical JSON contract.
invariants: The shared process rules, command map, role names, and skill roster stay aligned with the canonical contract.
risks: Manual edits here can fork Codex behavior away from Claude and reintroduce duplicate process authority.
securityPrivacy: Documentation content only; avoid secrets or credentials.
notesForLLM: Read this file first in Codex. It is generated from the canonical compatibility contract and should be regenerated, not hand-edited.
tests:
  - node scripts/agent-contract/check.mjs
  - tests/integration/agent-compatibility-coherence.test.mjs
  - tests/contract/agent-adapter-consistency.test.mjs
linkedDocs:
  - docs/agent-contract/README.md
  - .claude/CLAUDE.md
related:
  - .agents/README.md
  - .agents/skills/README.md
generated: true
---

# AGENTS.md
