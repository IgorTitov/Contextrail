<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Directory overview for starter/ai-chat/.
@sidecar README.md.header.md
@layer app | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# AI Chat starter UI

Framework-free chat panel component for the starter app.

## Files

- `chat-panel.mjs` — Chat panel component with message list, input, and typing indicator
- `chat-panel.css` — Styles using design tokens
- `ai-chat-init.mjs` — Initialization wiring with echo adapter default
- `ui-selectors.mjs` — Bounded selector registry for automation hooks
- `messages.mjs` — Bounded i18n messages for UI copy

## Usage

```js
import { initAiChat } from './ai-chat-init.mjs';

const container = document.getElementById('ai-chat-container');
const { destroy } = initAiChat(container);

// With custom adapter
import { createHttpApiAdapter } from '../../../modules/ai-chat/public-api.mjs';
const { destroy: destroyCustom } = initAiChat(container, {
  adapter: createHttpApiAdapter({ apiClient, endpoint: '/v1/chat/completions' }),
});
```

## SpecRefs

TPL-077, TPL-078
