---
fileId: contextrail-template:apps:api-starter:routes:openapi
module: apps/api-starter
stability: evolving
steward: shared
api: file-local
boundedContext: api-starter
summary: OpenAPI document route handler — returns the wired OpenAPI 3 document.
owns: The /openapi.json route handler for the api-starter app shell.
boundaries: Route handler only. Document construction and the OpenApiDocumentPort wiring live in app.mjs and modules/openapi/.
invariants: Returns whatever ctx.openapi.getDocument() supplies; never builds the document inline.
notesForLLM: This handler is the canonical example of consuming the openapi module from a host app. The document object is JSON-serializable and is rendered by the default sendJson responder in app.mjs.
tests: tests/unit/api-starter-openapi-route.test.mjs
linkedDocs: apps/api-starter/README.md
related:
  - apps/api-starter/app.mjs
  - modules/openapi/public-api.mjs
specRefs:
  - TPL-001
---

# openapi.mjs
