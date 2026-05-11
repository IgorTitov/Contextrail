---
fileId: contextrail-template:modules:openapi:adapters:static-document-adapter
module: modules/openapi
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: openapi
owns: Static OpenAPI document adapter that wraps a pre-built document object.
boundaries: Adapters implement port contracts. They may use infrastructure but must not leak it into the domain.
invariants: Must satisfy the OpenApiDocumentPort contract validated by assertOpenApiDocumentPort().
risks: Changing the adapter shape without matching the port contract breaks the wiring.
securityPrivacy: Pure data; no I/O.
notesForLLM: Use this adapter when the OpenAPI document is built once at startup or loaded from disk by the host app.
tests: tests/unit/openapi.test.mjs
linkedDocs: modules/openapi/README.md
related:
  - modules/openapi/ports/openapi-document-port.mjs
  - modules/openapi/adapters/route-registry-adapter.mjs
summary: Static OpenAPI document adapter for the openapi module.
allowedDependencies:
  - "../ports/*"
  - "../messages.*"
  - "../types.*"
  - ./
forbiddenDependencies:
  - "../domain/**"
  - "modules/<other>/domain/**"
  - "modules/<other>/application/**"
  - "modules/<other>/adapters/**"
adapterType: in-memory
implementsPort: openapi-document-port
runtimeEnvironment: universal
---

# static-document-adapter.mjs
