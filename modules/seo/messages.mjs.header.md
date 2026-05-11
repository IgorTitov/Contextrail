---
fileId: contextrail-template:modules:seo:messages
module: modules/seo
stability: experimental
steward: seo-module
api: Messages
boundedContext: seo
summary: i18n/messages layer for seo — namespaced keys (seo.*) with locale registry.
owns: seo message catalog, locale registration, and t() lookup.
boundaries: Pure string tables. No DOM, no network. Keys must live under the seo.* namespace.
invariants: Every user-facing string in seo flows through t(). Missing keys must not silently fall back to the key itself in production use.
specRefs:
  - TPL-001
---

# messages.mjs
