---
fileId: contextrail-template:modules:pwa:messages
module: modules/pwa
stability: experimental
steward: pwa-module
api: Messages
boundedContext: pwa
summary: i18n/messages layer for pwa — namespaced keys (pwa.*) with locale registry.
owns: pwa message catalog, locale registration, and t() lookup.
boundaries: Pure string tables. No DOM, no network. Keys must live under the pwa.* namespace.
invariants: Every user-facing string in pwa flows through t(). Missing keys must not silently fall back to the key itself in production use.
specRefs:
  - TPL-001
---

# messages.mjs
