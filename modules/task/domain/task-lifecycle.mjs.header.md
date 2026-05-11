---
fileId: contextrail-template:modules:task:domain:task-lifecycle
module: modules/task
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: task
summary: State machine that enforces valid task status transitions (pending -> running -> completed/failed/cancelled) with transition callbacks.
owns: createTaskLifecycle factory, VALID_TRANSITIONS map, TERMINAL_STATES set, and onTransition observer hook.
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

# task-lifecycle.mjs
