---
fileId: contextrail-template:modules:realtime:adapters:websocket-transport
module: modules/realtime
stability: evolving
transport: websocket
steward: shared
api: file-local
hexLayer: adapter
boundedContext: realtime
summary: WebSocket transport adapter for the realtime module. Bidirectional full-duplex channel.
owns: The Websocket Transport adapter implementation for the realtime module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
notesForLLM: "Use when the server supports WS and both directions are needed. Falls back handled at the transport-manager level, not here."
allowedDependencies:
  - "../ports/*"
  - "../types.*"
  - ./
  - "frameworks as needed (react, express, node: builtins)"
forbiddenDependencies:
  - "../domain/**"
  - "../application/**"
  - "modules/<other>/domain/**"
  - "modules/<other>/application/**"
  - "modules/<other>/adapters/**"
adapterType: network
specRefs: TPL-149
linkedDocs: modules/realtime/adapters/README.md
---

# websocket-transport.mjs
