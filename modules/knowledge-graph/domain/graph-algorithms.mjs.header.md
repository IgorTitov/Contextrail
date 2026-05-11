---
fileId: contextrail-template:modules:knowledge-graph:domain:graph-algorithms
module: modules/knowledge-graph
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: knowledge-graph
summary: BFS multi-hop traversal and Union-Find connected-component detection over a GraphStorePort.
owns: bfsTraverse() depth-limited walk and findConnectedComponents() using Union-Find on graph entities and relationships.
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
linkedDocs: modules/knowledge-graph/domain/README.md
---

# graph-algorithms.mjs
