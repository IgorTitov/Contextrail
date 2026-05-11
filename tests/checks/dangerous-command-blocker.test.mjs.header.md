---
fileId: contextrail-template:tests:checks:dangerous-command-blocker.test
module: tests/checks
stability: evolving
steward: shared
api: unit test
dependsOn:
  - .claude/hooks/run-dangerous-command-blocker.mjs
  - Node.js standard library
summary: Unit tests for the dangerous-command-blocker local-fs allowlist for git push --force-with-lease (TPL-262).
owns: The 7-case proof set for AC4 acceptance criteria.
boundaries: Spawns the hook via spawnSync; does not write to git repos or the live working tree.
invariants: All 7 cases must pass; hook must not be modified to make tests pass trivially.
tests:
  - self
linkedDocs:
  - .claude/hooks/run-dangerous-command-blocker.mjs
  - .claude/hooks/run-dangerous-command-blocker.mjs.header.md
related:
  - tests/integration/dangerous-command-hook.test.mjs
---

# dangerous-command-blocker.test.mjs
