---
fileId: contextrail-template:tests:unit:trace-helpers
module: tests/unit
stability: evolving
steward: shared
api: node:test spec
dependsOn:
  - node:test
  - node:assert/strict
  - scripts/lib/trace-helpers.mjs
summary: Unit proof for the pure helper functions exported by scripts/lib/trace-helpers.mjs.
owns: Unit proof for the pure helpers in trace-helpers.mjs.
boundaries: Only pure functions. No filesystem or process side effects.
invariants: Must fail if parseBddRef shape or stripping logic regresses.
risks: Without this proof the trace-parsing module has no direct unit coverage.
securityPrivacy: Local test code only; avoid secrets and network access.
notesForLLM: Only test pure functions. Keep assertions deterministic and side-effect-free.
tests: pnpm test:unit
linkedDocs:
  - tests/unit/README.md
  - scripts/lib/trace-helpers.mjs
related:
  - scripts/lib/trace-helpers.mjs
  - scripts/checks/_shared.mjs
---

# trace-helpers.test.mjs
