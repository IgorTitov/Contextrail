---
fileId: contextrail-template:modules:graphql:messages
module: modules/graphql
stability: experimental
steward: graphql-module
api: Messages
boundedContext: graphql
summary: i18n/messages layer for graphql — namespaced keys (graphql.*) with locale registry.
owns: graphql message catalog, locale registration, and t() lookup.
boundaries: Pure string tables. No DOM, no network. Keys must live under the graphql.* namespace.
invariants: Every user-facing string in graphql flows through t(). Missing keys must not silently fall back to the key itself in production use.
specRefs:
  - TPL-001
---

# messages.mjs
