---
fileId: contextrail-template:modules:knowledge-graph:public-api
module: modules/knowledge-graph
stability: evolving
steward: shared
api: file-local
hexLayer: application
boundedContext: knowledge-graph
dependsOn:
  - modules/knowledge-graph/ports/graph-store-port.mjs
  - modules/knowledge-graph/ports/entity-extractor-port.mjs
  - modules/knowledge-graph/domain/graph-algorithms.mjs
  - modules/knowledge-graph/adapters/memory-graph-adapter.mjs
  - modules/knowledge-graph/adapters/regex-entity-extractor.mjs
  - modules/knowledge-graph/adapters/cooccurrence-relationship-extractor.mjs
summary: Public API facade for the knowledge-graph module — re-exports port assertions, graph algorithms, and adapter factories.
owns: The single cross-module entry point for the knowledge-graph bounded context.
boundaries: This is the only file that other modules may import from this bounded context. Deep imports are forbidden.
invariants: Every public symbol must be explicitly re-exported here.
risks: Adding deep imports that bypass this file breaks the hexagonal boundary.
securityPrivacy: Re-export facade only; no logic or I/O.
notesForLLM: Cross-module consumers import from this file only. Never bypass it with deep imports into domain/, ports/, or adapters/.
tests:
  - tests/unit/knowledge-graph.test.mjs
  - tests/contract/knowledge-graph-hex-contract.test.mjs
linkedDocs:
  - modules/knowledge-graph/README.md
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
  - TPL-121
  - TPL-001
exports:
  - assertEntityExtractorPort
  - assertGraphStorePort
  - assertRelationshipExtractorPort
  - bfsTraverse
  - createCooccurrenceRelationshipExtractor
  - createMemoryGraphAdapter
  - createRegexEntityExtractor
  - findConnectedComponents
  - getLocale
  - registerLocale
  - resetLocale
  - setLocale
  - t
---

# public-api.mjs

