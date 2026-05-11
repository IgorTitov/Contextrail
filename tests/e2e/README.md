<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Explain the optional Playwright smoke proof shipped with the template.
@sidecar README.md.header.md
@layer tests | @hex _none_ | @ctx _none_
@public false
@edit rewrite-ok -->

# tests/e2e

E2E tests verify **visible browser behavior** using Playwright against real or static HTML fixtures. This layer is opt-in and not part of the default fast path.

## Role in the test pyramid

| Layer | What it proves |
| ----- | -------------- |
| unit | Pure logic in isolation |
| integration | Multi-file wiring and local entrypoint proofs |
| contract | Stable repo-wide conventions and boundary contracts |
| bdd | Gherkin scenarios and traceability |
| **e2e** | **Visible browser behavior (opt-in)** |

E2E tests require `pnpm playwright:install` and launch a real browser. They are not part of `pnpm test` — run them separately with `pnpm test:e2e:smoke`.

## Current files

| File | Role |
| ---- | ---- |
| `template-bootstrap.html` | Static local fixture for bootstrap smoke. |
| `template-bootstrap.spec.mjs` | Playwright smoke spec for the bootstrap fixture. |
| `starter-app.html` | Static fixture with all starter-app features. |
| `starter-app.spec.mjs` | 11-test Playwright spec for the starter app. |
| `fixtures.mjs` | Custom Playwright fixture — auto-injects cursor overlay in headed mode. |
| `visual-cursor.mjs` | Cursor overlay injection helper (red dot, click rings, touch dots). |

## Execution modes

The same test suite runs in multiple modes via environment variables and launcher flags. No forked or duplicate test files are needed.

| Mode           | Command                            | Description                                          |
| -------------- | ---------------------------------- | ---------------------------------------------------- |
| CI / headless  | `pnpm test:e2e:smoke`              | Default. Fast, invisible, suitable for CI.           |
| Headed         | `pnpm e2e:headed`                  | Visible browser + cursor overlay for debugging.      |
| Demo           | `pnpm e2e:demo`                    | Headed + 500 ms slowmo for stakeholder walkthroughs. |
| Custom slowmo  | `pnpm e2e -- --slowmo 300`         | Headed with a custom slowmo value in ms.             |
| No cursor      | `pnpm e2e:headed -- --no-cursor`   | Headed without the cursor overlay.                   |
| Force cursor   | `pnpm e2e -- --cursor`             | Cursor overlay even in headless (for video capture). |
| Playwright UI  | `pnpm e2e:ui`                      | Interactive Playwright test runner UI.               |

### Environment variables

| Variable          | Effect                                                       |
| ----------------- | ------------------------------------------------------------ |
| `HEADED=1`        | Run the browser visibly instead of headless.                 |
| `E2E_SLOWMO=<ms>` | Slow down every browser action by the given milliseconds.    |
| `E2E_CURSOR=1`    | Force cursor overlay on (even headless, for video capture).  |
| `E2E_CURSOR=0`    | Force cursor overlay off (even in headed mode).              |

The cross-platform launcher at `scripts/checks/run-e2e.mjs` translates CLI flags into the corresponding env vars so tests stay portable.

## Visual cursor overlay

In headed mode, a bright red dot automatically tracks mouse movement, expanding rings animate on clicks, and touch points are highlighted. This makes user interactions clearly visible during demos, walkthroughs, and debugging sessions.

The overlay activates automatically when `HEADED=1` and can be controlled independently via `E2E_CURSOR`.

### How it works

All spec files import `{ test, expect }` from `./fixtures.mjs` instead of directly from `@playwright/test`. The custom fixture wraps the standard `page` object and injects the cursor overlay via `addInitScript`, so it re-injects automatically on every page navigation.

### Customizing appearance

Override the cursor in your own fixture:

```js
import { test as base, expect } from './fixtures.mjs';
import { injectCursorOverlay } from './visual-cursor.mjs';

export { expect };
export const test = base.extend({
  page: async ({ page }, use) => {
    await injectCursorOverlay(page, {
      color: '#3b82f6',  // blue instead of red
      size: 28,          // larger dot
      clickScale: 4,     // bigger click rings
      clickDuration: 600, // slower ring animation
      opacity: 0.9,
    });
    await use(page);
  },
});
```

### Disabling the overlay

- Set `E2E_CURSOR=0` in your environment.
- Or import directly from `@playwright/test` in a specific spec file.

### Quick start

```bash
pnpm playwright:install
pnpm test:e2e:smoke        # CI mode (no cursor)
pnpm e2e:headed            # visible debug + cursor
pnpm e2e:demo              # stakeholder demo + cursor + slowmo
```
