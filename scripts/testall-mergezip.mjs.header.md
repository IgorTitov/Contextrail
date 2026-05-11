---
fileId: contextrail-template:scripts:testall-mergezip
module: scripts
stability: evolving
steward: shared
api: "CLI: node scripts/testall-mergezip.mjs"
dependsOn:
  - node:child_process
  - scripts/mergezip.mjs
  - package.json
summary: Run test:all and always run mergezip afterwards so artifacts still exist on failures
owns: Run test:all and always run mergezip afterwards so artifacts still exist on failures.
boundaries: This file belongs to artifact creation workflow. It must not quietly reintroduce legacy external archive flow or hidden commit behavior.
invariants: Artifacts are written under .backups/; wrapper behavior preserves artifact creation even when tests fail; hidden auto-commit flow stays disabled.
risks: Behavior drift here can break repository automation, hook execution, or artifact generation.
securityPrivacy: Local filesystem and process execution only; keep behavior deterministic and avoid secrets or network access.
notesForLLM: Preserve the current .backups-based artifact flow. Do not reintroduce hidden commit logic or legacy external archive paths.
tests:
  - pnpm snapshot
  - pnpm mergezip
  - pnpm test:all:mergezip
linkedDocs: scripts/README.md
related:
  - .backups/
  - package.json
  - VERSION
---

# testall-mergezip.mjs
