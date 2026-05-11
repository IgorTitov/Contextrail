---
fileId: contextrail-template:templates:extension:popup
module: templates/extension
stability: evolving
steward: shared
api: file-local
dependsOn:
  - dist/app.mjs (starter app build output copied alongside manifest.json)
  - templates/extension/manifest.json
owns: Popup dimensions, DOM shell, and initApp wiring for the extension popup UI.
boundaries: Must not use inline scripts other than type=module imports (MV3 CSP forbids inline scripts). Must not reference absolute paths.
invariants: Popup width/height must be set via CSS on body; app.mjs import path must match the build output structure.
risks: Inline scripts or eval in popup.html will be blocked by Manifest V3 CSP and silently break the extension.
securityPrivacy: MV3 CSP applies. No inline event handlers, no eval, no remote script sources.
notesForLLM: The starter app must be built with pnpm build:local and its output copied alongside this file. app.mjs path is relative. Popup closes on focus loss — state must be persisted externally.
tests: docs/guides/extension.md (manual load-unpacked smoke test)
linkedDocs:
  - docs/guides/extension.md
  - templates/extension/README.md
specRefs: TPL-033
related:
  - templates/extension/background.mjs
  - templates/extension/manifest.json
  - docs/guides/extension.md
summary: HTML entry point for the extension platform template.
---

# popup.html
