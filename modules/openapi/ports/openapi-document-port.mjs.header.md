---
fileId: contextrail-template:modules:openapi:ports:openapi-document-port
module: modules/openapi
stability: evolving
steward: shared
api: file-local
hexLayer: port
portType: outbound
boundedContext: openapi
owns: The OpenApiDocumentPort contract for adapters that supply an OpenAPI 3 document.
boundaries: Ports define what the host app needs (an OpenAPI document object), not how it is provided.
invariants: assertOpenApiDocumentPort() must throw on non-conforming adapters.
risks: Changing the port shape without updating adapters breaks the contract.
securityPrivacy: Pure contract definitions; no I/O.
notesForLLM: This is the port layer. It defines *what* the host app needs. Adapters provide *how* — pre-built doc, route-registry-driven, file-loaded, etc.
tests: tests/unit/openapi.test.mjs
linkedDocs: modules/openapi/README.md
related:
  - modules/openapi/domain/build-document.mjs
  - modules/openapi/adapters/static-document-adapter.mjs
  - modules/openapi/adapters/route-registry-adapter.mjs
summary: OpenAPI document provider port contract for the openapi module.
allowedDependencies:
  - ./
  - "../messages.*"
  - "../types.*"
forbiddenDependencies:
  - "../adapters/**"
  - "../di/**"
  - react
  - express
  - fastify
  - "node:*"
  - fs
  - path
  - "modules/<other>/**"
portCategory: documentation
contractTests: tests/contract/openapi-hex-contract.test.mjs
---

# openapi-document-port.mjs
