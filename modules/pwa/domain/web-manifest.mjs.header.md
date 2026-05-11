---
fileId: contextrail-template:modules:pwa:web-manifest
module: modules/pwa
stability: experimental
steward: pwa-module
api: Domain
boundedContext: pwa
summary: Pure validator and serializer for W3C Web App Manifest descriptors.
owns: createWebManifest, webManifestToJson.
boundaries: No browser globals, no node:* imports. Input validation only; no I/O.
invariants: createWebManifest returns a frozen descriptor. webManifestToJson emits W3C snake_case keys (short_name, start_url, theme_color, background_color).
specRefs:
  - TPL-001
---

# web-manifest.mjs
