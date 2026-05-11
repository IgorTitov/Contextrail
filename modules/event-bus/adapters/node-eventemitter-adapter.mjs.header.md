---
fileId: contextrail-template:modules:event-bus:adapters:node-eventemitter-adapter
module: modules/event-bus
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: event-bus
summary: Node EventEmitter adapter for the event-bus module. In-process pub/sub.
owns: The Node Eventemitter adapter implementation for the event-bus module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
notesForLLM: Node-only. Use for single-process event bus needs; swap for a networked bus when crossing processes.
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
linkedDocs: modules/event-bus/adapters/README.md
implementsPort: event-bus-port
runtimeEnvironment: node
---

# node-eventemitter-adapter.mjs
