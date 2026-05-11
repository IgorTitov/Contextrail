---
fileId: contextrail-template:modules:feature-seams:adapters:config-seam-adapter
module: modules/feature-seams
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: feature-seams
summary: Config-driven feature seam adapter for the feature-seams module. Reads flag state from an injected config source.
owns: The Config Seam adapter implementation for the feature-seams module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
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
implementsPort: seam-port
runtimeEnvironment: universal
---

# config-seam-adapter.mjs
