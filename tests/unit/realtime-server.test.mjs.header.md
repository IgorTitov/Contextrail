---
fileId: contextrail-template:tests:unit:realtime-server.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
summary: Unit tests for the server-side wsServerTransport — TransportPort contract, message reception, send semantics, and connection-close handling.
owns: Unit proof of createWsServerTransport adapter — port contract, lifecycle (open/close), message reception via mocked ws-style connection, send (with stringification), and onStateChange.
boundaries: Must import only through modules/realtime/public-api.mjs; must not open real WebSocket connections; uses an in-file mock that emulates the `ws` library's connection interface.
invariants: All imports must go through public-api.mjs; createWsServerTransport must satisfy assertTransportPort; open() must reject when no `connection` option is passed.
risks: Mock connection's setTimeout-driven close emit may interleave unexpectedly with subsequent assertions if not awaited.
notesForLLM: Import exclusively via public-api.mjs. Use the in-file createMockWsConnection helper to drive message and close events. For connection-close behavior, prefer synchronous _emit('close') to avoid timer flakiness.
tests: node --test tests/unit/realtime-server.test.mjs
related: tests/unit/realtime.test.mjs; tests/unit/realtime-transports.test.mjs; tests/contract/realtime-hex-contract.test.mjs
specRefs:
  - TPL-152
  - TPL-218
---

# realtime-server.test.mjs
