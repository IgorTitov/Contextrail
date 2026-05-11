---
fileId: contextrail-template:modules:ai-chat:adapters:http-api-adapter
module: modules/ai-chat
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: ai-chat
dependsOn:
  - modules/ai-chat/domain/message-history.mjs
  - modules/ai-chat/messages.mjs
owns: HTTP-backed AiChatPort implementation; OpenAI-compatible default request/response formatters; per-instance message history and listener set.
boundaries: Must not import a concrete HTTP client — callers must supply an ApiClientPort. Must not contain UI logic. Exposed to consumers only through modules/ai-chat/public-api.mjs.
invariants: Must satisfy every method required by AiChatPort; apiClient must be provided and must conform to ApiClientPort; streamMessage falls back to sendMessage simulation until native streaming is implemented.
risks: Formatter mismatches silently produce empty content without throwing; non-ok HTTP responses surface as thrown errors that callers must handle; module-level idCounter is not reset between test runs.
securityPrivacy: The apiClient carries credentials and endpoint config; callers must ensure the ApiClientPort is wired with appropriate auth headers and not logged in full.
notesForLLM: Use when the ai-chat feature is backed by a remote service. Prefer the echo/test adapter in unit tests.
externalSystems: OpenAI-compatible chat completions API (via injected ApiClientPort)
tests: tests/unit/ai-chat.test.mjs
linkedDocs: docs/prd/ai-chat.md
specRefs: TPL-074
related:
  - modules/ai-chat/ports/ai-chat-port.mjs
  - modules/ai-chat/public-api.mjs
  - modules/ai-chat/adapters/echo-adapter.mjs
summary: HTTP API adapter for the ai-chat module. Calls a remote ai-chat API over HTTP.
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
implementsPort: ai-chat-port
runtimeEnvironment: universal
transport: http/rest
---

# http-api-adapter.mjs
