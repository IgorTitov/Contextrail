<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Define the umbrella PRD for the AI Chat hex module that provides a port-based AI chat abstraction with pluggable adapters, message history management, and a starter UI panel.
@sidecar ai-chat.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# AI Chat Port + UI

## Requirement intent

The starter template needs a hex module that provides a pluggable AI chat abstraction. This module allows any application to plug in its preferred AI chat backend -- from a mock/echo adapter for development to an HTTP API adapter for real LLM services -- without coupling application code to a specific AI provider.

The **ai-chat** module provides a port-based AI chat abstraction with multiple swappable adapters. It defines a stable contract for sending messages, streaming responses, managing conversation history, and subscribing to message events. A domain utility manages message history with configurable limits and prompt-context formatting.

The module ships with two adapters: an echo adapter for development and testing that mirrors user messages back, and an HTTP API adapter that communicates with any OpenAI-compatible chat completions endpoint through configurable request/response formatters. The HTTP API adapter consumes an ApiClientPort-conformant client from the api-client module for all HTTP communication.

A starter chat panel UI component demonstrates integration with any AiChatPort-conformant adapter, providing a message list, input area, typing indicator, and auto-scroll. The starter app wires this panel with the echo adapter by default and shows how to swap adapters via the feature-seams mechanism.

Both the module and the UI follow the established hex architecture pattern used by auth, api-client, event-bus, and state: domain logic, port contracts, adapter implementations, public API boundary, JSDoc + `.d.ts` typing, and runtime port assertions.

All user-facing copy (error messages, status descriptions, UI labels, placeholder text) must go through the i18n/messages layer.

## Classification

This is **mixed technical/architectural + UI** work. The ai-chat module provides reusable infrastructure for the starter template. The starter UI components are template demonstration components, not end-user workflow changes. USM is intentionally skipped.

## Deliverables in scope (Slice 9)

### Module: AI Chat (`modules/ai-chat/`)

#### 1. AiChatPort Definition (TPL-072)

Hex port at `modules/ai-chat/ports/ai-chat-port.mjs`.

**AiChatPort interface:**

- `sendMessage(message, options?)` -- sends a user message to the AI; returns a Promise resolving to an AiChatResponse
- `streamMessage(message, options?)` -- sends a user message and returns an async iterable/stream of partial responses for streaming UX
- `getHistory()` -- returns the current conversation history array
- `clearHistory()` -- clears the conversation history
- `onMessage(listener)` -- registers a listener called when new messages arrive; returns an unsubscribe function
- `offMessage(listener)` -- removes a message listener

**Domain types:**

- `AiChatMessage` -- message object with `id` (string), `role` ('user' | 'assistant' | 'system'), `content` (string), `timestamp` (number)
- `AiChatResponse` -- response object with `message` (AiChatMessage), optional `usage` ({ promptTokens, completionTokens, totalTokens }), optional `model` (string)
- `AiChatOptions` -- per-request options: optional `systemPrompt` (string), optional `temperature` (number), optional `maxTokens` (number), optional `model` (string)
- `AiChatStreamChunk` -- streaming chunk with `delta` (string), `done` (boolean), optional `message` (AiChatMessage when done=true)

Constraints: The port must be framework-free and testable in isolation. All listener management follows the same pattern as EventBusPort (registration order, unsubscribe function). Error messages must be i18n-ready string keys, not hardcoded English prose.

#### 2. EchoAdapter (TPL-073)

Development/testing adapter at `modules/ai-chat/adapters/echo-adapter.mjs`.

- Factory function `createEchoAdapter(options?)` returning a fresh adapter instance
- `sendMessage(message)` -- returns a response that echoes the user's message back, prefixed with "Echo: "
- `streamMessage(message)` -- simulates streaming by yielding the echo response character-by-character with a configurable delay
- Maintains conversation history in memory
- `clearHistory()` resets the history
- Message listeners are notified for both user and assistant messages
- Configurable `delay` (ms) for simulating network latency
- This is the safe default for development and testing

