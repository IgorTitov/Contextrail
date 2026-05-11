---
fileId: contextrail-template:modules:user-preferences:public-api
module: modules/user-preferences
stability: evolving
steward: shared
api: file-local
hexLayer: application
boundedContext: user-preferences
dependsOn:
  - modules/user-preferences/ports/storage-port.mjs
  - modules/user-preferences/domain/preferences.mjs
  - modules/user-preferences/adapters/memory-adapter.mjs
  - modules/user-preferences/adapters/local-storage-adapter.mjs
  - modules/user-preferences/adapters/indexeddb-adapter.mjs
summary: Public API facade for the user-preferences module — re-exports port assertion, preference defaults/merge, and adapter factories.
owns: The single cross-module entry point for the user-preferences bounded context.
boundaries: This is the only file that other modules may import from this bounded context. Deep imports are forbidden.
invariants: Every public symbol must be explicitly re-exported here.
risks: Adding deep imports that bypass this file breaks the hexagonal boundary.
securityPrivacy: Re-export facade only; no logic or I/O.
notesForLLM: Cross-module consumers import from this file only. Never bypass it with deep imports into domain/, ports/, or adapters/.
tests:
  - tests/unit/user-preferences.test.mjs
  - tests/contract/user-preferences-hex-contract.test.mjs
specRefs:
  - TPL-001
linkedDocs:
  - modules/user-preferences/README.md
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
  - assertStoragePort
  - createIndexedDBAdapter
  - createLocalStorageAdapter
  - createMemoryAdapter
  - defaultPreferences
  - getLocale
  - isValidPreferences
  - mergePreferences
  - registerLocale
  - resetLocale
  - setLocale
  - t
---

# public-api.mjs

