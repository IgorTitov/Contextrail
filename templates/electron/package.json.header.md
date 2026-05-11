---
fileId: contextrail-template:templates:electron:package.json.header
module: templates/electron
stability: evolving
steward: shared
api: Documentation
dependsOn: templates/electron/package.json
owns: Structured header metadata for templates/electron/package.json without modifying the JSON body.
boundaries: Must not duplicate or override content from package.json. Must not introduce a second sidecar convention.
invariants: SidecarFor must point to templates/electron/package.json; kept in sync when package.json fields change meaningfully.
risks: Stale sidecar that contradicts actual package.json scripts misleads agents about the build commands available.
securityPrivacy: No secrets. devDependencies version pins matter for reproducibility.
notesForLLM: The key scripts are build:app (runs build-single.mjs electron mode) and start (electron .). The electron devDependency version should stay current for security patches.
tests: scripts/checks/header-check.mjs
linkedDocs:
  - templates/electron/README.md
  - docs/guides/electron.md
specRefs: TPL-033
related:
  - templates/electron/main.mjs
  - templates/electron/preload.mjs
  - docs/guides/electron.md
summary: Package configuration for the electron platform template.
---

# package.json
