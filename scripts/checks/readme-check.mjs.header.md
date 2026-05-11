---
fileId: contextrail-template:scripts:checks:readme-check
module: scripts/checks
stability: evolving
steward: shared
api: "CLI: node scripts/checks/readme-check.mjs"
dependsOn:
  - node:path
  - scripts/checks/_shared.mjs
summary: Ensure meaningful folders contain README.md
owns: Ensure meaningful folders contain README.md.
boundaries: This file belongs to deterministic repository tooling. It should stay small, scriptable, and free of unrelated repository policy.
invariants: Behavior remains deterministic, local-only, and callable from package.json and git-hook workflow without hidden side effects.
risks: Behavior drift here can break repository automation, hook execution, or artifact generation.
securityPrivacy: Local filesystem and process execution only; keep behavior deterministic and avoid secrets or network access.
notesForLLM: Keep behavior deterministic and easy to validate from the command line. Do not add fuzzy heuristics unless necessary.
tests: .claude/agents/readme-guardian.md PostToolUse hook
linkedDocs:
  - scripts/checks/README.md
  - .claude/CLAUDE.md
related:
  - scripts/checks/_shared.mjs
  - package.json
---

# readme-check.mjs
