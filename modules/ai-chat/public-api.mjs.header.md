---
fileId: contextrail-template:modules:ai-chat:public-api
module: modules/ai-chat
stability: evolving
steward: shared
api: module-public
hexLayer: application
boundedContext: ai-chat
dependsOn:
  - modules/ai-chat/ports/ai-chat-port.mjs
  - modules/ai-chat/adapters/echo-adapter.mjs
  - modules/ai-chat/adapters/http-api-adapter.mjs
  - modules/ai-chat/domain/message-history.mjs
summary: Single entry point for the ai-chat bounded module — re-exports assertAiChatPort, echo/HTTP adapters, and createMessageHistory.
owns: The complete and stable external surface of the ai-chat module; the boundary enforcing no deep imports from outside consumers.
boundaries: Must not contain business logic. Must not import from other modules' internals. Must not grow to re-export internal helpers not meant for cross-module use.
invariants: All cross-module ai-chat imports must go through this file only; removing an export is a breaking change requiring a version bump; exports must remain consistent with the ai-chat hex contract test.
risks: Adding an internal export here accidentally broadens the module surface; removing an export silently breaks consumers not caught by contract tests.
notesForLLM: This is the only file external code may import from the ai-chat module. Before adding an export here, confirm it belongs to the public surface and is covered by contract tests.
tests: tests/contract/ai-chat-hex-contract.test.mjs
linkedDocs:
  - docs/prd/ai-chat.md
  - docs/_generated/dependency-graph.json
specRefs:
  - TPL-071
  - TPL-076
related:
  - modules/ai-chat/ports/ai-chat-port.mjs
  - tests/contract/ai-chat-hex-contract.test.mjs
allowedDependencies:
  - "./domain/*"
  - "./application/*"
  - "./ports/*"
  - "./adapters/*"
  - "./messages.*"
  - "./types.*"
forbiddenDependencies:
  - "modules/<other>/domain/**"
  - "modules/<other>/application/**"
  - "modules/<other>/ports/**"
  - "modules/<other>/adapters/**"
  - react
  - express
  - fastify
  - "node:*"
exports:
  - assertAiChatPort
  - createEchoAdapter
  - createHttpApiAdapter
  - createMessageHistory
  - getLocale
  - registerLocale
  - resetLocale
  - setLocale
  - t
---

# public-api.mjs

