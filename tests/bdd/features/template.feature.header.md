---
fileId: contextrail-template:tests:bdd:features:template
module: tests/bdd
stability: evolving
steward: shared
api: BDD feature file
dependsOn:
  - tests/bdd/features/README.md
  - docs/prd/index.md
  - docs/usm/index.md
  - docs/backlog/index.md
summary: Starter BDD feature demonstrating traceable bootstrap behavior
owns: The canonical BDD scenario proving the template bootstrap flow.
boundaries: This file belongs to the proof surface. It should stay focused on observable behavior or test-surface navigation.
invariants: Test guidance and scenarios must stay aligned with the documented user-visible template workflow.
risks: Weak or stale test guidance can leave user-visible behavior under-specified.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Keep examples user-visible and stable. Update scenario names and refs together when behavior changes.
tests: scripts/checks/test-gate.mjs
linkedDocs: tests/README.md
specRefs:
  - TPL-001
  - TPL-002
---

# template.feature
