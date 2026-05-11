---
fileId: contextrail-template:tests:unit:shared-helpers
module: tests/unit
stability: evolving
steward: shared
api: node:test spec
dependsOn:
  - node:test
  - node:assert/strict
  - scripts/checks/_shared.mjs
summary: Unit proof for the pure helper functions exported by scripts/checks/_shared.mjs.
owns: Unit proof for the pure helpers in _shared.mjs.
boundaries: Only pure functions. No filesystem or process side effects.
invariants: Must fail if result(), parseArgs(), or comment-style logic regresses.
risks: Without this proof the most-imported module in the repo has no direct unit coverage.
securityPrivacy: Local test code only; avoid secrets and network access.
notesForLLM: Only test pure functions. Keep assertions deterministic and side-effect-free.
tests: pnpm test:unit
linkedDocs:
  - tests/unit/README.md
  - scripts/checks/_shared.mjs
related:
  - scripts/checks/_shared.mjs
  - scripts/lib/errors.mjs
---

# shared-helpers.test.mjs
