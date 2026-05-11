---
fileId: contextrail-template:modules:realtime:adapters:long-polling-transport
module: modules/realtime
stability: evolving
transport: http/rest
steward: shared
api: file-local
hexLayer: adapter
boundedContext: realtime
summary: HTTP long-polling fallback transport for the realtime module.
owns: The Long Polling Transport adapter implementation for the realtime module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
notesForLLM: "Use when WebSocket and SSE are unavailable (legacy proxies, restricted networks). Highest latency of the transports."
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
adapterType: infrastructure
specRefs: TPL-151
linkedDocs: modules/realtime/adapters/README.md
---

# long-polling-transport.mjs
