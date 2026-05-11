---
fileId: contextrail-template:tests:contract:ui-selector-registry
module: tests/contract
stability: evolving
steward: shared
api: node:test spec
dependsOn:
  - node:test
  - node:assert/strict
  - node:fs
  - .claude/CLAUDE.md
  - .claude/rules/architecture.md
  - .claude/rules/development.md
  - .claude/agents/frontend-specialist.md
  - .claude/skills/frontend-delivery/SKILL.md
  - docs/design/design-system.md
summary: Prove that the bounded selector-registry rule and i18n copy rule stay explicit across the canonical architecture, development, frontend, and design-system surfaces.
owns: Contract proof that the selector-registry rule and the user-facing i18n/messages-layer rule remain explicit across the canonical surfaces that user-visible work depends on.
boundaries: This file is a deterministic contract spec only. It must not turn into a general integration suite.
invariants: Assertions stay local-only and compare stable repository surfaces that many agents and docs consume.
risks: Weak coverage here lets scattered hardcoded selector literals creep back into the repo as an invisible convention drift.
securityPrivacy: Local test code only; avoid secrets and network access.
notesForLLM: Prefer high-signal agreement checks over large parsing logic. This test should fail when the selector-registry convention drifts out of the canonical surfaces.
tests: pnpm test:contract
linkedDocs:
  - tests/contract/README.md
  - docs/design/design-system.md
  - .claude/skills/frontend-delivery/SKILL.md
related:
  - scripts/checks/design-docs-check.mjs
  - .claude/agents/frontend-specialist.md
  - docs/design/design-system.md
  - .claude/CLAUDE.md
---

# ui-selector-registry-contract.test.mjs
