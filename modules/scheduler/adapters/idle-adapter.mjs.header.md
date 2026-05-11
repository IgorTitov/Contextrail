---
fileId: contextrail-template:modules:scheduler:adapters:idle-adapter
module: modules/scheduler
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: scheduler
summary: Idle-callback scheduler adapter for the scheduler module. Defers work to requestIdleCallback.
owns: The Idle adapter implementation for the scheduler module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
notesForLLM: Browser-preferred for non-urgent background work. Falls back to setTimeout where idle callbacks are unavailable.
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
specRefs: TPL-170
linkedDocs: modules/scheduler/adapters/README.md
implementsPort: scheduler-port
runtimeEnvironment: universal
---

# idle-adapter.mjs
