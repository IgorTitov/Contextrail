---
fileId: contextrail-template:tests:bdd:README
module: tests/bdd
stability: evolving
steward: shared
api: Documentation
dependsOn:
  - tests/bdd/features/*
  - tests/bdd/template-feature.test.mjs
  - docs/prd/index.md
  - docs/usm/index.md
  - docs/backlog/index.md
summary: BDD folder guide
owns: Navigation and guidance for the template’s BDD proof surface.
boundaries: This file belongs to the proof surface. It should stay focused on observable behavior or test-surface navigation.
invariants: Test guidance and scenarios must stay aligned with the documented user-visible template workflow.
risks: Weak or stale BDD guidance can leave user-visible behavior under-specified.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Keep examples user-visible and stable. Update scenario names and refs together when behavior changes.
tests:
  - tests/bdd/template-feature.test.mjs
  - scripts/checks/readme-check.mjs
linkedDocs:
  - tests/README.md
  - .claude/skills/bdd-playwright/SKILL.md
related:
  - tests/bdd/features/template.feature
  - tests/bdd/template-feature.test.mjs
---

# README.md
