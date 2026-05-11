---
fileId: contextrail-template:changelog:README
module: changelog
stability: evolving
steward: shared
api: Documentation
summary: Documentation for the towncrier-style changelog fragments directory.
owns: Fragment naming convention, category taxonomy, and compile workflow documentation.
boundaries: Documents the changelog/ directory only. Does not own CHANGELOG.md content.
invariants: Category list must match changelog-compile.mjs CATEGORY_ORDER.
risks: Category drift if compile script is updated without updating this README.
securityPrivacy: No secrets.
notesForLLM: When adding a new changelog category, update both this README and changelog-compile.mjs.
related:
  - scripts/checks/changelog-compile.mjs
  - CHANGELOG.md
---

# README.md
