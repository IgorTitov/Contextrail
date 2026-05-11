<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Directory overview for the ports layer of the openapi module.
@sidecar README.md.header.md
@layer module | @hex port | @ctx openapi
@public false
@edit careful -->

# ports

Port contracts that adapters must satisfy for the openapi module.

## What belongs here

- The `OpenApiDocumentPort` contract and its `assertOpenApiDocumentPort()` validator

## What does not belong here

- Adapters (use adapters/)
- Domain logic (use domain/)

## Related

- `modules/openapi/adapters/`
- `modules/openapi/domain/`
