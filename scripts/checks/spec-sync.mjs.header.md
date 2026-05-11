---
fileId: contextrail-template:scripts:checks:spec-sync
module: scripts/checks
stability: evolving
steward: shared
api: "CLI: node scripts/checks/spec-sync.mjs"
dependsOn:
  - scripts/checks/_shared.mjs
  - docs/_generated/spec-index.json
summary: Generate a machine-readable spec index from trace-yaml blocks
owns: Generate a machine-readable spec index from trace-yaml blocks.
boundaries: This file belongs to deterministic repository tooling. It should stay small, scriptable, and free of unrelated repository policy.
invariants: Behavior remains deterministic, local-only, and callable from package.json and git-hook workflow without hidden side effects.
risks: Behavior drift here can break repository automation, hook execution, or artifact generation.
securityPrivacy: Local filesystem and process execution only; keep behavior deterministic and avoid secrets or network access.
notesForLLM: Keep behavior deterministic and easy to validate from the command line. Do not add fuzzy heuristics unless necessary.
tests:
  - .githooks/pre-commit
  - scripts/checks/test-gate.mjs
linkedDocs:
  - scripts/checks/README.md
  - .claude/CLAUDE.md
related:
  - scripts/checks/_shared.mjs
  - package.json
---

# spec-sync.mjs
