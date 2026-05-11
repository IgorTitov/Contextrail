---
fileId: contextrail-template:tests:e2e:starter-app
module: tests/e2e
stability: evolving
steward: shared
api: file-local
summary: "End-to-end tests: starter app."
owns: Self-contained HTML fixture exercising all 8 starter features under file:// protocol for Playwright E2E consumption.
boundaries: Must remain a standalone static file with no build step or server requirement; must not import from apps/starter source modules directly; feature DOM must use data-testid values from the bounded ui-selectors registries.
invariants: All data-testid attributes must match the values exported by the relevant apps/starter/**/ui-selectors.mjs registries; the file must open correctly under file:// without a dev server; all 8 starter features must have at least one exercisable DOM element.
notesForLLM: Keep this file self-contained and dependency-free. When changing a data-testid value, update the corresponding ui-selectors.mjs registry first, then update this fixture. Do not inline application logic here.
tests: tests/e2e/starter-app.spec.mjs via Playwright
---

# starter-app.html
