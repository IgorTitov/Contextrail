---
fileId: contextrail-template:scripts:agent-contract:check
module: scripts/agent-contract
stability: evolving
steward: shared
api: "CLI: node scripts/agent-contract/check.mjs [--json]"
dependsOn:
  - node:fs/promises
  - node:path
  - package.json
  - .githooks/pre-commit
  - docs/agent-contract/compatibility-contract.json
  - scripts/agent-contract/sync.mjs
summary: Verify that Claude and Codex adapters remain aligned with the canonical repo-level compatibility contract.
owns: Deterministic parity checks for the shared Claude↔Codex adapter layer.
boundaries: This script validates alignment only. It must not become a second policy source or mutate repo state.
invariants: Generated outputs stay rendered from the canonical contract; required hook and package wiring stay present; the shared skill roster exists on both Claude and Codex surfaces.
risks: Weak coverage here can let AGENTS.md, generated skills, and the Claude adapter drift apart silently.
securityPrivacy: Local filesystem only; avoid secrets and network access.
notesForLLM: Run this after sync or in CI. Keep it explicit and deterministic so failures point at concrete drift sources.
tests:
  - tests/integration/agent-compatibility-coherence.test.mjs
  - tests/contract/agent-adapter-consistency.test.mjs
linkedDocs:
  - docs/agent-contract/README.md
  - scripts/agent-contract/README.md
related:
  - scripts/agent-contract/sync.mjs
  - AGENTS.md
  - .claude/CLAUDE.md
---

# check.mjs