Constraints: Must conform to the AiChatPort interface. Must pass the runtime port assertion. Must be stateless across separate factory calls. Must not make network requests. The echo prefix string must come from the i18n/messages layer.

#### 3. HttpApiAdapter (TPL-074)

HTTP-based AI backend adapter at `modules/ai-chat/adapters/http-api-adapter.mjs`.

- Factory function `createHttpApiAdapter(config)` accepting `{ apiClient, endpoint, model?, formatRequest?, formatResponse? }`
- Uses an ApiClientPort-conformant client (from the api-client module's public-api) for HTTP communication
- `sendMessage(message, options?)` -- POSTs to the configured endpoint; uses formatRequest/formatResponse hooks for provider-agnostic request/response transformation
- `streamMessage(message, options?)` -- if the endpoint supports streaming, handles SSE or chunked responses; falls back to non-streaming if not available
- Default request/response formatters target a generic OpenAI-compatible chat completions shape
- Maintains conversation history in memory
- Does NOT hardcode any specific AI provider -- the formatRequest/formatResponse hooks allow adaptation to any API shape

Constraints: Must conform to the AiChatPort interface. Must pass the runtime port assertion. Must import ApiClientPort only through the api-client module's `public-api.mjs`. Must not hardcode any provider-specific URLs, headers, or request shapes in the adapter itself (use formatters). Error messages must use i18n keys. Must be stateless across separate factory calls.

#### 4. MessageHistory Manager (TPL-075)

Domain utility at `modules/ai-chat/domain/message-history.mjs`.

- `createMessageHistory(options?)` -- factory for history manager
- `addMessage(message)` -- adds message to history, trims if exceeding `maxMessages` option
- `getMessages()` -- returns current history array (immutable copy)
- `clear()` -- empties the history
- `getLastMessage()` -- returns most recent message or null
- `toPromptContext()` -- formats history into a prompt-ready array for context window management
- Configurable `maxMessages` (default: 100) for memory management
- Used internally by adapters for consistent history management

Constraints: The history manager is a pure domain utility, not an adapter. It must not depend on any external module. It must not import from outside the ai-chat module boundary. Returned arrays must be immutable copies, not references to internal state.

#### 5. Public API + Types (TPL-076)

`modules/ai-chat/public-api.mjs` exporting:

- `assertAiChatPort`
- `createEchoAdapter`
- `createHttpApiAdapter`
- `createMessageHistory`
- Domain type constructors or helpers as needed

Plus `public-api.d.ts` sidecar re-exporting all types.

Constraints: Only the documented surface is exported. Internal implementation details are not accessible through the public API. The typing pattern (JSDoc + `.d.ts` sidecar) must follow the reference established by feature-seams, auth, and api-client.

### Starter UI: Chat Panel (`apps/starter/`)

#### 6. Chat Panel Component (TPL-077)

At `apps/starter/ai-chat/chat-panel.mjs` (or similar path following the starter app convention).

- Renders a chat message list and input area
- Connects to any AiChatPort-conformant adapter
- Displays messages with role-based styling (user vs assistant)
- Shows a loading/typing indicator while waiting for AI response
- Scrolls to latest message automatically
- Uses design tokens for styling
- Uses ui-selectors registry for test hooks
- All UI copy through i18n/messages layer
- Framework-free vanilla JS component

Constraints: Must not import adapter internals -- receives the adapter through dependency injection. Must use design tokens from the design-system for all styling. All automation-facing DOM hooks (`data-testid`, DOM `id`) must come from a bounded ui-selectors registry. All visible text must go through the i18n/messages layer.

#### 7. AI Chat Integration in Starter App (TPL-078)

Wires the chat UI into the starter app shell.

- Adds an AI Chat section/tab to the starter app navigation
- Initializes the echo adapter by default (safe for demo)
- Shows how to swap adapters via the feature-seams mechanism
- Connects auth state (if authenticated, includes user info in system prompt)
- Clean teardown on component unmount

Constraints: Must not break existing starter features. The echo adapter must be the default. Adapter swap must go through the feature-seams mechanism. Auth integration must be optional and degrade gracefully when auth is not configured.

## Out of scope

- Real AI provider API keys or credentials baked into the template
- Fine-tuning, embeddings, or RAG pipeline
- Persistent conversation storage (database, file system)
- Multi-conversation management (conversation list, switching)
- Message editing or regeneration
- Tool/function calling support
- Image or multimodal message support
- Voice input/output
- Token counting or cost estimation
- Rate limiting or request queuing
- Conversation export/import
- Markdown rendering in messages (plain text only for the starter)
- Custom system prompt configuration UI

## Cross-cutting constraints

- Module and UI use vanilla JS (ESM, no build step)
- The module follows the hex port/adapter pattern consistent with existing modules (auth, api-client, event-bus, state)
- Cross-module access goes through `public-api.mjs` only
- No new framework or runtime dependency
- JSDoc + `.d.ts` sidecar typing pattern following the established reference
- All user-facing copy (error messages, UI labels, placeholder text, status descriptions) must use i18n message keys
- Existing starter features must continue to work identically
- The http-api adapter depends on the api-client module but imports only through that module's `public-api.mjs`
- Automation-facing DOM hooks from bounded ui-selectors registry
- Auth integration is optional and degrades gracefully

## Acceptance boundaries

### Slice 9

- AiChatPort defines sendMessage, streamMessage, getHistory, clearHistory, onMessage, and offMessage operations
- Domain types define AiChatMessage with id, role, content, and timestamp fields
- Domain types define AiChatResponse, AiChatOptions, and AiChatStreamChunk
- EchoAdapter echoes user messages back with a configurable delay
- EchoAdapter supports streaming simulation by yielding characters incrementally
- EchoAdapter maintains conversation history and notifies message listeners
- HttpApiAdapter POSTs to a configured endpoint using an ApiClientPort-conformant client
- HttpApiAdapter uses configurable formatRequest/formatResponse hooks for provider-agnostic transformation
- HttpApiAdapter defaults to OpenAI-compatible chat completions shape
- HttpApiAdapter handles streaming responses when the endpoint supports them
- MessageHistory manager tracks messages with configurable maxMessages limit
- MessageHistory returns immutable copies and provides prompt-context formatting
- All adapters pass the runtime port assertion (assertAiChatPort)
- Chat panel renders messages with role-based styling and auto-scrolls to latest
- Chat panel shows a typing indicator while waiting for AI response
- Chat panel connects to any AiChatPort-conformant adapter via dependency injection
- Starter app wires the chat panel with the echo adapter by default
- Starter app shows adapter swap via feature-seams mechanism
- All error messages and UI copy use i18n message keys
- JSDoc typedefs are present in all source files and reference the `.d.ts` sidecars
- `.d.ts` sidecars define TypeScript-compatible interfaces without introducing build requirements
- `public-api.mjs` exports only the documented surface
- The module does not break existing starter features or hex boundaries

```trace-yaml
work_item:
  id: TPL-071
  type: meta
  title: AI Chat Port + UI
  parent_ref:
  status: done
  module_ref: ai-chat
  spec_refs:
    - docs/prd/ai-chat.md
    - docs/prd/index.md
  test_refs:
    - tests/contract/product-docs-contract.test.mjs
  bdd_refs:
  acceptance:
    - AiChatPort provides sendMessage, streamMessage, getHistory, clearHistory, onMessage, and offMessage operations.
    - EchoAdapter echoes user messages back with configurable delay and streaming simulation.
    - HttpApiAdapter communicates with any OpenAI-compatible endpoint via configurable formatters.
    - MessageHistory manager tracks messages with configurable limits and prompt-context formatting.
    - Chat panel renders messages with role-based styling, typing indicator, and auto-scroll.
    - Starter app wires the echo adapter by default and shows adapter swap via feature-seams.
    - All error messages and UI copy use i18n message keys.
    - JSDoc typedefs and .d.ts sidecars follow the established typing pattern.
    - Public API exports only the documented surface.
```
