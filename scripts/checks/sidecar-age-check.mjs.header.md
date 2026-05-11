---
fileId: contextrail-template:scripts:checks:sidecar-age-check
module: scripts/checks
stability: evolving
steward: shared
api: "CLI: node scripts/checks/sidecar-age-check.mjs [--json]"
dependsOn:
  - node:child_process
  - node:fs
  - node:path
  - scripts/checks/_shared.mjs
summary: Warn when a source file has been modified more recently than its .header.md sidecar.
owns: Git-date comparison between parent files and their sidecar headers.
boundaries: Advisory warnings only. Does not auto-update stale sidecars.
invariants: Uses git log dates, not filesystem mtime. Only checks files tracked by git.
risks: Inaccurate if git history is shallow (CI clone depth).
securityPrivacy: Local filesystem and git log only.
notesForLLM: Run after modifying source files to check if sidecars need updating.
related:
  - scripts/checks/header-check.mjs
---

# sidecar-age-check.mjs
