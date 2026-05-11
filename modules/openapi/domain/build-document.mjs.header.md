---
fileId: contextrail-template:modules:openapi:domain:build-document
module: modules/openapi
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: openapi
owns: Pure builder that turns a route registry into an OpenAPI 3.0.3 document.
boundaries: Domain must stay framework-free. No imports from adapters, ports, or infrastructure.
invariants: buildOpenApiDocument() is a pure function — same inputs always produce the same output and never perform I/O.
risks: Adding framework or infrastructure deps here breaks the hexagonal boundary.
securityPrivacy: Pure computation only; no I/O.
notesForLLM: This is the innermost hex layer. The output is a plain JSON-serializable object that downstream tools (Swagger UI, Redoc, openapi-generator) can consume directly.
tests: tests/unit/openapi.test.mjs
linkedDocs: modules/openapi/README.md
related:
  - modules/openapi/public-api.mjs
  - modules/openapi/ports/openapi-document-port.mjs
summary: Pure OpenAPI 3 document builder for the openapi module.
allowedDependencies:
  - ./
  - "../ports/*"
  - "../messages.*"
  - "../types.*"
forbiddenDependencies:
  - "../adapters/**"
  - "../di/**"
  - react
  - next
  - express
  - fastify
  - vite
  - "node:*"
  - fs
  - path
  - "modules/<other>/**"
---

# build-document.mjs
