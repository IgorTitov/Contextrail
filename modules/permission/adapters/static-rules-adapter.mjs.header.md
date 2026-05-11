---
fileId: contextrail-template:modules:permission:adapters:static-rules-adapter
module: modules/permission
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: permission
summary: Static-rules permission adapter for the permission module. Pre-compiled allow/deny rules.
owns: The Static Rules adapter implementation for the permission module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
notesForLLM: Use when the rule set is fixed at build time. Faster than a dynamic adapter but cannot react to runtime state changes.
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
specRefs: TPL-158
linkedDocs: modules/permission/adapters/README.md
implementsPort: permission-port
runtimeEnvironment: universal
---

# static-rules-adapter.mjs
