---
fileId: contextrail-template:apps:starter:local-llm:messages
module: apps/starter
stability: evolving
steward: shared
api: file-local
owns: App-level bounded i18n locale store for the Local LLM UI in the starter app; canonical key namespace local-llm.ui.*; t(), setLocale(), getLocale(), registerLocale(), and resetLocale() functions.
boundaries: Must not be shared with or merged into modules/local-llm/messages.mjs — the two are intentionally separate. Must not contain module-level error or status strings already owned by the module messages layer. Must remain scoped to UI panel copy only.
invariants: All user-facing strings in local-llm-panel.mjs must come through t() from this file, not hardcoded; resetLocale() must return to 'en'; t() must return the key itself for unknown keys rather than throwing.
risks: Removing or renaming a key without updating local-llm-panel.mjs causes key passthrough visible to users; two separate messages layers (app vs module) must not overlap in key namespace — module owns local-llm.error.* and local-llm.status.*, app owns local-llm.ui.*.
notesForLLM: This is the app-level messages layer, distinct from the module-level one. Key namespace is local-llm.ui.*. Adapters and cache manager use the module messages layer. The panel uses this file. Do not merge the two.
tests: tests/unit/local-llm-ui.test.mjs
linkedDocs: docs/prd/local-llm.md
specRefs: TPL-085
related:
  - apps/starter/local-llm/local-llm-panel.mjs
  - modules/local-llm/messages.mjs
summary: i18n messages for the starter app.
---

# messages.mjs
