---
fileId: contextrail-template:tests:integration:repo-workflow-test
module: tests/integration
stability: evolving
steward: shared
api: node:test spec
dependsOn:
  - node:test
  - node:assert/strict
  - node:fs
  - package.json
  - .vscode/tasks.json
  - .claude/settings.json
  - .claude/skills/bdd-playwright/scripts/run-playwright-check.mjs
summary: Validate that package scripts, VS Code tasks, Claude settings, and helper scripts agree on the template workflow.
owns: Integration proof that the repo’s workflow surfaces agree on command names and hook entrypoints.
boundaries: This file is an integration spec only. Keep it deterministic and filesystem-local.
invariants: Assertions remain local-only and cross-check real repository surfaces.
risks: Weak coverage here lets script-name or hook-name drift survive until adopters hit it manually.
securityPrivacy: Local test code only; avoid secrets and network access.
notesForLLM: Prefer high-signal cross-file assertions that catch naming drift.
tests: pnpm test:integration
linkedDocs:
  - tests/integration/README.md
  - scripts/README.md
  - .claude/hooks/README.md
related:
  - package.json
  - .vscode/tasks.json
  - .claude/settings.json
---

# repo-workflow.test.mjs
