---
fileId: contextrail-template:apps:api-starter:routes:prerender
module: apps/api-starter
stability: experimental
steward: api-starter-app
api: Route
boundedContext: api-starter
summary: Prerender demo route — runs a sequential prerender over a small demo manifest via an inline render function that delegates to the host router.
owns: prerenderRunHandler and prerenderOutputHandler.
boundaries: App-layer route. Imports from prerender public-api only and relies on ctx.prerenderRoutes provided by startServer.
invariants: The demo manifest describes live api-starter routes so the runner can always produce valid HTML for the default pass.
specRefs:
  - TPL-001
---

# prerender.mjs
