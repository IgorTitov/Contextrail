---
fileId: contextrail-template:tests:integration:trace-helpers.test
module: tests/integration
stability: evolving
steward: shared
api: file-local
summary: "Integration tests: trace helpers."
owns: Integration proof that collectWorkItems() from scripts/lib/trace-helpers.mjs returns correctly shaped work items sourced from real docs/ files.
boundaries: Must not test filesystem helpers, output formatting, or CLI argument parsing; trace collection contract only.
invariants: Every collected item must have a non-empty id, string type and title, a source_file under docs/, and array-typed depends_on, spec_refs, test_refs, bdd_refs, and acceptance fields.
risks: Tests scan real docs/ content; adding work items with missing required fields will surface here first.
notesForLLM: The shape assertions enumerate all required item fields; update them whenever collectWorkItems() contract changes.
tests:
  - pnpm test:unit
  - node --test tests/integration/trace-helpers.test.mjs
related: scripts/lib/trace-helpers.mjs
---

# trace-helpers.test.mjs
