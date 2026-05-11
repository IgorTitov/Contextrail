---
fileId: contextrail-template:modules:onboarding:adapters:dom-adapter
module: modules/onboarding
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: onboarding
summary: DOM adapter for the onboarding module. Renders and reads state directly from the DOM.
owns: The Dom adapter implementation for the onboarding module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
notesForLLM: Browser-only. Keep DOM mutations scoped; the onboarding port contract is the seam that separates this adapter from the rest of the app.
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
adapterType: ui
linkedDocs: modules/onboarding/adapters/README.md
implementsPort: onboarding-port
runtimeEnvironment: browser
externalSystems:
  - dom
---

# dom-adapter.mjs
