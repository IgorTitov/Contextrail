---
fileId: contextrail-template:apps:starter:design:reset
module: apps/starter
stability: stable
stabilityRationale: Element-only reset is a foundational primitive every other CSS layer depends on. Changing selectors here cascades through every component and breaks the box-sizing/focus/reduced-motion accessibility contract — touch only with explicit visual regression review.
steward: shared
api: CSS element-only selectors (no classes)
dependsOn: apps/starter/design/tokens.css (optional — uses token fallbacks)
owns: "Global element-level style normalization: box-sizing, margins, typography inheritance, media defaults, focus-visible ring, and reduced-motion media query."
boundaries: Must only use element selectors — no classes. Must not define component-level styles. Must load before tokens.css in the cascade.
invariants: "box-sizing: border-box must always be set. prefers-reduced-motion media query must always be present."
risks: Changes here affect every element in the app. Test visually across light/dark modes after any edit.
notesForLLM: This file loads first in the CSS cascade. It uses element-only selectors so it does not conflict with component classes. The reduced-motion block at the end is a hard accessibility requirement — do not remove it.
tests: tests/contract/design-tokens-contract.test.mjs
linkedDocs:
  - docs/design/brandbook.md
  - docs/design/design-system.md
specRefs: TPL-056
related:
  - apps/starter/design/tokens.css
  - apps/starter/layout/layout.css
summary: Styles for Reset in the starter app.
---

# reset.css
