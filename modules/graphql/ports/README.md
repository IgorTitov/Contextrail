<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Directory overview for graphql/ports.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# modules/graphql/ports/

Port contracts for the graphql module. Declares `GraphqlTransportPort` so adapters can parse + execute queries over HTTP, WebSocket, IPC, or any other transport without leaking those concerns into the pure domain.
