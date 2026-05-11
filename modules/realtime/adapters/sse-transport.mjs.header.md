---
fileId: contextrail-template:modules:realtime:adapters:sse-transport
module: modules/realtime
stability: evolving
transport: sse
steward: shared
api: file-local
hexLayer: adapter
boundedContext: realtime
summary: Server-Sent Events adapter for the realtime module. One-way server→client streaming.
owns: The Sse Transport adapter implementation for the realtime module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
notesForLLM: Use when only server→client streaming is needed. Simpler than WebSocket but cannot push client→server.
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
specRefs: TPL-150
linkedDocs: modules/realtime/adapters/README.md
---

# sse-transport.mjs
