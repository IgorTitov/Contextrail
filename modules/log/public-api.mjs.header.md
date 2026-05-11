---
fileId: contextrail-template:modules:log:public-api
module: modules/log
stability: evolving
steward: shared
api: file-local
hexLayer: application
boundedContext: log
dependsOn:
  - modules/log/ports/log-port.mjs
  - modules/log/domain/log-levels.mjs
  - modules/log/adapters/console-adapter.mjs
  - modules/log/adapters/http-adapter.mjs
summary: Public API facade for the log module — re-exports port assertion, log-level utilities, and adapter factories.
owns: The single cross-module entry point for the log bounded context.
boundaries: This is the only file that other modules may import from this bounded context. Deep imports are forbidden.
invariants: Every public symbol must be explicitly re-exported here.
risks: Adding deep imports that bypass this file breaks the hexagonal boundary.
securityPrivacy: Re-export facade only; no logic or I/O.
notesForLLM: Cross-module consumers import from this file only. Never bypass it with deep imports into domain/, ports/, or adapters/.
tests:
  - tests/unit/log.test.mjs
  - tests/contract/log-hex-contract.test.mjs
specRefs:
  - TPL-001
linkedDocs:
  - modules/log/README.md
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
  - assertLogPort
  - createConsoleAdapter
  - createFileLogAdapter
  - createNoOpAdapter
  - createRemoteAdapter
  - createStructuredJsonAdapter
  - getLocale
  - LOG_LEVEL_PRIORITY
  - registerLocale
  - resetLocale
  - setLocale
  - shouldLog
  - t
---

# public-api.mjs

