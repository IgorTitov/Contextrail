---
fileId: contextrail-template:modules:state:public-api
module: modules/state
stability: evolving
steward: shared
api: file-local
hexLayer: application
boundedContext: state
dependsOn:
  - modules/state/ports/state-port.mjs
  - modules/state/domain/state-core.mjs
  - modules/state/adapters/memory-adapter.mjs
  - modules/state/adapters/local-storage-adapter.mjs
summary: Public API facade for the state module — re-exports port assertion, state management utilities, and adapter factories.
owns: The single cross-module entry point for the state bounded context.
boundaries: This is the only file that other modules may import from this bounded context. Deep imports are forbidden.
invariants: Every public symbol must be explicitly re-exported here.
risks: Adding deep imports that bypass this file breaks the hexagonal boundary.
securityPrivacy: Re-export facade only; no logic or I/O.
notesForLLM: Cross-module consumers import from this file only. Never bypass it with deep imports into domain/, ports/, or adapters/.
tests:
  - tests/unit/state.test.mjs
  - tests/contract/state-hex-contract.test.mjs
linkedDocs:
  - modules/state/README.md
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
  - TPL-051
  - TPL-001
exports:
  - assertStatePort
  - createMemoryStateAdapter
  - createPersistentStateAdapter
  - createSqliteStateAdapter
  - getLocale
  - registerLocale
  - resetLocale
  - setLocale
  - t
---

# public-api.mjs

