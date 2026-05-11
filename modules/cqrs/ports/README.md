<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Directory overview for cqrs/ports.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# modules/cqrs/ports/

Port contracts for the cqrs module. Defines `CommandBusPort` (register/dispatch/clear), `QueryBusPort` (register/ask/clear), and `EventStorePort` (append/load/loadAll/subscribe/clear) plus their runtime assertion helpers. Adapters live in `../adapters/`.
