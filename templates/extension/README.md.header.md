---
fileId: contextrail-template:templates:extension:README
module: templates/extension
stability: evolving
steward: shared
api: Documentation
dependsOn:
  - templates/extension/manifest.json
  - templates/extension/background.mjs
  - templates/extension/popup.html
  - docs/guides/extension.md
owns: Entry-level usage documentation for the browser extension scaffold directory.
boundaries: Must not duplicate the full guide from docs/guides/extension.md. Should stay short and link to the full guide.
invariants: Build commands must stay in sync with pnpm scripts and the build output structure expected by the extension.
risks: Stale instructions that reference wrong build commands or directory layout will break the load-unpacked flow.
securityPrivacy: No secrets.
notesForLLM: The full guide is at docs/guides/extension.md. Keep the build command (pnpm build:local) and directory assembly steps in sync with the actual build output structure.
linkedDocs:
  - docs/guides/extension.md
  - templates/extension/manifest.json
specRefs: TPL-033
related:
  - templates/extension/manifest.json
  - templates/extension/background.mjs
  - templates/extension/popup.html
  - docs/guides/extension.md
summary: Setup and deployment guide for the extension platform template.
---

# README.md
