---
fileId: contextrail-template:scripts:checks:version-bump
module: scripts/checks
stability: evolving
steward: shared
api: "CLI: node scripts/checks/version-bump.mjs"
dependsOn:
  - scripts/checks/_shared.mjs
  - package.json
  - VERSION
summary: Bump the repository patch version in package.json and mirror the same value into VERSION.
owns: Patch-version bumps in package.json and the mirrored VERSION file used by archive and release flows.
boundaries: This file belongs to deterministic repository tooling. It should stay small, local-only, and limited to version bumping rather than broader release orchestration.
invariants: The script reads the current version from package.json or VERSION, increments only the patch segment, and writes matching values back without hidden side effects.
risks: Behavior drift here can desynchronize package.json and VERSION or break release automation that assumes a shared patch version.
securityPrivacy: Local filesystem and process execution only; keep behavior deterministic and avoid secrets or network access.
notesForLLM: Keep behavior deterministic and easy to validate from the command line. Do not add fuzzy heuristics, secondary version sources, or non-patch bump logic unless the repository contract changes.
tests:
  - .githooks/pre-commit
  - package.json scripts
linkedDocs:
  - scripts/checks/README.md
  - .claude/CLAUDE.md
related:
  - scripts/checks/_shared.mjs
  - package.json
  - VERSION
---

# version-bump.mjs
