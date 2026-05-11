---
fileId: contextrail-template:modules:realtime:public-api
module: modules/realtime
stability: evolving
steward: shared
api: file-local
hexLayer: application
boundedContext: realtime
dependsOn:
  - modules/realtime/ports/transport-port.mjs
  - modules/realtime/domain/transport-manager.mjs
  - modules/realtime/adapters/websocket-adapter.mjs
  - modules/realtime/adapters/sse-adapter.mjs
  - modules/realtime/adapters/webrtc-data-adapter.mjs
summary: Public API facade for the realtime module — re-exports port assertion, transport manager, and adapter factories.
owns: The single cross-module entry point for the realtime bounded context.
boundaries: This is the only file that other modules may import from this bounded context. Deep imports are forbidden.
invariants: Every public symbol must be explicitly re-exported here.
risks: Adding deep imports that bypass this file breaks the hexagonal boundary.
securityPrivacy: Re-export facade only; no logic or I/O.
notesForLLM: Cross-module consumers import from this file only. Never bypass it with deep imports into domain/, ports/, or adapters/.
tests:
  - tests/unit/realtime.test.mjs
  - tests/contract/realtime-hex-contract.test.mjs
  - tests/bdd/realtime.test.mjs
specRefs:
  - TPL-001
linkedDocs:
  - modules/realtime/README.md
  - docs/_generated/dependency-graph.json
allowedDependencies:
  - "./domain/*"
  - "./application/*"
  - "./ports/*"
  - "./adapters/*"
  - "./messages.*"
  - "./types.*"
forbiddenDependencies:
  - "modules/<other>/domain/**"
  - "modules/<other>/application/**"
  - "modules/<other>/ports/**"
  - "modules/<other>/adapters/**"
  - react
  - express
  - fastify
  - "node:*"
exports:
  - assertRealtimePort
  - assertTransportPort
  - ConnectionStates
  - createConnectionStateMachine
  - createHeartbeat
  - createLongPollingTransport
  - createReconnectionStrategy
  - createSseTransport
  - createTransportManager
  - createWebRtcTransport
  - createWebSocketTransport
  - createWsServerTransport
  - getLocale
  - registerLocale
  - resetLocale
  - setLocale
  - t
---

# public-api.mjs

