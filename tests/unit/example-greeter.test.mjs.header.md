---
fileId: contextrail-template:tests:unit:example-greeter
module: tests/unit
stability: evolving
steward: shared
api: node:test spec
dependsOn:
  - node:test
  - node:assert/strict
  - modules/example-greeter/public-api.mjs
summary: Unit proof for the example-greeter bounded module — domain logic, port validation, and adapter compliance.
owns: Unit proof for the example-greeter bounded module.
boundaries: Test only the public API surface. No deep imports.
invariants: greet() must be pure; assertGreetingPort() must reject non-conforming adapters; defaultGreetingAdapter must satisfy the port.
securityPrivacy: Test-only; no I/O.
notesForLLM: This test file imports exclusively from public-api.mjs to prove the hexagonal import rule.
tests: self
linkedDocs: modules/example-greeter/README.md
related: modules/example-greeter/public-api.mjs
---

# example-greeter.test.mjs
