---
fileId: contextrail-template:modules:analytics:adapters:no-op-adapter
module: modules/analytics
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: analytics
summary: No-op adapter for the analytics module. Satisfies the port with empty behavior.
owns: The No Op adapter implementation for the analytics module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
notesForLLM: "Use when the analytics feature is disabled but the port contract must still be wired (e.g. analytics off, logging off)."
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
specRefs: TPL-165
linkedDocs: modules/analytics/adapters/README.md
implementsPort: analytics-port
runtimeEnvironment: universal
---

# no-op-adapter.mjs
