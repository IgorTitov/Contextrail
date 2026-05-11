<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Directory overview for the adapters layer of the openapi module.
@sidecar README.md.header.md
@layer module | @hex adapter | @ctx openapi
@public false
@edit careful -->

# adapters

Concrete adapter implementations satisfying the `OpenApiDocumentPort` contract.

## What belongs here

- `static-document-adapter.mjs` — wraps a pre-built OpenAPI document object
- `route-registry-adapter.mjs` — builds the document lazily from a route list and caches it

## What does not belong here

- Domain logic (use domain/)
- Port definitions (use ports/)

## Related

- `modules/openapi/ports/`
