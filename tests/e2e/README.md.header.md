---
fileId: contextrail-template:tests:e2e:README
module: tests/e2e
stability: evolving
steward: shared
api: Folder guide
dependsOn:
  - tests/e2e/template-bootstrap.spec.mjs
  - tests/e2e/template-bootstrap.html
  - playwright.config.mjs
summary: Explain the optional Playwright smoke proof shipped with the template.
owns: The optional Playwright smoke-proof entrypoint for the standalone Claude template.
boundaries: This folder is for visible-behavior smoke proof only. It should stay self-contained and avoid depending on a real app runtime.
invariants: The smoke proof stays runnable after `pnpm playwright:install` without requiring a dev server.
risks: If this folder drifts into app-specific assumptions, the template stops being a reusable starter.
securityPrivacy: Local test code only; avoid secrets and network access.
notesForLLM: Keep this proof tiny, local, and obvious.
tests: pnpm test:e2e:smoke
linkedDocs:
  - tests/README.md
  - .claude/skills/bdd-playwright/SKILL.md
related:
  - playwright.config.mjs
  - package.json
---

# README.md
