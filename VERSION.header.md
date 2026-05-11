---
fileId: contextrail-template:VERSION:sidecar
module: root
stability: evolving
steward: shared
api: Documentation
dependsOn: VERSION
summary: Sidecar header for VERSION because inline comments would corrupt the plain-text version marker.
owns: The sidecar documentation for the plain-text VERSION mirror used by archive and release flows.
boundaries: This file documents the mirror contract only. It must not become a second version source or a release workflow handbook.
invariants: VERSION mirrors the package version expected by the repository workflow; inline comments must never be added to VERSION itself.
risks: Stale metadata can mislead future agents about which version source is canonical or how VERSION stays synchronized.
securityPrivacy: Documentation only; no secrets should be stored here.
notesForLLM: Keep this sidecar aligned with the current version-mirroring behavior. package.json remains canonical unless the repository workflow changes on purpose.
tests:
  - node scripts/checks/header-check.mjs
  - node scripts/checks/version-bump.mjs
linkedDocs:
  - package.json.header.md
  - .claude/CLAUDE.md
  - scripts/checks/version-bump.mjs
related:
  - VERSION
  - package.json
  - scripts/mergezip.mjs
---

# VERSION
