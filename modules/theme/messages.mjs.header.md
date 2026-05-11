---
fileId: contextrail-template:modules:theme:messages
module: modules/theme
stability: experimental
steward: theme-module
api: Messages
boundedContext: theme
summary: i18n/messages layer for theme — namespaced keys (theme.*) with locale registry.
owns: theme message catalog, locale registration, and t() lookup.
boundaries: Pure string tables. No DOM, no network. Keys must live under the theme.* namespace.
invariants: Every user-facing string in theme flows through t(). Missing keys must not silently fall back to the key itself in production use.
specRefs:
  - TPL-001
---

# messages.mjs
