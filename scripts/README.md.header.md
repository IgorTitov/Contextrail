---
fileId: contextrail-template:scripts:README
module: scripts
stability: evolving
steward: shared
api: Documentation
dependsOn:
  - scripts/checks/*
  - scripts/merge-snapshot.mjs
  - scripts/mergezip.mjs
  - scripts/testall-mergezip.mjs
  - package.json
summary: Root script folder index
owns: Navigation for repository scripts and the distinction between root scripts and scripts/checks.
boundaries: This file is navigation only. It should not duplicate the full behavior of each script.
invariants: Keep this file aligned with the actual repository structure and workflow.
risks: Behavior drift here can break repository automation, hook execution, or artifact generation.
securityPrivacy: Local filesystem and process execution only; keep behavior deterministic and avoid secrets or network access.
notesForLLM: Keep this file aligned with current repository behavior and avoid filler in metadata.
tests:
  - tests/integration/repo-workflow.test.mjs
  - scripts/checks/readme-check.mjs
linkedDocs:
  - scripts/checks/README.md
  - README.md
  - tests/README.md
related:
  - scripts/merge-snapshot.mjs
  - scripts/mergezip.mjs
  - scripts/testall-mergezip.mjs
---

# README.md
