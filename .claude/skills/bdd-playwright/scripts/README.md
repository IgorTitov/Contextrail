<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Explain the small local helper scripts that support the bdd-playwright skill without becoming part of the main repository runtime.
@sidecar README.md.header.md
@layer control-plane | @hex _none_ | @ctx _none_
@public false
@edit rewrite-ok -->

# scripts

This folder keeps executable helpers out of the main skill file.

## Current helper behavior

- `run-playwright-check.mjs` prefers `test:e2e:smoke`, then `test:e2e`, then `e2e`.
- The helper delegates to package scripts; it does not invent Playwright config or browser lifecycle rules.
