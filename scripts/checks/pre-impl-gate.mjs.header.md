---
fileId: contextrail-template:scripts:checks:pre-impl-gate
module: scripts/checks
stability: evolving
steward: shared
api: "CLI: node scripts/checks/pre-impl-gate.mjs [--json]"
dependsOn:
  - node:fs/promises
  - node:path
  - scripts/checks/_shared.mjs
  - package.json
  - docs/backlog/index.md
  - docs/prd/index.md
  - docs/usm/index.md
summary: Block implementation-oriented changes when the changed files are not linked to ready work items with the required PRD and USM coverage.
owns: The deterministic stop gate that prevents implementation work from proceeding without ready planning coverage.
boundaries: This file validates changed implementation-oriented files only. It must not become a generic semantic planner or mutate repo state.
invariants: Changed implementation/proof files must carry SpecRefs; referenced work items must be ready; user-facing items must have PRD and USM coverage.
risks: Weak checks here allow agents to skip product planning and still appear compliant.
securityPrivacy: Local filesystem and git status only; avoid network access.
notesForLLM: Fail on missing traceability, not on style. The goal is to stop implementation without a ready linked slice while tolerating clean bootstrap states.
tests:
  - pnpm test:integration
  - pnpm test:contract
linkedDocs:
  - .claude/CLAUDE.md
  - AGENTS.md
  - docs/backlog/index.md
  - docs/prd/index.md
  - docs/usm/index.md
related:
  - scripts/checks/usm-check.mjs
  - scripts/checks/spec-check.mjs
  - scripts/checks/product-docs-check.mjs
---

# pre-impl-gate.mjs
