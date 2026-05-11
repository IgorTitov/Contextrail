---
fileId: contextrail-template:apps:api-starter:routes:pwa
module: apps/api-starter
stability: experimental
steward: api-starter
api: Route
boundedContext: api-starter
summary: HTTP route handlers that expose the pwa module's manifest.webmanifest and sw.js via the api-starter.
owns: pwaManifestHandler, pwaServiceWorkerHandler.
boundaries: Thin wiring only — domain logic stays in modules/pwa. Returns raw responses via the RAW_RESPONSE symbol.
invariants: Manifest and service worker are generated once per process and cached in the pwaAssets port. Content types match W3C and MDN expectations.
specRefs:
  - TPL-001
---

# pwa.mjs
