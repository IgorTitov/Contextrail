---
fileId: contextrail-template:scripts:checks:test-gate
module: scripts/checks
stability: evolving
steward: shared
api: "CLI: node scripts/checks/test-gate.mjs"
dependsOn:
  - node:fs
  - node:child_process
  - scripts/checks/_shared.mjs
  - package.json
summary: Run deterministic validation and test stages before commit
owns: Run deterministic validation and test stages before commit.
boundaries: This file belongs to deterministic repository tooling. It should stay small, scriptable, and free of unrelated repository policy.
invariants: Behavior remains deterministic, local-only, and callable from package.json and git-hook workflow without hidden side effects.
risks: Behavior drift here can break repository automation, hook execution, or artifact generation.
securityPrivacy: Local filesystem and process execution only; keep behavior deterministic and avoid secrets or network access.
notesForLLM: Keep behavior deterministic and easy to validate from the command line. Do not add fuzzy heuristics unless necessary.
tests:
  - tests/integration/repo-workflow.test.mjs
  - .githooks/pre-commit
linkedDocs:
  - scripts/checks/README.md
  - .claude/CLAUDE.md
  - tests/README.md
related:
  - scripts/checks/_shared.mjs
  - package.json
specRefs: TPL-003
---

# test-gate.mjs
