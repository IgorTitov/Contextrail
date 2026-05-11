---
fileId: contextrail-template:tests:contract:header-sidecar-contract-test
module: tests/contract
stability: evolving
steward: shared
api: node:test spec
dependsOn:
  - node:test
  - node:assert/strict
  - node:fs
  - package.json.header.md
  - .claude/settings.json.header.md
  - .vscode/tasks.json.header.md
  - scripts/checks/_shared.mjs
summary: Prove the stable repository contracts around sidecar naming and FileId namespace usage.
owns: Contract proof for stable sidecar and FileId namespace conventions.
boundaries: This file is a contract spec only. Keep it deterministic and focused on durable conventions.
invariants: Assertions remain local-only and validate conventions other tooling depends on.
risks: If this spec becomes weak, stale namespace or sidecar drift can break tooling silently.
securityPrivacy: Local test code only; avoid secrets and network access.
notesForLLM: Prefer assertions that prove durable conventions, not workflow details.
tests: pnpm test:contract
linkedDocs:
  - tests/contract/README.md
  - .claude/CLAUDE.md
related:
  - scripts/checks/_shared.mjs
  - scripts/checks/header-check.mjs
---

# header-sidecar-contract.test.mjs
