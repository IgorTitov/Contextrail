---
fileId: contextrail-template:modules:task:domain:serialize
module: modules/task
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: task
summary: Serialization helpers that detect transferable objects (ArrayBuffer, MessagePort, streams) for structured-clone transfer to Worker threads.
owns: isTransferable check against known transferable type names and payload preparation for postMessage transfer lists.
boundaries: Pure domain logic. No infrastructure dependencies allowed.
invariants: Must remain framework-free and testable in isolation.
allowedDependencies:
  - ./
  - "../ports/*"
  - "../types.*"
forbiddenDependencies:
  - "../adapters/**"
  - "../di/**"
  - react
  - next
  - electron
  - express
  - fastify
  - vite
  - "node:*"
  - fs
  - path
  - "modules/<other>/**"
linkedDocs: modules/task/domain/README.md
---

# serialize.mjs
