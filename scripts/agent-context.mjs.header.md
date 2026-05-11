---
fileId: contextrail-template:scripts:agent-context
module: tooling
stability: evolving
steward: shared
api: public-cli
summary: Slice-aware context briefer CLI that emits a token-budgeted markdown brief for a given slice's touched files.
owns: Tier-1 SYSTEM_MAP category fragment emission; arg parsing with profile/budget resolution.
boundaries: Reads SYSTEM_MAP and file paths only; does not write to the git index or modify module files.
invariants: Tier-1 output is never dropped; budget is enforced before writing to stdout or file.
notesForLLM: Exports parseArgs and resolveBudget for unit testing. main() is guarded by isMain check so imports do not trigger CLI execution.
tests: tests/unit/agent-context-args.test.mjs, tests/integration/agent-context-tier1.test.mjs
specRefs:
  - TPL-289
  - TPL-288
---

# agent-context.mjs
