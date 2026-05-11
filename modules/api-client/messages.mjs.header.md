---
fileId: contextrail-template:modules:api-client:messages
module: modules/api-client
stability: evolving
steward: shared
api: module-public
boundedContext: api-client
owns: All user-facing string literals used by api-client adapters; locale-keyed message map; getMessage accessor.
boundaries: Must not import transport logic or port contracts. Must not grow into a general translation framework. Adapters must not hardcode user-facing strings outside this file.
invariants: Every locale must define the same set of message keys; the default locale must always be present; getMessage must not throw for any key defined in the default locale.
risks: Missing keys in non-default locales cause runtime errors when locale is switched; key set divergence across locales is only caught at runtime without a coverage check.
notesForLLM: Add new keys to all locale blocks simultaneously. Keep message keys stable — renaming a key is a breaking change for any adapter already referencing it.
tests: tests/unit/api-client.test.mjs
linkedDocs: docs/prd/auth-api-client.md
specRefs: TPL-062
related: modules/api-client/public-api.mjs
summary: i18n message registry for the api-client module.
messageKeys:
  - api.error.request_failed
  - api.error.network_failure
  - api.error.timeout
---

# messages.mjs
