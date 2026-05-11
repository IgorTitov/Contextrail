---
fileId: contextrail-template:scripts:agent-contract:sync
module: scripts/agent-contract
stability: evolving
steward: shared
api: "CLI: node scripts/agent-contract/sync.mjs [--check]"
dependsOn:
  - node:fs/promises
  - node:path
  - docs/agent-contract/compatibility-contract.json
  - .claude/CLAUDE.md
summary: Render Claude and Codex compatibility adapters from the canonical repo-level agent contract.
owns: Deterministic rendering of the shared Claude↔Codex adapter layer from one canonical contract.
boundaries: This script renders adapters only. It must not become a second policy source or mutate unrelated repo content.
invariants: The JSON contract stays canonical; generated adapters are overwritten deterministically; the Claude compatibility block stays delimited by explicit markers.
risks: Drift or manual edits to generated outputs can create two competing process contracts across Claude and Codex.
securityPrivacy: Local filesystem only; avoid secrets and network access.
notesForLLM: Render adapters from the JSON contract. Do not patch generated outputs by hand when the underlying process contract changes.
tests:
  - node scripts/agent-contract/check.mjs
  - tests/integration/agent-compatibility-coherence.test.mjs
  - tests/contract/agent-adapter-consistency.test.mjs
linkedDocs:
  - docs/agent-contract/README.md
  - scripts/agent-contract/README.md
related:
  - scripts/agent-contract/check.mjs
  - AGENTS.md
  - .agents/skills/README.md
---

# sync.mjs
