---
fileId: contextrail-template:tests:unit:import-resolver-test
module: tests/unit
stability: evolving
steward: shared
summary: Unit tests for the same-module JSDoc import-type resolver used by capabilities-sync to follow `import('relative').TypeName` references within a module's boundary.
owns: Proof of single-import resolution, transitive chain following, cross-module boundary enforcement, missing-typedef errors, and cycle termination for resolveImportTypedefs.
boundaries: Pure unit tests using an in-memory fs adapter. No real filesystem access.
invariants: Failing case for cross-module imports must remain in place; deleting it would silently allow a hex boundary violation.
risks: Loss of coverage on the cross-module boundary check would reopen the inline-domain-shape regression that ADR-0010 explicitly rejected.
securityPrivacy: No external I/O.
notesForLLM: When extending, add tests to lock new resolver behaviour rather than loosening existing assertions.
specRefs:
  - TPL-183
  - TPL-178
tests: []
linkedDocs:
  - docs/adr/0010-manifest-capabilities.md
related:
  - scripts/checks/lib/import-resolver.mjs
---

# import-resolver.test.mjs
