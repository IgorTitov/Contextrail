---
fileId: contextrail-template:apps:starter:app-config
module: apps/starter
stability: evolving
steward: shared
api: "{ MODES, detectMode, getMode, setMode, getFeatureFlags, setFeatureFlag, resolveConfig, resetConfig }"
owns: The canonical set of runtime modes, per-mode feature-flag defaults, and the module-level mutable config state (currentMode, flagOverrides).
boundaries: Must not import DOM APIs, framework code, or any other app module. Mode detection hints must remain injectable for testability. Flag schema changes require updating tests and MODE_FLAGS together.
invariants: MODES is frozen and contains exactly 5 entries; DEFAULT_FLAGS keys define the allowed flag namespace; resetConfig() must restore the hosted mode and clear all overrides; setMode() must reject unrecognized modes.
risks: Module-level mutable state means test isolation depends on resetConfig() being called in beforeEach; missing that call causes cross-test bleed.
securityPrivacy: No secrets; mode and flag values are runtime environment signals only.
notesForLLM: This is the single authority on what modes exist and what flags they enable. Any addition of a new platform target starts here by adding to MODES and MODE_FLAGS before touching app.mjs or the HTML entry point. The gatherBrowserHints() helper is intentionally not exported.
tests: tests/unit/app-config.test.mjs
linkedDocs: docs/adr/0004-multi-platform-seams.md
specRefs: TPL-023
related:
  - apps/starter/app.mjs
  - docs/adr/0004-multi-platform-seams.md
summary: Configuration management for the starter application.
---

# app-config.mjs
