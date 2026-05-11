---
fileId: contextrail-template:modules:event-bus:public-api
module: modules/event-bus
stability: evolving
steward: shared
api: file-local
hexLayer: application
boundedContext: event-bus
dependsOn:
  - modules/event-bus/ports/event-bus-port.mjs
  - modules/event-bus/domain/event-bus.mjs
  - modules/event-bus/adapters/in-memory-adapter.mjs
  - modules/event-bus/adapters/broadcast-channel-adapter.mjs
summary: Public API facade for the event-bus module — re-exports port assertion and adapter factories.
owns: The single cross-module entry point for the event-bus bounded context.
boundaries: This is the only file that other modules may import from this bounded context. Deep imports are forbidden.
invariants: Every public symbol must be explicitly re-exported here.
risks: Adding deep imports that bypass this file breaks the hexagonal boundary.
securityPrivacy: Re-export facade only; no logic or I/O.
notesForLLM: Cross-module consumers import from this file only. Never bypass it with deep imports into domain/, ports/, or adapters/.
tests:
  - tests/unit/event-bus.test.mjs
  - tests/contract/event-bus-hex-contract.test.mjs
linkedDocs:
  - modules/event-bus/README.md
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
specRefs:
  - TPL-046
  - TPL-001
exports:
  - assertEventBusPort
  - createMemoryEventBus
  - createNodeEventBus
  - getLocale
  - registerLocale
  - resetLocale
  - setLocale
  - t
---

# public-api.mjs

