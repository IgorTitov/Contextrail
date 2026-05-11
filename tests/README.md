<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Top-level map of the repository test surface, including the fast-path proof layers and the separate opt-in browser smoke layer.
@sidecar README.md.header.md
@layer tests | @hex _none_ | @ctx _none_
@public false
@edit rewrite-ok -->

# tests

Use this folder for repository-wide template proof and supporting artifacts.

## Layers shipped in the template

- `unit/` — tiny pure-logic examples using `node:test`.
- `integration/` — checks that package scripts, tasks, hook wiring, and adapter wiring agree.
- `contract/` — checks stable repository contracts such as sidecar naming, header namespace rules, and adapter parity rules.
- `bdd/` — Gherkin plus deterministic traceability-oriented checks.
- `e2e/` — optional Playwright smoke proof for visible behavior.

## Fast path and opt-in browser smoke

- `pnpm test` and `pnpm test:all` run only the shipped `unit`, `integration`, `contract`, and `bdd` layers.
- The default fast path does **not** install browsers and does **not** launch Playwright.
- `pnpm test:e2e:smoke` is a separate opt-in browser proof step.

## Command map

```bash
pnpm test
pnpm test:unit
pnpm test:integration
pnpm test:contract
pnpm test:bdd
pnpm test:e2e:smoke
```

Playwright smoke proof requires browser installation first:

```bash
pnpm playwright:install
```
