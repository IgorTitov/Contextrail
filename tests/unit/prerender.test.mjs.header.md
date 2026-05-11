---
fileId: contextrail-template:tests:unit:prerender-test
module: tests/unit
stability: experimental
steward: prerender-module
api: Tests
boundedContext: prerender
summary: Unit proof for the prerender bounded module — manifest, result, plan, runner, memory output.
owns: The unit-level behavioural contract for the prerender module.
boundaries: Tests only. Imports from public-api.mjs; no deep imports.
invariants: Covers manifest validation, plan base URL rules, runner happy path and error aggregation, memory output lifecycle.
specRefs:
  - TPL-001
---

# prerender.test.mjs
