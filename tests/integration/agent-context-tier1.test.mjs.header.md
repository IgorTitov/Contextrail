---
fileId: contextrail-template:tests:integration:agent-context-tier1.test
module: tests/integration
stability: evolving
steward: shared
api: file-local
summary: Integration tests for agent-context.mjs Tier-1 SYSTEM_MAP fragment emission.
owns: Proving the CLI emits correct category fragments for real file paths, respects budget, and exits non-zero for unknown modules.
boundaries: Spawns agent-context.mjs as a child process against the real SYSTEM_MAP; does not mutate repo files.
invariants: Each test is independent; child process CWD is repo root.
notesForLLM: Uses execFileSync to run the CLI and inspect stdout/stderr. runExpectFail captures non-zero exits for negative test cases.
tests: self
specRefs:
  - TPL-289
---

# agent-context-tier1.test.mjs
