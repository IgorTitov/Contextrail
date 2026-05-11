---
fileId: contextrail-template:modules:permission:adapters:dynamic-adapter
module: modules/permission
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: permission
summary: Dynamic permission adapter for the permission module. Evaluates rules at call time.
owns: The Dynamic adapter implementation for the permission module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
notesForLLM: "Use when permissions depend on runtime state (user roles, feature flags). Prefer static rules when conditions are fixed."
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
specRefs: TPL-159
linkedDocs: modules/permission/adapters/README.md
implementsPort: permission-port
runtimeEnvironment: universal
---

# dynamic-adapter.mjs
