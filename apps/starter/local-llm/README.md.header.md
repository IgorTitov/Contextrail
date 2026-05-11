---
fileId: contextrail-template:apps:starter:local-llm:README
module: apps/starter
stability: evolving
steward: shared
api: Documentation
dependsOn:
  - apps/starter/local-llm/local-llm-init.mjs
  - apps/starter/local-llm/local-llm-panel.mjs
  - apps/starter/local-llm/ui-selectors.mjs
  - apps/starter/local-llm/messages.mjs
owns: "Human-readable orientation for the starter app local-llm feature slice: which files exist, what they do, and how the panel wires into the app via feature-seams."
boundaries: Must not duplicate module-level documentation from modules/local-llm/README.md; must describe only the app-layer integration concerns.
invariants: Must stay aligned with the actual files present in apps/starter/local-llm/.
risks: Stale feature descriptions here mislead agents about how the adapter swap or panel lifecycle works when adding new features.
notesForLLM: The integration entry point is local-llm-init.mjs which mounts the panel and wires onAdapterReady for adapter swap. All selectors come from ui-selectors.mjs — do not hardcode data-testid strings in templates or tests.
tests: tests/unit/local-llm-ui.test.mjs
linkedDocs: docs/prd/local-llm.md
specRefs: TPL-085
related:
  - apps/starter/local-llm/local-llm-init.mjs
  - apps/starter/local-llm/local-llm-panel.mjs
  - modules/local-llm/README.md
summary: Directory overview for starter/local-llm/.
---

# README.md
