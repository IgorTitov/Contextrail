<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Overview and navigation guide for the openapi hex module.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx openapi
@public false
@edit careful -->

# openapi

Hexagonal OpenAPI 3 module — a pure document builder plus a document-provider port and two adapters. Follows the same hexagonal architecture as every other module in this template. Lets the api-starter (or any other host app) expose `/openapi.json` without taking on a YAML toolchain or external swagger parser.

## Why

OpenAPI is a near-universal contract for HTTP APIs. Most templates either hand-write YAML (drift-prone) or pull in heavy generators (`swagger-jsdoc`, `@apidevtools/swagger-parser`, …). This module keeps the contract close to the route registry that already exists in the app, with zero external dependencies, and exposes it through a port so a different builder (e.g. one that reads decorators or filesystem manifests) can be plugged in later behind the same seam.

## Structure

```text
modules/openapi/
├── domain/
│   └── build-document.mjs            # Pure builder: routes → OpenAPI 3 doc
├── ports/
│   └── openapi-document-port.mjs     # OpenApiDocumentPort + assert
├── adapters/
│   ├── static-document-adapter.mjs   # Wraps a pre-built doc object
│   └── route-registry-adapter.mjs    # Builds lazily from a route list
├── public-api.mjs                    # Cross-module entry point
├── messages.mjs                      # i18n keys
└── README.md
```

## Hexagonal layers

| Layer       | Folder            | Rule                                            |
| ----------- | ----------------- | ----------------------------------------------- |
| **Domain**  | `domain/`         | Pure functions, no I/O, no framework deps       |
| **Ports**   | `ports/`          | Document-provider contract                      |
| **Adapters**| `adapters/`       | Static and route-registry-driven providers      |
| **Public**  | `public-api.mjs`  | The only file other modules may import          |

## Usage

### From a route registry (recommended)

```javascript
import {
  createRouteRegistryOpenApiAdapter,
  assertOpenApiDocumentPort,
} from './modules/openapi/public-api.mjs';

const provider = createRouteRegistryOpenApiAdapter({
  info: { title: 'My API', version: '1.0.0', description: 'Example API' },
  servers: [{ url: 'http://localhost:3000', description: 'Local dev' }],
  routes: [
    {
      method: 'GET',
      path: '/health',
      summary: 'Liveness probe',
      tags: ['system'],
      responses: { 200: { description: 'OK' } },
    },
  ],
});

assertOpenApiDocumentPort(provider);

const doc = provider.getDocument();
// JSON.stringify(doc) → valid OpenAPI 3.0.3 document
```

### From a pre-built document

```javascript
import { createStaticOpenApiAdapter } from './modules/openapi/public-api.mjs';

const provider = createStaticOpenApiAdapter({
  openapi: '3.0.3',
  info: { title: 'My API', version: '1.0.0' },
  paths: {},
});
```

### Direct builder access

`buildOpenApiDocument(input)` is exported for callers that want to build the document eagerly without going through an adapter (e.g. tests or build-time spec dumps).

## Rules

- The module is framework-free. Wiring an HTTP route that serves the JSON body is the host app's responsibility (see `apps/api-starter/routes/openapi.mjs` for the canonical example).
- The domain builder does not know about Swagger UI, Redoc, or any specific renderer — it produces the JSON contract only.
- Cross-module consumers import from `public-api.mjs` only. Deep imports are forbidden.

## Tests

- `tests/unit/openapi.test.mjs` — proves builder shape, validation errors, and adapter behavior.
- `tests/contract/openapi-hex-contract.test.mjs` — proves the hex folder structure and public-api surface.
