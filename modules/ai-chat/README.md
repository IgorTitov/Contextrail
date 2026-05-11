<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Overview and navigation guide for the ai-chat hex module.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx ai-chat
@public false
@edit careful -->

# AI Chat module

Hex module providing a pluggable AI chat abstraction.

## Structure

- `ports/ai-chat-port.mjs` — AiChatPort contract and `assertAiChatPort` validator
- `domain/message-history.mjs` — Message history manager with configurable limits
- `adapters/echo-adapter.mjs` — Development echo adapter
- `adapters/http-api-adapter.mjs` — HTTP API adapter for OpenAI-compatible endpoints
- `messages.mjs` — Bounded i18n message layer
- `public-api.mjs` — Single entry point for cross-module imports
- `types.d.ts` — TypeScript-compatible type definitions

## Usage

```js
import {
  createEchoAdapter,
  createHttpApiAdapter,
  createMessageHistory,
} from './public-api.mjs';

// Echo adapter for development
const echo = createEchoAdapter({ delay: 100 });
const response = await echo.sendMessage('Hello');

// HTTP adapter for production
const http = createHttpApiAdapter({
  apiClient,
  endpoint: '/v1/chat/completions',
  model: 'gpt-4',
});
```

## SpecRefs

TPL-071, TPL-072 through TPL-076
