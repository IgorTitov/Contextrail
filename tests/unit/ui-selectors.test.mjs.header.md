---
fileId: contextrail-template:tests:unit:ui-selectors-test
module: tests/unit
stability: evolving
steward: shared
api: node:test spec
dependsOn:
  - node:test
  - node:assert/strict
  - apps/starter/ui-selectors.mjs
summary: Prove the shape and content of the bounded selector registry for the bootstrap starter feature.
owns: The unit proof for the bounded selector registry starter module.
boundaries: This file is a unit spec only. Keep assertions focused on registry shape and values.
invariants: The spec must fail if the registry shape drifts from what HTML and E2E specs depend on.
risks: Weak assertions would let the registry drift silently from the fixture and E2E spec.
securityPrivacy: Local test code only; avoid secrets and network access.
notesForLLM: Keep assertions direct and readable. This proves the registry contract, not application behavior.
tests: pnpm test:unit
linkedDocs:
  - tests/unit/README.md
  - apps/starter/README.md
related:
  - apps/starter/ui-selectors.mjs
  - tests/e2e/template-bootstrap.spec.mjs
---

# ui-selectors.test.mjs
