---
fileId: contextrail-template:modules:analytics:adapters:behavioral-adapter
module: modules/analytics
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: analytics
summary: Behavioral analytics adapter for the analytics module. Collects user interaction events.
owns: The Behavioral adapter implementation for the analytics module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
notesForLLM: Consent-gated; must not emit events until the consent manager allows it. Keep payloads PII-minimal.
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
adapterType: telemetry
specRefs: TPL-166
linkedDocs: modules/analytics/adapters/README.md
implementsPort: analytics-port
runtimeEnvironment: browser
---

# behavioral-adapter.mjs
