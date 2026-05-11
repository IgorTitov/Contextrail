<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Directory overview for starter/design/.
@sidecar README.md.header.md
@layer app | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# Design

<!-- SpecRefs:
TPL-054
-->

Design token system for the starter app.

## Files

| File             | Purpose                                            |
| ---------------- | -------------------------------------------------- |
| `reset.css`      | Modern CSS reset — element selectors only          |
| `tokens.css`     | Spacing, typography, shadow, z-index custom props  |
| `components.css` | Base component classes built from token references  |

Color tokens live in `../theme-toggle/theme-variables.css` and are loaded between reset and components.

## Load order in index.html

1. `design/reset.css`
2. `design/tokens.css`
3. `theme-toggle/theme-variables.css`
4. `design/components.css`

## Related

- [Brandbook](../../../docs/design/brandbook.md)
- [Design system](../../../docs/design/design-system.md)
