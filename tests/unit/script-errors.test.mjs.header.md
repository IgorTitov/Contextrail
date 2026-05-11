---
fileId: contextrail-template:tests:unit:script-errors-test
module: tests/unit
stability: evolving
steward: shared
api: node:test spec
dependsOn:
  - node:test
  - node:assert/strict
  - scripts/lib/errors.mjs
summary: Prove the shape, inheritance, and serialization of the typed error hierarchy for repo scripts.
owns: The unit proof for the typed script error hierarchy.
boundaries: This file is a unit spec only. Keep assertions focused on error shape and serialization.
invariants: Must fail if any error subclass drifts from the expected shape or loses machine-readable context.
risks: Weak assertions would let the error API drift silently, defeating the purpose of typed errors.
securityPrivacy: Local test code only; avoid secrets and network access.
notesForLLM: Keep assertions direct and readable. This proves the error contract, not script behavior.
tests: pnpm test:unit
linkedDocs:
  - tests/unit/README.md
  - scripts/lib/README.md
related:
  - scripts/lib/errors.mjs
  - scripts/checks/_shared.mjs
---

# script-errors.test.mjs
