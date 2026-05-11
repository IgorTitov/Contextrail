---
fileId: contextrail-template:modules:task:adapters:web-worker-adapter
module: modules/task
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: task
summary: Web Worker task adapter for the task module. Runs tasks in a dedicated worker.
owns: The Web Worker adapter implementation for the task module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
securityPrivacy: Uses new Function() to deserialize task functions inside a Worker blob. fnSource must never come from untrusted user input.
notesForLLM: Browser-only. Use to keep heavy computation off the main thread. Messages cross the worker boundary through the port contract.
specRefs: TPL-001
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
linkedDocs: modules/task/adapters/README.md
implementsPort: task-port
transport: ipc
runtimeEnvironment: browser
externalSystems:
  - web-worker
---

# web-worker-adapter.mjs
