---
fileId: contextrail-template:apps:starter:app
module: apps/starter
stability: evolving
steward: shared
api: "{ initApp, createAppContext, getAdapterPlan }"
dependsOn:
  - apps/starter/app-config.mjs
  - modules/user-preferences/public-api.mjs
  - modules/notifications/public-api.mjs
  - modules/analytics/public-api.mjs
  - apps/starter/messages.mjs
owns: The adapter selection strategy (getAdapterPlan) and the fixed initialization order (preferences, locale, theme, error-boundary, navigation, notifications) inside initApp.
boundaries: Must not contain business logic or domain rules. Adapter selection must remain the only mode-aware code in this file; individual feature modules stay platform-agnostic. Must not bypass module public APIs.
invariants: initApp() must always initialize features in the documented dependency order; graceful degradation to memory storage must apply when localStorage is unavailable; getAdapterPlan() is the single point of change when new platform adapters are added.
risks: Dynamic imports scatter initialization across async boundaries; errors in early steps (preferences, locale) silently fall back rather than surface, which can mask adapter misconfigurations.
securityPrivacy: No secrets; adapter plan and context contain only runtime mode and flag values.
notesForLLM: getAdapterPlan() is the designated seam for future platform-specific adapter routing. When adding a new platform adapter, update getAdapterPlan() first, then add the corresponding adapter module, then extend the test suite. The initApp options.overrides pattern is the approved injection mechanism for tests — do not add new side channels.
tests: tests/unit/app-shell.test.mjs
linkedDocs: docs/adr/0004-multi-platform-seams.md
specRefs: TPL-024
related:
  - apps/starter/index.html
  - docs/adr/0004-multi-platform-seams.md
summary: Main entry point for the starter application.
---

# app.mjs
