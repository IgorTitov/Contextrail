---
fileId: contextrail-template:apps:starter:pwa:README
module: apps/starter
stability: evolving
steward: shared
api: Documentation
dependsOn:
  - apps/starter/sw.mjs
  - apps/starter/pwa/pwa-register.mjs
  - apps/starter/pwa/install-prompt.mjs
owns: The README documentation for the PWA feature slice.
boundaries: Documentation only. Does not own requirement intent (PRD) or execution status (backlog).
invariants: Must accurately reflect the module list, activation steps, and locale key table as the implementation evolves.
risks: Stale README misleads agents into repeating already-implemented steps or missing new modules.
securityPrivacy: Documentation only.
notesForLLM: This README covers PWA activation, module overview, manifest/icons, locale keys, and caching strategy.
linkedDocs:
  - apps/starter/README.md
  - docs/backlog/platform-seams.md
specRefs: TPL-028
related:
  - apps/starter/README.md
  - docs/backlog/platform-seams.md
summary: Directory overview for starter/pwa/.
---

# README.md
