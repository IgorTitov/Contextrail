---
fileId: contextrail-template:playwright-config
module: root
stability: evolving
steward: shared
api: Playwright config
dependsOn:
  - @playwright/test
  - tests/e2e/template-bootstrap.spec.mjs
owns: The minimal Playwright configuration used by the template’s e2e smoke proof.
boundaries: This file configures the template smoke proof only. It must not assume a specific application architecture.
invariants: The config stays small, local-only, and runnable without a dev server.
risks: If this config grows application-specific assumptions, the template stops being a reusable starter.
securityPrivacy: Local test configuration only; avoid secrets and network access.
notesForLLM: Keep the config minimal and obvious.
tests: pnpm test:e2e:smoke
linkedDocs:
  - tests/e2e/README.md
  - package.json.header.md
related:
  - tests/e2e/template-bootstrap.spec.mjs
  - package.json
summary: Playwright.Config configuration for the repository.
---

# playwright.config.mjs
