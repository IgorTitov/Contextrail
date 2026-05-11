---
fileId: contextrail-template:modules:ai-chat:adapters:echo-adapter.d
module: modules/ai-chat
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: ai-chat
summary: Echo/passthrough adapter for the ai-chat module. Returns synthetic deterministic responses.
owns: Echo Adapter.D adapter within the ai-chat module.
boundaries: Scoped to the ai-chat module. Do not use outside this module boundary.
invariants: Must remain consistent with the ai-chat module's port contracts.
notesForLLM: Test and development use. Exercises the port contract without calling real infrastructure.
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
linkedDocs: modules/ai-chat/adapters/README.md
---

# echo-adapter.d.ts
