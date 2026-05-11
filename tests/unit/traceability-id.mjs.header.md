---
fileId: contextrail-template:tests:unit:traceability-id
module: tests/unit
stability: evolving
steward: shared
api: normalizeTraceabilityId(value)
dependsOn: Node.js standard library only
summary: Tiny pure helper used by the template’s unit-test example.
owns: The sample pure helper used by the template’s unit-test example.
boundaries: This file is test-support sample code only. It must stay tiny and dependency-free.
invariants: Normalization remains deterministic, uppercase, and whitespace-trimming.
risks: Overgrowing this helper would blur the line between sample test code and real repository logic.
securityPrivacy: Local test helper only; no secrets or network access.
notesForLLM: Preserve the pure-function shape. Keep changes small and easy to assert.
tests: tests/unit/traceability-id.test.mjs
linkedDocs: tests/unit/README.md
related: tests/unit/traceability-id.test.mjs
---

# traceability-id.mjs
