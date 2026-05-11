---
fileId: contextrail-template:modules:openapi:public-api
module: modules/openapi
stability: evolving
steward: shared
api: Cross-module public API
hexLayer: application
boundedContext: openapi
dependsOn:
  - modules/openapi/domain/build-document.mjs
  - modules/openapi/ports/openapi-document-port.mjs
  - modules/openapi/adapters/static-document-adapter.mjs
  - modules/openapi/adapters/route-registry-adapter.mjs
summary: Single entry point for the openapi bounded module — re-exports buildOpenApiDocument(), assertOpenApiDocumentPort(), createStaticOpenApiAdapter(), and createRouteRegistryOpenApiAdapter().
owns: The single cross-module entry point for the openapi bounded context.
boundaries: This is the only file that other modules may import from this bounded context. Deep imports are forbidden.
invariants: Every public symbol must be explicitly re-exported here. No transitive or barrel re-exports of internals.
risks: Adding deep imports that bypass this file breaks the hexagonal boundary.
securityPrivacy: Re-export facade only; no logic or I/O.
notesForLLM: Cross-module consumers import from this file only. Never bypass it with deep imports into domain/, ports/, or adapters/.
tests: tests/unit/openapi.test.mjs
linkedDocs:
  - modules/openapi/README.md
  - docs/_generated/dependency-graph.json
specRefs: TPL-001
related:
  - modules/openapi/domain/build-document.mjs
  - modules/openapi/ports/openapi-document-port.mjs
  - modules/openapi/adapters/static-document-adapter.mjs
  - modules/openapi/adapters/route-registry-adapter.mjs
allowedDependencies:
  - "./domain/*"
  - "./application/*"
  - "./ports/*"
  - "./adapters/*"
  - "./messages.*"
  - "./types.*"
forbiddenDependencies:
  - "modules/<other>/domain/**"
  - "modules/<other>/application/**"
  - "modules/<other>/ports/**"
  - "modules/<other>/adapters/**"
  - react
  - express
  - fastify
  - "node:*"
exports:
  - assertOpenApiDocumentPort
  - buildOpenApiDocument
  - createRouteRegistryOpenApiAdapter
  - createStaticOpenApiAdapter
  - getLocale
  - registerLocale
  - resetLocale
  - setLocale
  - t
---

# public-api.mjs
