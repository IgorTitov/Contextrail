---
fileId: contextrail-template:modules:realtime:adapters:ws-server-transport
module: modules/realtime
stability: evolving
transport: websocket
steward: shared
api: file-local
hexLayer: adapter
boundedContext: realtime
summary: Server-side WebSocket adapter for the realtime module.
owns: The Ws Server Transport adapter implementation for the realtime module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
notesForLLM: Node-only. Use on the server to accept WS connections and route them through the realtime port.
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
linkedDocs: modules/realtime/adapters/README.md
---

# ws-server-transport.mjs
