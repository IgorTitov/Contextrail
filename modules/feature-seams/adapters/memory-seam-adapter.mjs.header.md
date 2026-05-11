---
fileId: contextrail-template:modules:feature-seams:adapters:memory-seam-adapter
module: modules/feature-seams
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: feature-seams
summary: In-memory feature seam adapter for the feature-seams module. Mutable flag state for tests.
owns: The Memory Seam adapter implementation for the feature-seams module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
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
implementsPort: seam-port
runtimeEnvironment: universal
---

# memory-seam-adapter.mjs
