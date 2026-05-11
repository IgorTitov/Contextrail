---
fileId: contextrail-template:modules:scheduler:adapters:interval-adapter
module: modules/scheduler
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: scheduler
summary: Interval scheduler adapter for the scheduler module. Periodic setInterval-based execution.
owns: The Interval adapter implementation for the scheduler module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
notesForLLM: Use for simple periodic work. Beware drift over long runs; prefer a more precise adapter for cron-like needs.
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
specRefs: TPL-169
linkedDocs: modules/scheduler/adapters/README.md
implementsPort: scheduler-port
runtimeEnvironment: universal
---

# interval-adapter.mjs
