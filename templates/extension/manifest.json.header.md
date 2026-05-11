---
fileId: contextrail-template:templates:extension:manifest.json.header
module: templates/extension
stability: evolving
steward: shared
api: Documentation
dependsOn: templates/extension/manifest.json
owns: Structured header metadata for templates/extension/manifest.json without modifying the JSON body.
boundaries: Must not duplicate or override manifest.json fields. Must not introduce a second sidecar convention.
invariants: SidecarFor must point to templates/extension/manifest.json; kept in sync when manifest fields change meaningfully.
risks: Stale sidecar that contradicts actual manifest permissions or CSP settings misleads agents about the extension's runtime constraints.
securityPrivacy: The CSP and permissions fields in manifest.json are security-critical. Keep sidecar notes aligned if they change.
notesForLLM: manifest_version must stay 3. The background.service_worker path must match templates/extension/background.mjs. The storage permission enables chrome.storage.local use.
tests: scripts/checks/header-check.mjs
linkedDocs:
  - templates/extension/README.md
  - docs/guides/extension.md
specRefs: TPL-033
related:
  - templates/extension/background.mjs
  - templates/extension/popup.html
  - docs/guides/extension.md
summary: Manifest configuration for the extension platform template.
---

# manifest.json
