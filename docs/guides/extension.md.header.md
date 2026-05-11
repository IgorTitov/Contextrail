---
fileId: contextrail-template:docs:guides:extension
module: docs/guides
stability: evolving
steward: shared
api: Documentation
dependsOn:
  - templates/extension/manifest.json
  - templates/extension/background.mjs
  - templates/extension/popup.html
  - docs/guides/platforms.md
summary: "Full guide for wrapping the starter app as a Manifest V3 browser extension: setup, structure, storage, background worker patterns, and Firefox compatibility."
owns: "Canonical browser extension integration guide: scaffold usage, Manifest V3 architecture, storage options, background worker lifecycle, and Firefox compatibility notes."
boundaries: Must not duplicate the brief scaffold README in templates/extension/README.md beyond a quick-start summary. Must not document non-MV3 extension formats.
invariants: The storage adapter code example must implement the StoragePort contract signature. MV3 CSP constraints (no inline scripts) must be documented accurately.
risks: Incorrect storage adapter example that breaks the StoragePort contract causes runtime failures. Background worker 30-second termination must be documented to prevent lost-state bugs.
securityPrivacy: MV3 CSP rules and chrome.storage.local usage guidance must be accurate. Permissions declared in manifest.json must match documented capabilities.
notesForLLM: The chrome.storage adapter example must follow the StoragePort interface (load/save/init). Background service worker auto-terminates — this must be prominently documented. Firefox MV3 has minor manifest differences (scripts array vs service_worker key).
tests: templates/extension/README.md (manual load-unpacked smoke test)
linkedDocs:
  - templates/extension/README.md
  - docs/guides/platforms.md
  - docs/guides/deployment.md
specRefs: TPL-034
related:
  - templates/extension/manifest.json
  - templates/extension/background.mjs
  - templates/extension/popup.html
  - docs/guides/platforms.md
  - docs/guides/README.md
---

# extension.md
