---
fileId: contextrail-template:tests:unit:jsdoc-typedef-parser.test
module: tests/unit
stability: evolving
steward: shared
api: "node --test tests/unit/jsdoc-typedef-parser.test.mjs"
dependsOn:
  - scripts/checks/lib/jsdoc-typedef-parser.mjs
summary: Unit tests locking down the supported JSDoc @typedef grammar used by capabilities-sync.
owns: The proving surface for parseJsdocTypedefs grammar coverage (simple records, optional fields, method signatures, supporting typedefs, empty-source case).
boundaries: Parser-only tests. Filesystem access and manifest wiring live in the capabilities-sync unit tests.
invariants: Each case is independent; input is an inline source string.
risks: Thin coverage here lets parser regressions slip into TPL-180+ when the grammar is widened.
securityPrivacy: Pure in-memory; no I/O.
notesForLLM: When adding new grammar features add a positive AND a negative case per ADR-0010 guidance.
specRefs:
  - TPL-179
  - TPL-178
tests: []
linkedDocs:
  - docs/adr/0010-manifest-capabilities.md
related:
  - tests/unit/capabilities-sync.test.mjs
  - scripts/checks/lib/jsdoc-typedef-parser.mjs
---

# jsdoc-typedef-parser.test.mjs
