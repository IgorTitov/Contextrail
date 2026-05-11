---
fileId: contextrail-template:scripts:checks:header-migrate
module: scripts/checks
stability: evolving
steward: shared
api: "CLI: node scripts/checks/header-migrate.mjs"
summary: Header Migrate script for repository automation.
owns: The header migrate automation task.
boundaries: Tooling script. Must not contain application business logic.
invariants: Must remain idempotent and safe to re-run.
notesForLLM: Repository automation script. Run via node scripts/checks/header-migrate.mjs.
---

# header-migrate.mjs
