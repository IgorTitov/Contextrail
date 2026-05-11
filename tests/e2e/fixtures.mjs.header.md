---
fileId: contextrail-template:tests:e2e:fixtures
module: tests/e2e
stability: evolving
steward: shared
api: file-local
dependsOn:
  - @playwright/test
  - tests/e2e/visual-cursor.mjs
summary: Custom Playwright fixture extending base test with visual cursor overlay and starter app page navigation.
owns: The extended Playwright test fixture that injects visual cursor overlay and navigates to the starter app before each E2E test.
boundaries: Must not contain test logic — only fixture setup. Test specs import from this file.
invariants: Must export a `test` object that extends Playwright's base test. Visual cursor must be injected via page.addInitScript.
risks: If Playwright's fixture API changes, this file must be updated.
notesForLLM: All E2E spec files should import { test, expect } from this fixtures file, not directly from @playwright/test, to get the visual cursor overlay.
tests: Used by tests/e2e/ specs
related:
  - tests/e2e/visual-cursor.mjs
  - playwright.config.mjs
---

# fixtures.mjs
