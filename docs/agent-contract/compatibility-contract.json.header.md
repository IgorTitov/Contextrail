---
fileId: contextrail-template:docs:agent-contract:compatibility-contract-json-header
module: docs/agent-contract
stability: evolving
steward: shared
api: Sidecar documentation
dependsOn: docs/agent-contract/compatibility-contract.json
summary: Sidecar for the canonical machine-readable Claude↔Codex compatibility contract.
owns: The human-readable sidecar for the canonical compatibility-contract JSON file.
boundaries: This file documents the machine contract only. It must not become a second independent source of policy.
invariants: The JSON file remains the canonical machine-readable source used to render adapters and validate parity.
risks: Drift here can hide what the JSON owns or encourage edits in generated adapters instead of the canonical contract.
securityPrivacy: Documentation content only; avoid secrets or private credentials.
notesForLLM: Edit the JSON when the shared process contract changes. Then regenerate adapters instead of patching AGENTS.md or .agents/skills by hand.
tests:
  - node scripts/agent-contract/check.mjs
  - tests/contract/agent-adapter-consistency.test.mjs
linkedDocs:
  - docs/agent-contract/README.md
  - AGENTS.md
  - .claude/CLAUDE.md
related: scripts/agent-contract/README.md
---

# compatibility-contract.json
