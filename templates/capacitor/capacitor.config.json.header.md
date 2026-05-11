---
fileId: contextrail-template:templates:capacitor:capacitor.config.json.header
module: templates/capacitor
stability: evolving
steward: shared
api: Documentation
dependsOn: templates/capacitor/capacitor.config.json
owns: Structured header metadata for templates/capacitor/capacitor.config.json without modifying the JSON body.
boundaries: Must not duplicate or override capacitor.config.json fields. Must not introduce a second sidecar convention.
invariants: SidecarFor must point to templates/capacitor/capacitor.config.json; kept in sync when config fields change meaningfully.
risks: Stale sidecar with wrong webDir or appId misleads agents; webDir must match the actual build output directory.
securityPrivacy: appId follows reverse-DNS convention. Replace com.example.{{PROJECT_NAME}} before publishing to app stores.
notesForLLM: "webDir must point to the actual build output (default: dist). appId and appName use {{PROJECT_NAME}} placeholder — replace before npx cap init. androidScheme https is required for Capacitor 4+."
tests: scripts/checks/header-check.mjs
linkedDocs:
  - templates/capacitor/README.md
  - docs/guides/platforms.md
specRefs: TPL-033
related:
  - templates/capacitor/README.md
  - docs/guides/platforms.md
summary: Capacitor.Config configuration for the capacitor platform template.
---

# capacitor.config.json
