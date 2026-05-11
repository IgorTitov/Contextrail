---
fileId: contextrail-template:modules:example-greeter:public-api
module: modules/example-greeter
stability: evolving
steward: shared
api: Cross-module public API
hexLayer: application
boundedContext: example-greeter
dependsOn:
  - modules/example-greeter/domain/greeter.mjs
  - modules/example-greeter/ports/greeting-port.mjs
  - modules/example-greeter/adapters/default-adapter.mjs
summary: Single entry point for the example-greeter bounded module — re-exports greet(), assertGreetingPort(), and defaultGreetingAdapter.
owns: The single cross-module entry point for the example-greeter bounded context.
boundaries: This is the only file that other modules may import from this bounded context. Deep imports are forbidden.
invariants: Every public symbol must be explicitly re-exported here. No transitive or barrel re-exports of internals.
risks: Adding deep imports that bypass this file breaks the hexagonal boundary.
securityPrivacy: Re-export facade only; no logic or I/O.
notesForLLM: Cross-module consumers import from this file only. Never bypass it with deep imports into domain/, ports/, or adapters/.
tests: tests/unit/example-greeter.test.mjs
linkedDocs:
  - modules/example-greeter/README.md
  - docs/_generated/dependency-graph.json
specRefs: TPL-001
related:
  - modules/example-greeter/domain/greeter.mjs
  - modules/example-greeter/ports/greeting-port.mjs
  - modules/example-greeter/adapters/default-adapter.mjs
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
  - assertGreetingPort
  - defaultGreetingAdapter
  - getLocale
  - greet
  - registerLocale
  - resetLocale
  - setLocale
  - t
---

# public-api.mjs

