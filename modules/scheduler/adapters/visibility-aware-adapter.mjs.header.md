---
fileId: contextrail-template:modules:scheduler:adapters:visibility-aware-adapter
module: modules/scheduler
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: scheduler
summary: Visibility-aware scheduler adapter for the scheduler module. Pauses when the page is hidden.
owns: The Visibility Aware adapter implementation for the scheduler module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
notesForLLM: Browser-only. Use to avoid burning CPU on background tabs. Resumes work when visibility returns.
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
specRefs: TPL-171
linkedDocs: modules/scheduler/adapters/README.md
implementsPort: scheduler-port
runtimeEnvironment: browser
---

# visibility-aware-adapter.mjs
