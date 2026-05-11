---
fileId: contextrail-template:apps:starter:manifest.json
module: apps/starter
stability: evolving
steward: human
api: JSON manifest file
dependsOn: apps/starter/manifest.json
owns: PWA metadata (name, short_name, start_url, scope, display, orientation, theme_color, icons).
boundaries: Must be valid JSON. Must not contain application logic. Icon paths must resolve relative to the HTML entry point.
invariants: Must include icons for both 192x192 and 512x512; theme_color must match index.html meta theme-color.
risks: theme_color drift from index.html meta tag produces inconsistent splash screen color; broken icon paths cause manifest validation failure in browser DevTools.
securityPrivacy: No secrets; public manifest.
notesForLLM: The manifest is linked from index.html via rel=manifest. Icon paths are relative to the manifest location (same directory as index.html). This file uses a sidecar because JSON does not support inline comments.
tests: tests/unit/pwa-manifest.test.mjs
linkedDocs:
  - apps/starter/pwa/README.md
  - docs/backlog/platform-seams.md
specRefs: TPL-026
related:
  - apps/starter/index.html
  - docs/backlog/platform-seams.md
summary: Manifest for the starter app.
---

# manifest.json
