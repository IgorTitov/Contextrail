---
fileId: contextrail-template:modules:log:adapters:no-op-adapter
module: modules/log
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: log
summary: No-op adapter for the log module. Satisfies the port with empty behavior.
owns: The No Op adapter implementation for the log module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
notesForLLM: "Use when the log feature is disabled but the port contract must still be wired (e.g. analytics off, logging off)."
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
adapterType: test-stub
specRefs: TPL-140
linkedDocs: modules/log/adapters/README.md
implementsPort: log-port
runtimeEnvironment: universal
---

# no-op-adapter.mjs
