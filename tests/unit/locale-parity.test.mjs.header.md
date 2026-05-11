---
fileId: contextrail-template:tests:unit:locale-parity.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
summary: Unit tests for the locale-parity module.
owns: Parity proof that en and ru locale catalogs have identical keys and matching placeholder tokens, preventing silent missing-translation bugs.
boundaries: Must only compare key sets and placeholder patterns across locale catalog modules; must not test runtime formatting, UI rendering, or translation correctness.
invariants: en and ru key sets must be equal after sorting; every placeholder token present in an en value must also appear in the corresponding ru value; test count must grow when new locales are added.
notesForLLM: When a new locale is added, extend this file with the same key-set and placeholder-parity checks against en. Do not test translation quality or runtime formatting here.
tests: node:test runner via pnpm test:unit
specRefs: TPL-015
---

# locale-parity.test.mjs
