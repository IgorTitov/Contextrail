---
fileId: contextrail-template:scripts:lib:README
module: scripts/lib
stability: evolving
steward: shared
api: Documentation
dependsOn:
  - scripts/lib/errors.mjs
  - scripts/lib/fs-helpers.mjs
  - scripts/lib/cli-helpers.mjs
  - scripts/lib/output.mjs
  - scripts/lib/trace-helpers.mjs
  - scripts/lib/repo-meta.mjs
  - scripts/lib/header.mjs
summary: Explain the shared script library and its modules.
owns: Documentation for the shared script library.
boundaries: This file documents the scripts/lib modules. It must not duplicate module internals.
invariants: Module list stays aligned with the actual files in scripts/lib/.
risks: Stale module list misleads agents and developers.
securityPrivacy: Documentation only; no secrets.
notesForLLM: Keep the module list current. Each entry should say what the module owns in one line.
tests: node scripts/checks/readme-check.mjs
linkedDocs: scripts/checks/_shared.mjs
related:
  - scripts/checks/_shared.mjs
  - scripts/lib/errors.mjs
  - scripts/lib/fs-helpers.mjs
  - scripts/lib/cli-helpers.mjs
  - scripts/lib/output.mjs
  - scripts/lib/trace-helpers.mjs
  - scripts/lib/repo-meta.mjs
  - scripts/lib/header.mjs
---

# README.md
