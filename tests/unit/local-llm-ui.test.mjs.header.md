---
fileId: contextrail-template:tests:unit:local-llm-ui.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
dependsOn:
  - apps/starter/local-llm/ui-selectors.mjs
  - apps/starter/local-llm/messages.mjs
summary: Prove pure-logic contracts for Local LLM UI components — selector registry completeness, i18n message layer, and locale management.
owns: Unit-level proof of Local LLM UI pure logic — selector registry uniqueness and completeness, i18n message resolution and locale management.
boundaries: Must only test pure logic from ui-selectors and messages modules; DOM-level testing belongs in E2E tests.
invariants: All selector values must be unique; known i18n keys must resolve to non-empty strings; unknown keys must return the key itself.
risks: Tests covering only pure-logic imports cannot catch DOM regressions — local-llm-panel rendering must be validated by E2E tests.
notesForLLM: DOM testing belongs in E2E. These tests cover only pure-logic exports from the UI layer.
tests: self
linkedDocs: docs/prd/local-llm.md
specRefs: TPL-085
related:
  - apps/starter/local-llm/local-llm-panel.mjs
  - apps/starter/local-llm/local-llm-init.mjs
---

# local-llm-ui.test.mjs
