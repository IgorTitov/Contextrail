---
fileId: contextrail-template:modules:feature-seams:public-api
module: modules/feature-seams
stability: evolving
steward: shared
api: file-local
hexLayer: application
boundedContext: feature-seams
dependsOn:
  - modules/feature-seams/domain/seam-registry.mjs
  - modules/feature-seams/domain/guards.mjs
  - modules/feature-seams/ports/seam-port.mjs
  - modules/feature-seams/adapters/memory-seam-adapter.mjs
  - modules/feature-seams/adapters/config-seam-adapter.mjs
summary: Public API facade for the feature-seams module — re-exports seam states, guards, port assertion, and adapter factories.
owns: The single cross-module entry point for the feature-seams bounded context.
boundaries: This is the only file that other modules may import from this bounded context. Deep imports are forbidden.
invariants: Every public symbol must be explicitly re-exported here.
risks: Adding deep imports that bypass this file breaks the hexagonal boundary.
securityPrivacy: Re-export facade only; no logic or I/O.
notesForLLM: Cross-module consumers import from this file only. Never bypass it with deep imports into domain/, ports/, or adapters/.
tests:
  - tests/unit/feature-seams.test.mjs
  - tests/contract/feature-seams-hex-contract.test.mjs
  - tests/bdd/feature-seams.test.mjs
linkedDocs:
  - modules/feature-seams/README.md
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
  - TPL-042
  - TPL-001
exports:
  - assertHealthPort
  - assertSeamPort
  - createConfigSeamAdapter
  - createDivergenceTracker
  - createHealthAdapter
  - createMemorySeamAdapter
  - getLocale
  - ifEnabled
  - registerLocale
  - resetLocale
  - SEAM_STATES
  - setLocale
  - t
  - whenEnabled
  - whenShadow
---

# public-api.mjs

