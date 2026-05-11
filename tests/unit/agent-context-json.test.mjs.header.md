---
fileId: contextrail-template:tests:unit:agent-context-json.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
summary: Unit tests for agent-context.mjs --format=json flag and pnpm context:brief shortcut (TPL-295).
owns: Proving --format=json emits valid parseable JSON with correct shape; --format=md/markdown emit markdown; pnpm context:brief shortcut forwards args.
boundaries: Imports parseArgs; also spawns child processes for CLI integration tests.
invariants: Each test is independent with no shared mutable state; JSON totalTokens must match markdown Total line.
notesForLLM: Tests parseArgs extensions (format, explain) and CLI output shape; JSON totalTokens drift test catches data-pipeline divergence between markdown and JSON paths.
tests: self
specRefs:
  - TPL-295
---

# agent-context-json.test.mjs
