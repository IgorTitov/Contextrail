---
fileId: contextrail-template:scripts:checks:changelog-compile
module: scripts/checks
stability: evolving
steward: shared
api: "CLI: node scripts/checks/changelog-compile.mjs [--dry-run|--check|--json]"
dependsOn:
  - node:fs
  - node:path
summary: Compile towncrier-style changelog fragments into CHANGELOG.md.
owns: Fragment collection, category grouping, and Unreleased section splicing.
boundaries: Reads from changelog/ directory and writes to CHANGELOG.md only. Does not touch git.
invariants: Category order must match CATEGORY_ORDER constant. Fragment naming must follow <id>.<category>.md.
risks: Incorrect splice if CHANGELOG.md heading format changes.
securityPrivacy: Local filesystem only. No network access.
notesForLLM: Keep the splice logic simple — match on "## [Unreleased]" heading exactly.
tests:
  - Manual: --dry-run and --check modes
related:
  - changelog/README.md
  - scripts/checks/changelog-sync.mjs
  - CHANGELOG.md
---

# changelog-compile.mjs
