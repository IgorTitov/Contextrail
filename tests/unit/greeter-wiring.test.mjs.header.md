---
fileId: contextrail-template:tests:unit:greeter-wiring
module: tests/unit
stability: evolving
steward: shared
api: node:test spec
dependsOn:
  - node:test
  - node:assert/strict
  - apps/starter/examples/greeter-wiring/greeter-app.mjs
summary: Unit proof for the greeter wiring example — application-layer assembly through public-api.mjs.
owns: Unit proof for the greeter application-layer wiring example.
boundaries: Tests application wiring only. Domain logic is tested in example-greeter.test.mjs.
invariants: createGreeter() must validate adapters and produce a working greeter function.
securityPrivacy: Test-only; no I/O.
notesForLLM: This tests the wiring example, not the domain. Keep focus on assembly and adapter validation.
tests: self
linkedDocs: apps/starter/examples/greeter-wiring/README.md
related:
  - tests/unit/example-greeter.test.mjs
  - apps/starter/examples/greeter-wiring/greeter-app.mjs
---

# greeter-wiring.test.mjs
