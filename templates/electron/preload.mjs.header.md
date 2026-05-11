---
fileId: contextrail-template:templates:electron:preload
module: templates/electron
stability: evolving
steward: shared
api: file-local
dependsOn: templates/electron/main.mjs (references this as preload path)
owns: The contextBridge surface that the renderer sees as window.electronAPI; presence of this object is the environment detection signal.
boundaries: Must not expose raw Node.js APIs, fs, or broad process access. Expose only specific, validated functions needed by the renderer.
invariants: window.electronAPI must always be exposed for starter app environment detection to work; contextBridge must be used (no direct global assignment).
risks: Over-broad API exposure in preload is the primary Electron attack surface. Each new IPC call must be individually validated.
securityPrivacy: Security-critical file. Every field added to electronAPI is an attack surface. Review carefully before adding IPC channels.
notesForLLM: The existence of window.electronAPI is the detection signal — do not rename or remove it. Add only specific typed functions, never expose ipcRenderer directly.
tests:
  - docs/guides/electron.md (manual smoke)
  - environment-detect.mjs checks window.electronAPI existence
linkedDocs:
  - docs/guides/electron.md
  - templates/electron/README.md
specRefs: TPL-033
related:
  - templates/electron/main.mjs
  - docs/guides/electron.md
summary: Preload for the electron platform template.
---

# preload.mjs
