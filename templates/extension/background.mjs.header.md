---
fileId: contextrail-template:templates:extension:background
module: templates/extension
stability: evolving
steward: shared
api: file-local
dependsOn: templates/extension/manifest.json (declares this file as the service_worker)
owns: "Extension background lifecycle: install events, message routing, alarm setup for the scaffold."
boundaries: Must not import from the starter app build output or assume popup.html is open. Background and popup run in separate contexts.
invariants: Must be registered as type module in manifest.json; must not use synchronous blocking operations.
risks: Background service workers auto-terminate after ~30 seconds of inactivity; do not assume persistent state without chrome.storage.
securityPrivacy: Validate all message inputs from chrome.runtime.onMessage before acting; do not trust sender without verification.
notesForLLM: This worker auto-terminates. Persist state via chrome.storage, not in-memory. The popup and background are independent contexts — communicate via chrome.runtime messaging only.
tests: docs/guides/extension.md (manual load-unpacked smoke test)
linkedDocs:
  - docs/guides/extension.md
  - templates/extension/README.md
specRefs: TPL-033
related:
  - templates/extension/popup.html
  - templates/extension/manifest.json
  - docs/guides/extension.md
summary: Background for the extension platform template.
---

# background.mjs
