---
fileId: contextrail-template:tests:e2e:visual-cursor
module: tests/e2e
stability: evolving
steward: shared
api: file-local
summary: Inject a visible cursor dot and click ripple into headed Playwright sessions for visual debugging and screen recordings.
owns: The visual cursor overlay script that creates a CSS dot following mouse movement and a click ripple animation, injected via page.addInitScript in E2E fixtures.
boundaries: Must be a self-contained browser script with no imports. Must not affect test assertions or page layout.
invariants: Cursor dot must use fixed positioning and high z-index to stay visible above all page content. Must be no-op safe if injected multiple times.
risks: High z-index cursor may obscure click targets in headless mode — only use in headed sessions.
notesForLLM: This script runs inside the browser page context via addInitScript. It has no Node.js APIs available. Keep it vanilla JS with inline CSS.
tests: Used by tests/e2e/ specs
related: tests/e2e/fixtures.mjs
---

# visual-cursor.mjs
