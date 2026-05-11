---
fileId: contextrail-template:apps:starter:local-llm:local-llm-panel
module: apps/starter
stability: evolving
steward: shared
api: file-local
owns: Scoped CSS class definitions for all local-llm-panel.mjs DOM elements; design-token references via CSS custom properties for colors, spacing, radius, and typography.
boundaries: Must not define styles for elements outside the local-llm panel. Must not hardcode color or spacing values without providing a CSS custom property fallback. Must not override global reset styles.
invariants: CSS class names must stay synchronized with the class names applied in local-llm-panel.mjs; all color, spacing, and radius values must use --var, fallback pairs from the design system token set.
risks: CSS class name drift between this file and local-llm-panel.mjs causes invisible unstyled elements that only surface in visual tests; removing a design token fallback breaks styling in environments without the token sheet loaded.
notesForLLM: Each CSS class in this file corresponds to a class applied in local-llm-panel.mjs. The progress fill width is controlled inline via style.width. All color, spacing, and radius values use design-token custom properties with hardcoded fallbacks.
tests: tests/unit/local-llm-ui.test.mjs
linkedDocs: docs/prd/local-llm.md
specRefs: TPL-085
related:
  - apps/starter/local-llm/local-llm-panel.mjs
  - apps/starter/local-llm/ui-selectors.mjs
summary: Styles for Local Llm Panel in the starter app.
---

# local-llm-panel.css
