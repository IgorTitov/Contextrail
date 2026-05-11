---
fileId: contextrail-template:templates:electron:README
module: templates/electron
stability: evolving
steward: shared
api: Documentation
dependsOn:
  - templates/electron/main.mjs
  - templates/electron/preload.mjs
  - templates/electron/package.json
  - docs/guides/electron.md
owns: Entry-level usage documentation for the Electron scaffold directory.
boundaries: Must not duplicate the full guide from docs/guides/electron.md. Should stay short and link to the full guide.
invariants: Build commands listed here must stay in sync with package.json scripts and build-single.mjs behavior.
risks: Stale build commands send users down broken paths. Keep commands aligned with package.json and scripts/build-single.mjs.
securityPrivacy: No secrets.
notesForLLM: Keep instructions in sync with package.json scripts. The full guide is at docs/guides/electron.md — do not replicate it here.
linkedDocs:
  - docs/guides/electron.md
  - templates/electron/main.mjs
  - templates/electron/preload.mjs
specRefs: TPL-033
related:
  - templates/electron/main.mjs
  - templates/electron/preload.mjs
  - templates/electron/package.json
  - docs/guides/electron.md
summary: Setup and deployment guide for the electron platform template.
---

# README.md
