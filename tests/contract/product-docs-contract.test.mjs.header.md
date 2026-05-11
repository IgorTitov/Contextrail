---
fileId: contextrail-template:tests:contract:product-docs-contract
module: tests/contract
stability: evolving
steward: shared
api: node:test spec
dependsOn:
  - node:test
  - node:assert/strict
  - node:fs
  - package.json
  - .claude/CLAUDE.md
  - .claude/agents/README.md
  - .claude/skills/README.md
  - docs/README.md
  - docs/prd/index.md
  - docs/usm/index.md
  - docs/usm/personas/README.md
  - docs/usm/scenarios/README.md
  - docs/backlog/index.md
summary: Prove that the PRD-USM-backlog planning layer keeps its canonical routing, persona storage, and intake-first source-of-truth split.
owns: Contract proof that the planning layer keeps canonical routing and source-of-truth boundaries stable.
boundaries: This file is a deterministic contract spec only. It must not turn into a general integration suite.
invariants: Assertions stay local-only and compare stable repository surfaces that many agents and docs consume.
risks: Weak coverage here lets product-intake and source-of-truth drift silently across the repo.
securityPrivacy: Local test code only; avoid secrets and network access.
notesForLLM: Prefer high-signal agreement checks over large parsing logic. This test should fail when canonical planning rules drift.
tests: pnpm test:contract
linkedDocs:
  - tests/contract/README.md
  - .claude/skills/prd-usm-backlog/SKILL.md
related:
  - scripts/checks/product-docs-check.mjs
  - docs/prd/index.md
  - docs/usm/index.md
  - docs/backlog/index.md
specRefs:
  - TPL-004
  - TPL-005
  - TPL-006
  - TPL-007
  - TPL-008
  - TPL-009
  - TPL-010
  - TPL-011
  - TPL-012
  - TPL-013
  - TPL-022
  - TPL-036
  - TPL-043
  - TPL-054
  - TPL-062
  - TPL-071
  - TPL-079
  - TPL-086
  - TPL-093
  - TPL-096
  - TPL-097
  - TPL-129
  - TPL-136
---

# product-docs-contract.test.mjs
