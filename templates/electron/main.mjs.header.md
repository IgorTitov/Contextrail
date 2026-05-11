---
fileId: contextrail-template:templates:electron:main
module: templates/electron
stability: evolving
steward: shared
api: file-local
dependsOn:
  - templates/electron/preload.mjs
  - templates/electron/package.json
  - dist/index.html (produced by build:electron)
owns: BrowserWindow lifecycle, app startup, and platform-specific window close behavior for the Electron scaffold.
boundaries: Must not contain business logic, import starter app internals, or act as a build script. Window configuration and IPC handler wiring only.
invariants: contextIsolation must remain true and nodeIntegration must remain false; preload path must stay aligned with preload.mjs.
risks: Loosening contextIsolation or nodeIntegration exposes the renderer to Node.js APIs and creates security vulnerabilities.
securityPrivacy: Must not log sensitive runtime data. contextIsolation and nodeIntegration settings are security-critical.
notesForLLM: This file owns window creation only. IPC handlers go here when needed but must validate all inputs. Do not relax contextIsolation or nodeIntegration. Preload path is relative to __dirname.
tests:
  - templates/electron/README.md (manual smoke test steps)
  - docs/guides/electron.md
linkedDocs:
  - docs/guides/electron.md
  - templates/electron/README.md
specRefs: TPL-033
related:
  - templates/electron/preload.mjs
  - templates/electron/package.json
  - docs/guides/electron.md
summary: Main for the electron platform template.
---

# main.mjs
