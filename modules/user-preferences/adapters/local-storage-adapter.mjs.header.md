---
fileId: contextrail-template:modules:user-preferences:adapters:local-storage-adapter
module: modules/user-preferences
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: user-preferences
summary: localStorage adapter for the user-preferences module. Persists small scalar state synchronously in the browser.
owns: The Local Storage adapter implementation for the user-preferences module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
notesForLLM: "Browser-only. Synchronous but capped at roughly 5 MB. Use for small preferences, not hot or large data."
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
adapterType: storage
linkedDocs: modules/user-preferences/adapters/README.md
implementsPort: storage-port
transport: db/kv
runtimeEnvironment: browser
externalSystems:
  - browser-localstorage
---

# local-storage-adapter.mjs
