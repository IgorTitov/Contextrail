---
fileId: contextrail-template:modules:ai-chat:adapters:http-api-adapter.d
module: modules/ai-chat
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: ai-chat
summary: HTTP API adapter for the ai-chat module. Calls a remote ai-chat API over HTTP.
owns: Http Api Adapter.D adapter within the ai-chat module.
boundaries: Scoped to the ai-chat module. Do not use outside this module boundary.
invariants: Must remain consistent with the ai-chat module's port contracts.
notesForLLM: Use when the ai-chat feature is backed by a remote service. Prefer the echo/test adapter in unit tests.
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
linkedDocs: modules/ai-chat/adapters/README.md
---

# http-api-adapter.d.ts
