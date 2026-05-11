---
fileId: contextrail-template:modules:notifications:adapters:dom-adapter
module: modules/notifications
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: notifications
summary: DOM adapter for the notifications module. Renders and reads state directly from the DOM.
owns: The Dom adapter implementation for the notifications module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
notesForLLM: Browser-only. Keep DOM mutations scoped; the notifications port contract is the seam that separates this adapter from the rest of the app.
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
linkedDocs: modules/notifications/adapters/README.md
implementsPort: notification-port
runtimeEnvironment: browser
externalSystems:
  - dom
---

# dom-adapter.mjs
