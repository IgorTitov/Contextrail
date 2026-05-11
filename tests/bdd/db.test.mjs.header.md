---
fileId: contextrail-template:tests:bdd:db.test
module: tests/bdd
stability: evolving
steward: shared
api: file-local
dependsOn:
  - modules/db/public-api.mjs
  - tests/bdd/features/db.feature
summary: BDD step runner proving user-visible database behavior through the db module public API.
owns: BDD step definitions for db.feature scenarios.
boundaries: Tests only db module public API. Does not test adapter internals.
invariants: Each scenario must map to a scenario in db.feature.
securityPrivacy: No secrets.
notesForLLM: BDD step runner. Each test maps to a Gherkin scenario in the companion .feature file.
tests: self
linkedDocs: tests/bdd/features/db.feature
related: tests/unit/db.test.mjs
---

# db.test.mjs
