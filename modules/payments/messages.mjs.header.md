---
fileId: contextrail-template:modules:payments:messages
module: modules/payments
stability: evolving
steward: shared
api: Messages
boundedContext: payments
summary: i18n message registry for the payments module — all user-facing copy flows through this layer.
owns: locale registry, t(key, params), setLocale, getLocale, registerLocale, resetLocale.
boundaries: Stays inside the payments bounded context. No I/O, no imports from adapters/.
invariants: Keys are namespaced "payments.*". Missing keys return the key verbatim for easy debugging.
notesForLLM: Add new locales via registerLocale. Keep keys stable — callers depend on them.
specRefs:
  - TPL-001
---

# messages.mjs
