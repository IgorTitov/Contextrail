---
fileId: contextrail-template:modules:log:adapters:structured-json-adapter
module: modules/log
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: log
summary: Structured JSON log adapter for the log module. Emits line-delimited JSON records.
owns: The Structured Json adapter implementation for the log module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
notesForLLM: "Use when logs are ingested by a JSON-aware pipeline (Loki, CloudWatch, Datadog). One record per line."
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
specRefs: TPL-139
linkedDocs: modules/log/adapters/README.md
implementsPort: log-port
transport: stdio
runtimeEnvironment: universal
externalSystems:
  - console
---

# structured-json-adapter.mjs
