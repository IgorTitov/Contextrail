---
fileId: contextrail-template:scripts:checks:backlog-sync
module: scripts/checks
stability: evolving
steward: shared
api: "CLI: node scripts/checks/backlog-sync.mjs"
dependsOn:
  - scripts/checks/_shared.mjs
  - docs/backlog/_generated/*
summary: Generate readable and machine-readable backlog views from structured work items
owns: Generate readable and machine-readable backlog views from structured work items.
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

# backlog-sync.mjs
