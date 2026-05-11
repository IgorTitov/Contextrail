---
fileId: contextrail-template:tests:unit:realtime.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
summary: Unit tests for the realtime module — domain layer (state machine, reconnection, heartbeat, port assertions).
owns: Unit proof of realtime domain logic (ConnectionStates, createConnectionStateMachine, createReconnectionStrategy, createHeartbeat) and port-contract validation (assertRealtimePort, assertTransportPort).
boundaries: Must import only through modules/realtime/public-api.mjs; must not open real network sockets or WebSocket connections; this file covers domain logic only — transport adapter behavior lives in realtime-transports.test.mjs and the server-side wsServerTransport in realtime-server.test.mjs.
invariants: All imports must go through public-api.mjs; assertRealtimePort and assertTransportPort must throw on any adapter missing required methods; state machine tests must cover all defined ConnectionStates transitions.
risks: Timer-based reconnection or heartbeat tests may produce flaky results if fake timers are not used consistently.
notesForLLM: Import exclusively via public-api.mjs. Use mock transport objects that satisfy assertTransportPort rather than real WebSocket or SSE connections. For reconnection and heartbeat timing, prefer fake/mock timers to avoid real-time delays in CI.
tests: node --test tests/unit/realtime.test.mjs
related: tests/unit/realtime-transports.test.mjs; tests/unit/realtime-server.test.mjs; tests/contract/realtime-hex-contract.test.mjs
specRefs:
  - TPL-148
  - TPL-149
  - TPL-150
  - TPL-151
  - TPL-152
  - TPL-153
  - TPL-218
---

# realtime.test.mjs
