<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Directory overview for the domain layer of the openapi module.
@sidecar README.md.header.md
@layer module | @hex domain | @ctx openapi
@public false
@edit careful -->

# domain

Pure domain logic for the openapi module — no I/O, no framework imports.

## What belongs here

- The pure `buildOpenApiDocument()` builder

## What does not belong here

- Adapters (use adapters/)
- Port definitions (use ports/)

## Related

- `modules/openapi/ports/`
- `modules/openapi/adapters/`
