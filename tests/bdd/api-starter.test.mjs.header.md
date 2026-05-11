---
fileId: contextrail-template:tests:bdd:api-starter.test
module: tests/bdd
stability: evolving
steward: shared
api: file-local
dependsOn:
  - apps/api-starter/app.mjs
  - tests/bdd/features/api-starter.feature
summary: BDD step runner proving user-visible HTTP behavior of the api-starter app shell.
owns: BDD step definitions for api-starter.feature scenarios.
boundaries: Tests only api-starter HTTP behavior. Does not test hex module internals.
invariants: Each scenario must map to a scenario in api-starter.feature.
securityPrivacy: No secrets.
notesForLLM: BDD step runner. Each test maps to a Gherkin scenario in the companion .feature file.
tests: self
linkedDocs: tests/bdd/features/api-starter.feature
specRefs: TPL-177
related: tests/unit/api-starter.test.mjs
---

# api-starter.test.mjs
