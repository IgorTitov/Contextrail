---
fileId: contextrail-template:tests:e2e:template-bootstrap-html
module: tests/e2e
stability: evolving
steward: shared
api: Static fixture
dependsOn: tests/e2e/template-bootstrap.spec.mjs
summary: Static local fixture for the template’s Playwright smoke proof.
owns: The local HTML surface used by the template’s Playwright smoke proof.
boundaries: This file is a self-contained fixture only. Do not turn it into an application runtime.
invariants: The heading, checklist, and status badge remain stable enough for the smoke spec to assert against them.
risks: If this fixture becomes dynamic or server-dependent, the template loses a simple e2e example.
securityPrivacy: Local static content only; avoid secrets and network access.
notesForLLM: Keep selectors obvious and content stable.
tests: tests/e2e/template-bootstrap.spec.mjs
linkedDocs: tests/e2e/README.md
related: tests/e2e/template-bootstrap.spec.mjs
---

# template-bootstrap.html
