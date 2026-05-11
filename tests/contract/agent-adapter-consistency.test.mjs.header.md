---
fileId: contextrail-template:tests:contract:agent-adapter-consistency
module: tests/contract
stability: evolving
steward: shared
api: node:test spec
dependsOn:
  - node:test
  - node:assert/strict
  - node:fs
  - package.json
  - docs/agent-contract/compatibility-contract.json
  - AGENTS.md
  - .claude/CLAUDE.md
  - .agents/skills/README.md
summary: Prove that the canonical agent contract, AGENTS adapter, Codex skills, and the Claude adapter stay aligned.
owns: Contract proof that the shared compatibility layer keeps Claude and Codex adapters aligned to one source of truth.
boundaries: This file is a deterministic contract spec only. It must not turn into a general integration suite.
invariants: Assertions stay local-only and compare stable repository surfaces that many tools consume.
risks: Weak coverage here lets generated adapters and the canonical contract drift without a high-signal failure.
securityPrivacy: Local test code only; avoid secrets and network access.
notesForLLM: Prefer high-signal agreement checks over large parsing logic. This test should fail when canonical adapter facts drift.
tests: pnpm test:contract
linkedDocs:
  - tests/contract/README.md
  - docs/agent-contract/README.md
related:
  - scripts/agent-contract/check.mjs
  - scripts/agent-contract/sync.mjs
---

# agent-adapter-consistency.test.mjs
