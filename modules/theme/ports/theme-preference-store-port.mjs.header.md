---
fileId: contextrail-template:modules:theme:ports:theme-preference-store-port
module: modules/theme
stability: experimental
steward: theme-module
api: Port
boundedContext: theme
summary: ThemePreferenceStorePort contract + assertThemePreferenceStorePort validator.
owns: The storage port contract (get/set/clear) for user theme preferences.
boundaries: Port declaration only. No implementation — adapters live in adapters/.
invariants: Adapters must implement get, set, and clear. Assertion rejects null/non-object and missing methods.
specRefs:
  - TPL-001
---

# theme-preference-store-port.mjs
