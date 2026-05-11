---
fileId: contextrail-template:tests:bdd:features:README
module: tests/bdd
stability: evolving
steward: shared
api: Documentation
dependsOn: tests/bdd/features/*
summary: Feature files folder guide
owns: Navigation or guidance for the template test surface.
boundaries: This file belongs to the proof surface. It should stay focused on observable behavior or test-surface navigation.
invariants: Test guidance and scenarios must stay aligned with the documented user-visible template workflow.
risks: Weak or stale test guidance can leave user-visible behavior under-specified.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Keep examples user-visible and stable. Update scenario names and refs together when behavior changes.
tests: scripts/checks/readme-check.mjs
linkedDocs: tests/README.md
---

# README.md
