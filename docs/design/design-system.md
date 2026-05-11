<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Record reusable UI patterns, visible-state rules, and implementation-facing design constraints for the design and frontend lanes.
@sidecar design-system.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Design system

<!-- SpecRefs:
TPL-060
-->

## Token architecture

The design system is built on CSS custom properties organized into three files loaded in order:

1. **`apps/starter/design/reset.css`** — Modern CSS reset. Element-only selectors, no classes.
2. **`apps/starter/design/tokens.css`** — Spacing, typography, shadows, z-index, and width tokens.
3. **`apps/starter/theme-toggle/theme-variables.css`** — Color tokens with light/dark switching.
4. **`apps/starter/design/components.css`** — Base component classes built exclusively from tokens.

### Token categories

| Category    | Prefix                 | File            |
| ----------- | ---------------------- | --------------- |
| Spacing     | `--space-*`            | tokens.css      |
| Typography  | `--font-*` `--text-*`  | tokens.css      |
| Shadows     | `--shadow-*`           | tokens.css      |
| Z-index     | `--z-*`                | tokens.css      |
| Colors      | `--color-*`            | theme-variables |
| Radius      | `--radius-*`           | theme-variables |
| Transitions | `--transition-*`       | theme-variables |

### Theming

Colors and radius tokens live in `theme-variables.css` with automatic dark mode via `prefers-color-scheme` and manual toggle via `data-theme="dark"` on the root element. Shadow tokens reference `--color-shadow` so depth adapts to the active theme.

### Adding new tokens

Add new tokens to `tokens.css` (non-color) or `theme-variables.css` (color/theme-dependent). Update the brandbook (`docs/design/brandbook.md`) and the contract test (`tests/contract/design-tokens-contract.test.mjs`) when adding a new category.

## Component patterns

Base component styles are in `apps/starter/design/components.css`. Every value must reference a token — no raw hex colors, no magic numbers.

Available components:

- **Buttons:** `.btn` + modifiers `--primary`, `--secondary`, `--ghost`, `--sm`, `--lg`
- **Inputs:** `.input` + `--error` state
- **Cards:** `.card` + `--elevated`, with `__header`, `__title`, `__body`, `__footer` parts
- **Badges:** `.badge` + `--success`, `--error`, `--info`
- **Layout:** `.stack`, `.row`, `.center` (flex-based, gap via tokens)
- **Text:** `.text-muted`, `.text-sm`, `.text-lg`, `.text-mono`
- **Divider:** `.divider`

### Adding new components

1. Add the class to `components.css` using only `var(--token)` references.
2. Document the class in the brandbook.
3. Verify the contract test still passes (no raw hex values).

## Selector and test-id registry rule

Automation-facing DOM hooks must not be hardcoded independently across templates, JS, CSS-adjacent logic, and tests.

Keep stable hooks in a **bounded UI registry** near the relevant feature or UI slice.

Use the registry for:

- `data-testid`
- reusable DOM `id`
- selectors derived from those stable hooks
- other reusable semantic UI hooks that multiple files consume

Do **not** default to a giant app-wide registry.

Prefer one bounded registry per feature or per visible slice.

Do **not** place purely presentational CSS classes into the registry by default. CSS modules and local styling concerns stay local unless a hook is intentionally part of the implementation and testability contract.

### Concrete starter example

See [apps/starter/ui-selectors.mjs](../../apps/starter/ui-selectors.mjs) for a working bounded registry that the E2E smoke spec and unit tests import directly. This module is the source of truth for the bootstrap feature's automation hooks.

## Copy and localization rule

All user-facing UI copy should be externalized through a simple i18n/messages layer from day one, even if the application initially ships with only one locale.

Keep message ownership close to the bounded workflow or UI slice so designers, frontend specialists, and acceptance testers can reason about visible states without chasing hardcoded copy across unrelated files.
