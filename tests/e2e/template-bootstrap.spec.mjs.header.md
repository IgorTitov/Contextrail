---
fileId: contextrail-template:tests:e2e:template-bootstrap-spec
module: tests/e2e
stability: evolving
steward: shared
api: Playwright spec
dependsOn:
  - @playwright/test
  - node:path
  - tests/e2e/template-bootstrap.html
  - apps/starter/ui-selectors.mjs
summary: Playwright smoke proof for the template’s local bootstrap fixture.
owns: The visible-behavior smoke proof for the template’s local bootstrap fixture.
boundaries: This file is an optional e2e smoke spec only. It must stay self-contained and avoid app-specific assumptions.
invariants: The spec remains runnable from a local file URL after `pnpm playwright:install`.
risks: If this spec starts depending on a server or app build, it stops being a reusable template example.
securityPrivacy: Local browser test only; avoid secrets and network access.
notesForLLM: Keep assertions stable and selector choices obvious.
tests: pnpm test:e2e:smoke
linkedDocs:
  - tests/e2e/README.md
  - .claude/skills/bdd-playwright/SKILL.md
related:
  - tests/e2e/template-bootstrap.html
  - playwright.config.mjs
---

# template-bootstrap.spec.mjs
