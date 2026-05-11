---
fileId: contextrail-template:tests:bdd:example-greeter-test
module: tests/bdd
stability: evolving
steward: shared
api: node:test spec
dependsOn:
  - node:test
  - node:assert/strict
  - node:fs
  - modules/example-greeter/public-api.mjs
summary: BDD step runner proving the example-greeter Gherkin scenarios against the real module.
owns: BDD step runner proving the example-greeter scenarios.
boundaries: This file proves user-visible behavior through Gherkin scenarios. It must not become a unit test.
invariants: Each Gherkin scenario maps to one test block. Scenario names must match the feature file.
risks: Drift between the feature file and the step runner silently breaks BDD coverage.
securityPrivacy: Local test code only; avoid secrets and network access.
notesForLLM: Each test corresponds to a Gherkin scenario. Keep the mapping explicit.
tests: pnpm test:bdd
linkedDocs:
  - tests/bdd/features/example-greeter.feature
  - modules/example-greeter/README.md
related:
  - tests/bdd/features/example-greeter.feature
  - modules/example-greeter/public-api.mjs
---

# example-greeter.test.mjs
