---
fileId: contextrail-template:modules:openapi:adapters:route-registry-adapter
module: modules/openapi
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: openapi
owns: Route registry OpenAPI adapter — builds the document lazily from a route list and caches it.
boundaries: Adapters implement port contracts. They may use infrastructure but must not leak it into the domain.
invariants: Must satisfy the OpenApiDocumentPort contract validated by assertOpenApiDocumentPort(). The cached document is built exactly once on first call.
risks: Changing the adapter shape without matching the port contract breaks the wiring.
securityPrivacy: Pure data; no I/O.
notesForLLM: Use this adapter when the host app already has a route registry and wants the OpenAPI document derived from it. Calls into the pure domain builder; no infrastructure imports.
tests: tests/unit/openapi.test.mjs
linkedDocs: modules/openapi/README.md
related:
  - modules/openapi/ports/openapi-document-port.mjs
  - modules/openapi/domain/build-document.mjs
  - modules/openapi/adapters/static-document-adapter.mjs
summary: Route-registry-driven OpenAPI document adapter for the openapi module.
allowedDependencies:
  - "../ports/*"
  - "../domain/*"
  - "../messages.*"
  - "../types.*"
  - ./
forbiddenDependencies:
  - "modules/<other>/domain/**"
  - "modules/<other>/application/**"
  - "modules/<other>/adapters/**"
adapterType: in-memory
implementsPort: openapi-document-port
runtimeEnvironment: universal
---

# route-registry-adapter.mjs
