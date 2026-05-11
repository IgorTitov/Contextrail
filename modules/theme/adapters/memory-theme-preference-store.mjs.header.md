---
fileId: contextrail-template:modules:theme:adapters:memory-theme-preference-store
module: modules/theme
stability: experimental
steward: theme-module
api: Adapter
boundedContext: theme
summary: In-memory Map-backed ThemePreferenceStorePort adapter for tests, dev, and the api-starter demo.
owns: createMemoryThemePreferenceStore.
boundaries: In-memory only. No persistence across process restarts. Defensive copies on read and write.
invariants: Returned records cannot be mutated back into internal state. userId must be a non-empty string.
specRefs:
  - TPL-001
---

# memory-theme-preference-store.mjs
