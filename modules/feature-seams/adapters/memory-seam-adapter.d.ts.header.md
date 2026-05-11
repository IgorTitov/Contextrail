---
fileId: contextrail-template:modules:feature-seams:adapters:memory-seam-adapter.d
module: modules/feature-seams
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: feature-seams
summary: In-memory feature seam adapter for the feature-seams module. Mutable flag state for tests.
owns: Memory Seam Adapter.D adapter within the feature-seams module.
boundaries: Scoped to the feature-seams module. Do not use outside this module boundary.
invariants: Must remain consistent with the feature-seams module's port contracts.
notesForLLM: Test-only. Lets tests flip flags between scenarios without touching real config.
allowedDependencies:
  - "../ports/*"
  - "../types.*"
  - ./
  - "frameworks as needed (react, express, node: builtins)"
forbiddenDependencies:
  - "../domain/**"
  - "../application/**"
  - "modules/<other>/domain/**"
  - "modules/<other>/application/**"
  - "modules/<other>/adapters/**"
adapterType: in-memory
linkedDocs: modules/feature-seams/adapters/README.md
---

# memory-seam-adapter.d.ts
