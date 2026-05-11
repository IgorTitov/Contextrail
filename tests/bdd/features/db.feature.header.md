---
fileId: contextrail-template:tests:bdd:features:db
module: tests/bdd
stability: evolving
steward: shared
api: file-local
summary: Gherkin scenarios for user-visible database abstraction behavior through the db module.
owns: Gherkin scenarios describing expected db module behavior.
boundaries: Describes behavior in domain language only. No implementation details.
invariants: Scenarios must stay independent and self-contained.
securityPrivacy: No secrets.
notesForLLM: Gherkin feature file. Step definitions live in the companion .test.mjs file.
tests: tests/bdd/db.test.mjs
linkedDocs: tests/bdd/db.test.mjs
related: modules/db/public-api.mjs
---

# db.feature
