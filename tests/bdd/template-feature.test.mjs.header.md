---
fileId: contextrail-template:tests:bdd:template-feature-test
module: tests/bdd
stability: evolving
steward: shared
api: node:test spec
dependsOn:
  - node:test
  - node:assert/strict
  - node:fs
  - tests/bdd/features/template.feature
  - docs/prd/index.md
  - docs/usm/index.md
  - docs/backlog/index.md
summary: Validate that the starter Gherkin scenario stays aligned with the PRD, USM, and backlog references shipped in the template.
owns: BDD smoke proof that the starter scenario and its traceability references stay aligned.
boundaries: This file is a deterministic BDD-oriented repo check. It must not turn into a browser or step-definition runner.
invariants: The canonical bootstrap scenario name remains stable unless all linked docs are updated together.
risks: Weak assertions here let the repo ship a feature file whose references silently drift.
securityPrivacy: Local test code only; avoid secrets and network access.
notesForLLM: Keep this file focused on scenario alignment and traceability, not browser execution.
tests: pnpm test:bdd
linkedDocs:
  - tests/bdd/README.md
  - .claude/skills/bdd-playwright/SKILL.md
related:
  - tests/bdd/features/template.feature
  - docs/prd/index.md
  - docs/usm/index.md
  - docs/backlog/index.md
---

# template-feature.test.mjs
