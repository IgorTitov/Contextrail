---
fileId: contextrail-template:scripts:mergezip
module: scripts
stability: evolving
steward: shared
api: "CLI: node scripts/mergezip.mjs"
dependsOn:
  - package.json
  - scripts/checks/version-bump.mjs
  - scripts/merge-snapshot.mjs
  - archiver
  - .backups/
summary: "Run the simplified Merge & Zip workflow: bump version, snapshot, optional tests, then zip into .backups"
owns: "Run the simplified Merge & Zip workflow: bump version, snapshot, optional tests, then zip into .backups."
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

# mergezip.mjs
