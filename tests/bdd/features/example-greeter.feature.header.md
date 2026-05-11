---
fileId: contextrail-template:tests:bdd:features:example-greeter
module: tests/bdd
stability: evolving
steward: shared
api: BDD feature file
dependsOn: modules/example-greeter/public-api.mjs
summary: BDD feature demonstrating user-visible greeting behavior through the hexagonal module.
owns: The BDD scenarios proving user-visible greeting behavior.
boundaries: This file belongs to the proof surface. Keep scenarios user-visible and behavior-focused.
invariants: Scenario names must stay aligned with the BDD test runner and any traceability refs.
risks: Stale scenarios can hide behavioral drift.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Keep scenarios user-visible. This is a teaching example — replace with real behavior specs.
tests: tests/bdd/example-greeter.test.mjs
linkedDocs: modules/example-greeter/README.md
related:
  - tests/bdd/example-greeter.test.mjs
  - modules/example-greeter/public-api.mjs
---

# example-greeter.feature
