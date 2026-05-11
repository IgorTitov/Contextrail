<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Record the repository-local visual language and brand constraints that user-facing design work should respect.
@sidecar brandbook.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Brandbook

Visual language guide for the starter template design system.
Customize these sections when adapting the template for a specific product.

<!-- SpecRefs:
TPL-059
-->

## Color

The palette uses a neutral base with a single accent color for primary actions.

| Role           | Token                    | Light default | Dark default |
| -------------- | ------------------------ | ------------- | ------------ |
| Background     | `--color-bg`             | white         | near-black   |
| Foreground     | `--color-fg`             | near-black    | light gray   |
| Primary accent | `--color-primary`        | blue 600      | blue 500     |
| Surface        | `--color-surface`        | gray 100      | gray 900     |
| Surface raised | `--color-surface-raised` | white         | gray 800     |
| Border         | `--color-border`         | gray 300      | gray 700     |
| Muted text     | `--color-muted`          | gray 500      | gray 400     |
| Success        | `--color-success`        | green 600     | green 500    |
| Error          | `--color-error`          | red 600       | red 500      |

**Do:** Use semantic token names (`--color-primary`, `--color-error`) in components.
**Don't:** Use raw hex values in component styles. All colors flow through tokens.

## Typography

The system uses the OS font stack for fast loading and native feel.

| Token                  | Value                                      |
| ---------------------- | ------------------------------------------ |
| `--font-sans`          | system-ui, -apple-system, Segoe UI, Roboto |
| `--font-mono`          | ui-monospace, Cascadia Code, Fira Code     |
| `--text-base`          | 1rem (16px)                                |
| `--line-height-normal` | 1.5                                        |

**Scale:** xs (12px), sm (14px), base (16px), lg (18px), xl (20px), 2xl (24px), 3xl (30px), 4xl (36px).

**Do:** Use the token scale (`--text-sm`, `--text-lg`) for consistent sizing.
**Don't:** Introduce arbitrary font sizes outside the scale.

## Spacing

An 8-point-based scale from `--space-0` through `--space-9`.

| Token        | Value    | Pixels |
| ------------ | -------- | ------ |
| `--space-1`  | 0.25rem  | 4      |
| `--space-2`  | 0.5rem   | 8      |
| `--space-3`  | 0.75rem  | 12     |
| `--space-4`  | 1rem     | 16     |
| `--space-5`  | 1.5rem   | 24     |
| `--space-6`  | 2rem     | 32     |
| `--space-7`  | 3rem     | 48     |
| `--space-8`  | 4rem     | 64     |

**Do:** Use spacing tokens for all margins, paddings, and gaps.
**Don't:** Use arbitrary pixel values or `em` values that bypass the scale.

## Shadows and depth

Four shadow levels for visual depth hierarchy.

| Token          | Use case           |
| -------------- | ------------------ |
| `--shadow-sm`  | Subtle card lift   |
| `--shadow-md`  | Elevated cards     |
| `--shadow-lg`  | Dropdowns, popups  |
| `--shadow-xl`  | Modals, dialogs    |

Shadows reference `--color-shadow` so they automatically adapt to dark mode.

## Motion

Transitions use two speed tokens:

| Token                 | Duration | Use case                  |
| --------------------- | -------- | ------------------------- |
| `--transition-fast`   | 150ms    | Hover states, focus rings |
| `--transition-normal` | 250ms    | Theme changes, layout     |

**Do:** Respect `prefers-reduced-motion: reduce` — the reset disables all animations for users who opt out.
**Don't:** Add animations longer than 300ms for interactive feedback.

## Border radius

| Token           | Value | Use case           |
| --------------- | ----- | ------------------ |
| `--radius-sm`   | 4px   | Small elements     |
| `--radius-md`   | 8px   | Buttons, inputs    |
| `--radius-lg`   | 16px  | Cards, panels      |
| `--radius-full` | 999px | Pills, avatars     |

## Icons and illustrations

The template does not ship a specific icon set. When adding icons:

- Prefer inline SVG for theme-aware color via `currentColor`.
- Keep icon dimensions consistent (16px, 20px, 24px grid).
- Avoid icon-only buttons without accessible labels.

## Component patterns

Base component classes are defined in `apps/starter/design/components.css`:

- **Buttons:** `.btn`, `.btn--primary`, `.btn--secondary`, `.btn--ghost`, `.btn--sm`, `.btn--lg`
- **Inputs:** `.input`, `.input--error`
- **Cards:** `.card`, `.card--elevated`, `.card__header`, `.card__title`, `.card__body`, `.card__footer`
- **Badges:** `.badge`, `.badge--success`, `.badge--error`, `.badge--info`
- **Layout:** `.stack`, `.row`, `.center`, `.divider`
- **Text:** `.text-muted`, `.text-sm`, `.text-lg`, `.text-mono`

## Do / Don't summary

| Do | Don't |
| -- | ----- |
| Use token variables for all values | Use raw hex, px, or magic numbers |
| Follow the spacing scale | Invent ad-hoc spacing |
| Test both light and dark modes | Assume light mode only |
| Respect reduced motion preferences | Add decorative animations without opt-out |
| Use semantic color roles | Reference palette positions directly |
| Keep components composable | Create deeply nested component hierarchies |
