---
fileId: contextrail-template:scripts:lib:repo-meta
module: scripts/lib
stability: evolving
steward: shared
api: Shared repo-identity helpers for scripts
dependsOn:
  - node:fs
  - node:path
  - scripts/lib/fs-helpers.mjs
summary: Repository identity and version utilities shared across repository scripts.
owns: Repository identity (FileId prefix) and version discovery used by header scripts and version-bump.
boundaries: This file provides repo-identity and version reading only. No header schema, CLI parsing, or output formatting.
invariants: REPO_FILEID_PREFIX always ends with a colon. repoVersion falls back to 0.0.0.
risks: Breaking these helpers affects FileId generation in all headers and version stamping.
securityPrivacy: Reads local package.json and VERSION only; no network access.
notesForLLM: Keep fallback chain deterministic. REPO_FILEID_PREFIX must always be a valid colon-terminated prefix.
tests: tests/unit/shared-helpers.test.mjs
linkedDocs: scripts/lib/README.md
related:
  - scripts/checks/_shared.mjs
  - scripts/lib/fs-helpers.mjs
---

# repo-meta.mjs
