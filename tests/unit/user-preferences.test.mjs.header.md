---
fileId: contextrail-template:tests:unit:user-preferences.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
summary: Unit tests for the user-preferences module.
owns: Unit proof of user-preferences domain logic (defaultPreferences, mergePreferences, isValidPreferences), port contract validation (assertStoragePort), and memory adapter correctness.
boundaries: Must import only through modules/user-preferences/public-api.mjs; must not test UI rendering, localStorage integration, or persistence adapter wiring.
invariants: Domain functions must be pure and deterministic; mergePreferences must not mutate its inputs; port validator must throw on any non-compliant adapter; memory adapter must not share state across test cases.
notesForLLM: Import exclusively via public-api.mjs; never reach into modules/user-preferences internals. When new domain functions are added, cover each with a separate describe block. Verify mutation-safety of mergePreferences explicitly.
tests: node:test runner via pnpm test:unit
specRefs: TPL-014
---

# user-preferences.test.mjs
