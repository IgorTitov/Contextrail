---
fileId: contextrail-template:tests:README
module: tests
stability: evolving
steward: shared
api: Documentation
dependsOn:
  - tests/unit/*
  - tests/integration/*
  - tests/contract/*
  - tests/bdd/*
  - tests/e2e/*
  - package.json
summary: Top-level map of the repository test surface, including the fast-path proof layers and the separate opt-in browser smoke layer.
owns: Navigation and guidance for the template test surface.
boundaries: This file belongs to the proof surface. It should stay focused on observable behavior or test-surface navigation.
invariants: Test guidance and scenarios must stay aligned with the documented user-visible template workflow; pnpm test guidance must match the shipped scripts.
risks: Weak or stale test guidance can leave user-visible behavior under-specified or misstate which proof layers run by default.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Keep examples user-visible and stable. Update scenario names and refs together when behavior changes, especially when the fast-path versus opt-in split changes.
tests:
  - tests/integration/repo-workflow.test.mjs
  - scripts/checks/readme-check.mjs
linkedDocs:
  - README.md
  - .claude/rules/testing.md
  - package.json.header.md
related:
  - package.json
  - scripts/checks/test-gate.mjs
---

# README.md
