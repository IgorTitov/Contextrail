<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Directory overview for graphql/adapters.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# modules/graphql/adapters/

Adapters that implement `GraphqlTransportPort`. Ships a zero-dependency in-memory transport that wraps the pure parser + executor in one call. Real deployments plug an HTTP, WebSocket, or IPC adapter behind the same port.
