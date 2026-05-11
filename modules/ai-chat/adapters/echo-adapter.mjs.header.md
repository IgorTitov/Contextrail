---
fileId: contextrail-template:modules:ai-chat:adapters:echo-adapter
module: modules/ai-chat
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: ai-chat
dependsOn:
  - modules/ai-chat/domain/message-history.mjs
  - modules/ai-chat/messages.mjs
owns: Echo-mode AiChatPort implementation; per-instance message history; per-instance listener set; character-level streaming simulation.
boundaries: Must not make network calls or require infrastructure. Must not be used as a production AI backend. Exposed to consumers only through modules/ai-chat/public-api.mjs.
invariants: Must satisfy every method required by AiChatPort; each createEchoAdapter call must produce an isolated instance with its own history and listener set; echo content must use the i18n prefix from messages.mjs, not a hardcoded string.
risks: Shared idCounter is module-level and not reset between test runs — tests must not rely on exact id values; delay misconfiguration can cause unexpectedly slow test suites.
notesForLLM: Test and development use. Exercises the port contract without calling real infrastructure.
tests: tests/unit/ai-chat.test.mjs
linkedDocs: docs/prd/ai-chat.md
specRefs: TPL-073
related:
  - modules/ai-chat/ports/ai-chat-port.mjs
  - modules/ai-chat/public-api.mjs
  - modules/ai-chat/adapters/http-api-adapter.mjs
summary: Echo/passthrough adapter for the ai-chat module. Returns synthetic deterministic responses.
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
implementsPort: ai-chat-port
runtimeEnvironment: universal
---

# echo-adapter.mjs
