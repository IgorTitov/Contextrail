---
fileId: contextrail-template:tests:unit:agent-context-args.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
summary: Unit tests for agent-context.mjs arg parsing and budget resolution.
owns: Proving parseArgs and resolveBudget exports behave correctly for all flag combinations.
boundaries: Imports only exported functions; does not spawn child processes or read filesystem.
invariants: Each test is independent with no shared mutable state.
notesForLLM: Tests parseArgs and resolveBudget as named exports; isMain guard in agent-context.mjs prevents CLI side effects on import.
tests: self
specRefs:
  - TPL-289
---

# agent-context-args.test.mjs
