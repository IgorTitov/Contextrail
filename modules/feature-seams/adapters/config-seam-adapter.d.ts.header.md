---
fileId: contextrail-template:modules:feature-seams:adapters:config-seam-adapter.d
module: modules/feature-seams
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: feature-seams
summary: Config-driven feature seam adapter for the feature-seams module. Reads flag state from an injected config source.
owns: Config Seam Adapter.D adapter within the feature-seams module.
boundaries: Scoped to the feature-seams module. Do not use outside this module boundary.
invariants: Must remain consistent with the feature-seams module's port contracts.
notesForLLM: Use when flags should reflect build-time or runtime config. Keep config shape hidden behind the port.
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
adapterType: infrastructure
linkedDocs: modules/feature-seams/adapters/README.md
---

# config-seam-adapter.d.ts
