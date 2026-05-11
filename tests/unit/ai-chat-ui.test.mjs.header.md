---
fileId: contextrail-template:tests:unit:ai-chat-ui.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
dependsOn:
  - apps/starter/ai-chat/ui-selectors.mjs
  - apps/starter/ai-chat/messages.mjs
summary: Prove pure-logic contracts for AI chat UI components — selector registry completeness, i18n message layer, and locale management.
owns: Unit-level proof of AI chat UI pure logic — selector registry uniqueness and completeness, i18n message resolution and locale management.
boundaries: Must only test pure logic from ui-selectors and messages modules; DOM-level testing belongs in E2E tests.
invariants: All selector values must be unique; known i18n keys must resolve to non-empty strings; unknown keys must return the key itself.
risks: Tests covering only pure-logic imports cannot catch DOM regressions — chat-panel rendering must be validated by E2E tests to remain meaningful.
notesForLLM: DOM testing belongs in E2E. These tests cover only pure-logic exports from the UI layer.
tests: self
linkedDocs: docs/prd/ai-chat.md
specRefs:
  - TPL-077
  - TPL-078
related:
  - apps/starter/ai-chat/chat-panel.mjs
  - apps/starter/ai-chat/ai-chat-init.mjs
---

# ai-chat-ui.test.mjs
