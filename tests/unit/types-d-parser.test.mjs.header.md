---
fileId: contextrail-template:tests:unit:types-d-parser-test
module: tests/unit
stability: evolving
steward: shared
dependsOn:
  - scripts/checks/lib/types-d-parser.mjs
summary: Unit tests that lock in the ADR-0010 bounded TS subset supported by the types.d.ts parser, including one positive case per supported feature, one negative case per rejected feature, and a round-trip proof against modules/retrieval/types.d.ts.
owns: The behavioral contract for parseTypesDeclaration() — what the bounded subset allows, what it rejects, and what the retrieval round-trip must continue to produce.
boundaries: Pure unit tests — no filesystem writes, only reads modules/retrieval/types.d.ts for the round-trip case.
invariants: Every rejected feature listed in ADR-0010 has a negative test that asserts the specific feature name is present in the error message and a line number is reported. Retrieval round-trip must always recover all 7 ports as interface kinds.
risks: Loosening these tests without updating ADR-0010 would silently expand the supported TS subset and could admit parser constructs the generator has not been reviewed for.
securityPrivacy: Test-only; no secrets or credentials.
notesForLLM: When extending the parser, add the positive/negative pair here BEFORE touching scripts/checks/lib/types-d-parser.mjs. Negative cases must check both the feature name and the line number in the error message.
specRefs:
  - TPL-180
  - TPL-178
tests: []
linkedDocs:
  - docs/adr/0010-manifest-capabilities.md
related:
  - tests/unit/jsdoc-typedef-parser.test.mjs
  - tests/unit/capabilities-sync.test.mjs
---

# types-d-parser.test.mjs
