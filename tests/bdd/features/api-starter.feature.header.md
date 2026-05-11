---
fileId: contextrail-template:tests:bdd:features:api-starter
module: tests/bdd
stability: evolving
steward: shared
api: file-local
summary: Gherkin scenarios for user-visible HTTP behavior of the api-starter app shell.
owns: Gherkin scenarios describing expected api-starter HTTP behavior.
boundaries: Describes behavior in domain language only. No implementation details.
invariants: Scenarios must stay independent and self-contained.
securityPrivacy: No secrets.
notesForLLM: Gherkin feature file. Step definitions live in the companion .test.mjs file.
tests: tests/bdd/api-starter.test.mjs
linkedDocs: tests/bdd/api-starter.test.mjs
specRefs: TPL-177
related: apps/api-starter/app.mjs
---

# api-starter.feature
