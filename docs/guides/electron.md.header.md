---
fileId: contextrail-template:docs:guides:electron
module: docs/guides
stability: evolving
steward: shared
api: Documentation
dependsOn:
  - templates/electron/main.mjs
  - templates/electron/preload.mjs
  - templates/electron/package.json
  - docs/guides/platforms.md
summary: "Full guide for wrapping the starter app as an Electron desktop application: setup, architecture, IPC extension patterns, and security requirements."
owns: "Canonical Electron integration guide: scaffold setup, contextIsolation architecture, IPC extension patterns, distribution, and security notes."
boundaries: Must not duplicate the brief scaffold README in templates/electron/README.md beyond a quick-start summary. Full depth belongs here.
invariants: Security notes (contextIsolation:true, nodeIntegration:false) must always be present and accurate. IPC examples must validate inputs in the main process.
risks: Incorrect security guidance (loosening contextIsolation) could be copied into real projects. Keep security section authoritative.
securityPrivacy: The security notes section is load-bearing. contextIsolation and nodeIntegration settings must never be weakened in examples.
notesForLLM: The detection chain (preload exposes window.electronAPI -> app-config.mjs detectMode -> adapter-factory selects indexedDB) is the core integration pattern. IPC examples must show input validation in main.mjs. Do not show ipcRenderer being exposed directly in preload examples.
tests: templates/electron/README.md (manual smoke test)
linkedDocs:
  - templates/electron/README.md
  - docs/guides/platforms.md
  - docs/guides/deployment.md
specRefs: TPL-034
related:
  - templates/electron/main.mjs
  - templates/electron/preload.mjs
  - docs/guides/platforms.md
  - docs/guides/deployment.md
  - docs/guides/README.md
---

# electron.md
