---
fileId: contextrail-template:modules:task:adapters:main-thread-adapter
module: modules/task
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: task
summary: "Main-thread task adapter for the task module. Executes tasks synchronously on the caller's thread."
owns: The Main Thread adapter implementation for the task module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
notesForLLM: Use for simple or UI-coupled work. Heavy computation will block the UI — switch to a worker adapter instead.
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
specRefs: TPL-156
linkedDocs: modules/task/adapters/README.md
implementsPort: task-port
runtimeEnvironment: universal
---

# main-thread-adapter.mjs
