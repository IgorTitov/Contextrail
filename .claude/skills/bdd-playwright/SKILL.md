---
name: bdd-playwright
description: Translate UI/UX changes into Gherkin scenarios and verify them with Playwright-oriented checks.
---

<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Translate visible UI or UX changes into concrete Gherkin scenarios and Playwright-oriented proof steps that fit the repository’s user-facing test workflow.
@sidecar SKILL.md.header.md
@layer control-plane | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# bdd-playwright

## Use when

- UI state changes
- user flows change
- wording or validation changes
- visual or navigation behavior changes

## Required outputs

- updated `.feature` scenario
- updated deterministic BDD proof under `tests/bdd/`
- updated Playwright smoke proof when visible behavior is part of the template surface

## Commands

```bash
pnpm test:bdd
node .claude/skills/bdd-playwright/scripts/run-playwright-check.mjs
pnpm e2e:headed
```

Use `pnpm e2e:headed` when you need to watch the browser flow directly during debugging or acceptance work.

