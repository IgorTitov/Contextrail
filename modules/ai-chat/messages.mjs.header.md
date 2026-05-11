---
fileId: contextrail-template:modules:ai-chat:messages
module: modules/ai-chat
stability: evolving
steward: shared
api: module-public
boundedContext: ai-chat
owns: All user-facing string literals used by ai-chat adapters and domain logic; locale-keyed message map; t, setLocale, getLocale, registerLocale, and resetLocale accessors.
boundaries: Must not import port contracts, adapter logic, or domain utilities. Must not grow into a general translation framework. Adapters must not hardcode user-facing strings outside this file.
invariants: Every locale must define the same set of message keys; the default locale must always be present; t must not throw for any key defined in the default locale.
risks: Missing keys in non-default locales cause silent key-passthrough at runtime; key renaming is a breaking change for any adapter already referencing the old key; locale key sets diverging across locales are only caught at runtime without a key-coverage check.
notesForLLM: Add new keys to all locale blocks simultaneously. Keep message keys stable — renaming a key is a breaking change for any adapter already referencing it. The ai-chat.echo.prefix key is used by echo-adapter to compose the echo response.
tests: tests/unit/ai-chat.test.mjs
linkedDocs: docs/prd/ai-chat.md
specRefs: TPL-072
related:
  - modules/ai-chat/public-api.mjs
  - modules/ai-chat/adapters/echo-adapter.mjs
  - modules/ai-chat/adapters/http-api-adapter.mjs
summary: i18n message registry for the ai-chat module.
messageKeys:
  - ai-chat.echo.prefix
  - ai-chat.error.send_failed
  - ai-chat.error.stream_failed
  - ai-chat.error.api_error
  - ai-chat.error.network
  - ai-chat.status.thinking
  - ai-chat.status.streaming
  - ai-chat.input.placeholder
  - ai-chat.input.send
  - ai-chat.history.empty
---

# messages.mjs
