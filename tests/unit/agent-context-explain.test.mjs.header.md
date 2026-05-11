---
fileId: contextrail-template:tests:unit:agent-context-explain.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
summary: Unit tests for agent-context.mjs --explain flag (TPL-295).
owns: Proving buildExplainSection export and --explain CLI flag produce correct per-tier rationale sections.
boundaries: Imports buildExplainSection; also spawns child processes for CLI integration tests.
invariants: Each test is independent with no shared mutable state.
notesForLLM: Tests both the exported buildExplainSection function (unit) and CLI invocations (integration); explain section must appear before Token budget heading.
tests: self
specRefs:
  - TPL-295
---

# agent-context-explain.test.mjs
