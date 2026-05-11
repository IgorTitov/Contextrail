---
fileId: contextrail-template:tests:unit:agent-context-modules.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
summary: Unit tests for agent-context.mjs Tier-2 module resolution helpers.
owns: Proving resolveModuleName and uniqueModulesFromFiles exports behave correctly for all path shapes.
boundaries: Imports only exported functions; does not spawn child processes or read filesystem.
invariants: Each test is independent with no shared mutable state.
notesForLLM: Tests resolveModuleName and uniqueModulesFromFiles; covers nested paths, hyphenated names, non-module paths, and deduplication order.
tests: self
specRefs:
  - TPL-290
---

# agent-context-modules.test.mjs
