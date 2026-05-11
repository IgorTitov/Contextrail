---
fileId: contextrail-template:scripts:checks:run-e2e
module: scripts/checks
stability: evolving
steward: shared
api: "CLI: node scripts/checks/run-e2e.mjs [--headed] [-- ...playwright args]"
dependsOn:
  - node:child_process
  - package.json
  - playwright.config.mjs
summary: Launch Playwright in a cross-platform way with optional headed mode for visible debugging.
owns: A cross-platform Playwright launcher with optional headed mode.
boundaries: This file wraps playwright invocation only. It must not become a test-orchestration framework.
invariants: Invocation stays thin, local-only, and forwards extra args; --headed sets HEADED=1.
risks: Drift here can make visible e2e debugging platform-specific again.
securityPrivacy: Local process execution only; avoid secrets and network access.
notesForLLM: Keep this wrapper minimal. It exists to make headed runs predictable on every shell.
tests:
  - pnpm e2e:headed
  - pnpm test:e2e:smoke
linkedDocs:
  - tests/e2e/README.md
  - package.json
related:
  - playwright.config.mjs
  - scripts/checks/changeset-size-check.mjs
---

# run-e2e.mjs
