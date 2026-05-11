---
fileId: contextrail-template:modules:api-client:adapters:fetch-adapter.d
module: modules/api-client
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: api-client
summary: HTTP fetch adapter for the api-client module. Uses the platform fetch API in browser and Node 18+.
owns: Fetch Adapter.D adapter within the api-client module.
boundaries: Scoped to the api-client module. Do not use outside this module boundary.
invariants: Must remain consistent with the api-client module's port contracts.
notesForLLM: Use when the api-client port needs to reach an HTTP endpoint. Abort signals and timeouts must be honored through the port interface.
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
adapterType: network
linkedDocs: modules/api-client/adapters/README.md
---

# fetch-adapter.d.ts
