---
fileId: contextrail-template:tests:integration:agent-context-tier2.test
module: tests/integration
stability: evolving
steward: shared
api: file-local
summary: Integration tests for agent-context.mjs Tier-2 module manifest + public-API emission.
owns: Proving the CLI emits correct manifest and public-API sections, respects budget with drop-priority, and does not emit Tier-3/Tier-4 sections.
boundaries: Spawns agent-context.mjs as a child process against real modules; does not mutate repo files.
invariants: Each test is independent; child process CWD is repo root; budget-drop test dynamically calibrates from full-output token count.
notesForLLM: Drop-priority rule — modules emitted last in unique list (last first-seen from --files) are dropped first. Budget-drop test measures full output first, then uses fullTokens-500 as tight budget.
tests: self
specRefs:
  - TPL-290
---

# agent-context-tier2.test.mjs
