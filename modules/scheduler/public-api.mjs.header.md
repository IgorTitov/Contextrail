---
fileId: contextrail-template:modules:scheduler:public-api
module: modules/scheduler
stability: evolving
steward: shared
api: file-local
hexLayer: application
boundedContext: scheduler
dependsOn:
  - modules/scheduler/ports/scheduler-port.mjs
  - modules/scheduler/domain/scheduler-utils.mjs
  - modules/scheduler/adapters/interval-adapter.mjs
  - modules/scheduler/adapters/idle-adapter.mjs
  - modules/scheduler/adapters/visibility-aware-adapter.mjs
summary: Public API facade for the scheduler module — re-exports port assertion, scheduling utilities, and adapter factories.
owns: The single cross-module entry point for the scheduler bounded context.
boundaries: This is the only file that other modules may import from this bounded context. Deep imports are forbidden.
invariants: Every public symbol must be explicitly re-exported here.
risks: Adding deep imports that bypass this file breaks the hexagonal boundary.
securityPrivacy: Re-export facade only; no logic or I/O.
notesForLLM: Cross-module consumers import from this file only. Never bypass it with deep imports into domain/, ports/, or adapters/.
tests:
  - tests/unit/scheduler.test.mjs
  - tests/contract/scheduler-hex-contract.test.mjs
specRefs:
  - TPL-001
linkedDocs:
  - modules/scheduler/README.md
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
  - addJitter
  - assertSchedulerPort
  - createIdleAdapter
  - createIntervalAdapter
  - createVisibilityAwareAdapter
  - getLocale
  - parseCronLike
  - registerLocale
  - resetLocale
  - setLocale
  - t
---

# public-api.mjs

