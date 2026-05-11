---
fileId: contextrail-template:tests:bdd:features:starter-common
module: tests/bdd
stability: evolving
steward: shared
api: file-local
summary: Gherkin BDD scenarios for the starter-common module.
owns: BDD scenarios proving the 8 starter common features (preferences, i18n, themes, layout, navigation, notifications, loading, errors).
boundaries: This file belongs to the BDD proof surface. Scenarios describe observable user-visible behavior, not implementation details.
invariants: Scenario names must match the bdd_refs in the corresponding trace-yaml blocks in backlog and USM docs.
notesForLLM: Each scenario maps to one backlog task (TPL-014 through TPL-021). Keep scenario names stable — they are referenced by bdd_refs.
tests: self
---

# starter-common.feature
