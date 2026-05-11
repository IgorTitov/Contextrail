---
fileId: contextrail-template:modules:state:domain:store
module: modules/state
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: state
summary: Minimal observable store with getState, setState (value or updater function), subscribe with unsubscribe handle, and subscriber count.
owns: createStore factory that manages an in-memory state value and a Set of listener callbacks notified on every state change.
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
specRefs: TPL-048
linkedDocs: modules/state/domain/README.md
---

# store.mjs
