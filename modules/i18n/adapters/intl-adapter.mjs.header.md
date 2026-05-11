---
fileId: contextrail-template:modules:i18n:adapters:intl-adapter
module: modules/i18n
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: i18n
summary: Intl-based adapter for the i18n module. Uses the platform Intl API for locale-aware operations.
owns: The Intl adapter implementation for the i18n module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
notesForLLM: "Cross-platform (browser + Node). Respects the host environment's locale data; verify behavior across runtimes when touching it."
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
linkedDocs: modules/i18n/adapters/README.md
implementsPort: i18n-port
runtimeEnvironment: universal
---

# intl-adapter.mjs
