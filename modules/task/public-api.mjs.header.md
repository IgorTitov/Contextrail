---
fileId: contextrail-template:modules:task:public-api
module: modules/task
stability: evolving
steward: shared
api: file-local
hexLayer: application
boundedContext: task
dependsOn:
  - modules/task/ports/task-port.mjs
  - modules/task/domain/task-queue.mjs
  - modules/task/adapters/main-thread-adapter.mjs
  - modules/task/adapters/worker-adapter.mjs
summary: Public API facade for the task module — re-exports port assertion, task queue, and adapter factories.
owns: The single cross-module entry point for the task bounded context.
boundaries: This is the only file that other modules may import from this bounded context. Deep imports are forbidden.
invariants: Every public symbol must be explicitly re-exported here.
risks: Adding deep imports that bypass this file breaks the hexagonal boundary.
securityPrivacy: Re-export facade only; no logic or I/O.
notesForLLM: Cross-module consumers import from this file only. Never bypass it with deep imports into domain/, ports/, or adapters/.
tests:
  - tests/unit/task.test.mjs
  - tests/contract/task-hex-contract.test.mjs
  - tests/bdd/task.test.mjs
specRefs:
  - TPL-001
linkedDocs:
  - modules/task/README.md
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
  - assertTaskPort
  - createMainThreadAdapter
  - createTaskLifecycle
  - createWebWorkerAdapter
  - getLocale
  - registerLocale
  - resetLocale
  - serializeForTransfer
  - setLocale
  - t
---

# public-api.mjs

