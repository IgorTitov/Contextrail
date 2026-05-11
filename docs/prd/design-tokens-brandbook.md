<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Define the umbrella PRD for the Design Tokens and Brandbook feature that provides CSS custom properties, a modern reset, token-based component styles, and a brandbook template for the starter app.
@sidecar design-tokens-brandbook.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Design Tokens + Brandbook

## Requirement intent

The starter template needs a design-system foundation that provides a single source of truth for visual properties, a clean baseline reset, and token-based component styles. This feature establishes the CSS custom-property token layer, a minimal modern reset, reusable base component styles, and a brandbook template that documents how to customize the design system for any project.

The **design tokens** (`tokens.css`) define CSS custom properties for colors, spacing, typography, border radius, shadows, z-index layers, and transitions. They support dark mode via both the `prefers-color-scheme` media query and an explicit `.dark` class toggle, enabling both automatic and manual theme switching.

The **CSS reset** (`reset.css`) provides a minimal, modern reset that normalizes browser defaults without the weight of a full normalize.css. It establishes a predictable baseline for the token-based component styles.

The **component styles** (`components.css`) provide base styles for buttons, inputs, cards, and layout utilities. Every value in components.css must reference a token from tokens.css -- raw color values, pixel sizes, and other magic numbers are forbidden. This ensures that theming changes propagate automatically.

The **brandbook template** (`docs/design/brandbook.md`) documents the design system's token categories, customization points, and theming approach. It is a fillable template, not a specific brand identity, so that any project using this starter can replace the placeholder values with their own brand.

This is **not** a hex module. The design files live in `apps/starter/design/` as plain CSS loaded by the starter app's `index.html`. No ports, adapters, or domain layers are needed.

## Classification

This is **design-system infrastructure** work. It provides the visual foundation layer for the starter app. It does not alter user-facing workflows directly. USM is intentionally skipped. Design-lane routing is recommended for the brandbook template update.

## Deliverables in scope (Slice 7)

### 1. Design Tokens (TPL-055)

CSS custom properties file at `apps/starter/design/tokens.css`.

**Token categories:**

- **Colors** -- primary, secondary, accent, neutral, semantic (success, warning, error, info), surface, background, text, border colors; each with light and dark mode variants
- **Spacing** -- a consistent spacing scale (e.g., 4px base unit with multipliers: xs, sm, md, lg, xl, 2xl, 3xl)
- **Typography** -- font families (sans, mono), font sizes (xs through 2xl), font weights (normal, medium, semibold, bold), line heights (tight, normal, relaxed)
- **Border radius** -- none, sm, md, lg, full
- **Shadows** -- none, sm, md, lg (using neutral colors from the token palette)
- **Z-index** -- named layers (base, dropdown, sticky, overlay, modal, toast)
- **Transitions** -- duration (fast, normal, slow) and easing (default, in, out, in-out)

**Dark mode support:**

- A `:root` block with the light-mode token values as defaults
- A `@media (prefers-color-scheme: dark)` block overriding color tokens for automatic dark mode
- A `:root.dark` selector block with the same dark overrides, enabling manual toggle via the `.dark` class on `<html>`
- The `.dark` class takes precedence when both are present (CSS specificity)

Constraints: All values must be CSS custom properties (no Sass, no PostCSS). Token names must follow a consistent `--<category>-<variant>` naming convention. No build step required. File must be loadable via a plain `<link>` tag.

### 2. CSS Reset (TPL-056)

Minimal modern reset at `apps/starter/design/reset.css`.

**Reset scope:**

- Box-sizing `border-box` on all elements
- Remove default margins and padding on body and common elements
- Normalize font rendering (antialiasing, text-size-adjust)
- Sensible defaults for images (max-width: 100%, display: block)
- Remove list styles on `ul`/`ol` with `role="list"`
- Inherit fonts on form elements (inputs, buttons, textareas, selects)
- Reduced motion media query to disable animations/transitions for users who prefer it
- Smooth scrolling on `:root` (respecting reduced-motion)
- Minimum body height (100dvh or 100vh fallback)

Constraints: Must be minimal and modern -- not a full normalize.css or a CSS framework. Must not set any visual styles (colors, fonts) that belong in tokens or components. Must reference tokens where appropriate (e.g., body background and text color from tokens). Must be loadable via a plain `<link>` tag before tokens.css and components.css.

### 3. Component Styles (TPL-057)

Base component styles at `apps/starter/design/components.css`.

**Component coverage:**

- **Buttons** -- primary, secondary, outline, ghost, and destructive variants; hover, focus, active, and disabled states; sizes (sm, md, lg)
- **Inputs** -- text input, textarea, select styling; focus, disabled, and error states; consistent border, padding, and radius using tokens
- **Cards** -- surface container with token-based background, border, shadow, radius, and padding
- **Layout utilities** -- flex and grid helpers (stack, row, center, grid-auto); container with max-width and auto margins; section spacing

**Token-only rule:**

Every property value in this file must reference a CSS custom property from tokens.css. No raw hex colors, pixel values, rem values, font names, or other magic numbers are allowed. This is the key design constraint that makes theming work.

Examples of allowed vs. forbidden:
- Allowed: `background-color: var(--color-primary);`
- Forbidden: `background-color: #3b82f6;`
- Allowed: `padding: var(--spacing-md);`
- Forbidden: `padding: 16px;`

Constraints: Must use only token references. Must not introduce any CSS framework or preprocessor dependency. Must use class-based selectors (not element selectors for components). Must be loadable via a plain `<link>` tag after tokens.css.

### 4. Starter App Integration (TPL-058)

Wire the design files into the existing starter app.

- Add `<link>` tags in `apps/starter/index.html` for `design/reset.css`, `design/tokens.css`, and `design/components.css` in the correct load order (reset first, then tokens, then components)
- Verify that existing starter app features continue to work with the new baseline
- No refactoring of existing component CSS in this slice -- integration only

Constraints: Must not break any existing starter features. Load order must be: reset, tokens, components. Existing inline styles or component-specific CSS may coexist but should not conflict.

### 5. Brandbook Template (TPL-059)

Update `docs/design/brandbook.md` from its current placeholder state into a fillable brandbook template.

**Template sections:**

- **Overview** -- what this brandbook covers and how to use it
- **Color palette** -- table mapping token names to their purposes, with placeholder values and instructions for replacement
- **Typography** -- font stack choices, size scale rationale, and weight usage guidance
- **Spacing and layout** -- spacing scale explanation and when to use each level
- **Component patterns** -- how the base component styles map to the token system, with guidance on extending or overriding
- **Dark mode** -- how the dark mode system works (automatic + manual toggle), how to customize dark palette
- **Customization guide** -- step-by-step instructions for replacing starter tokens with a real brand identity
- **Do / Don't** -- concrete guidance on maintaining token discipline (do use tokens, don't use raw values)

Constraints: Must be a template with placeholders, not a specific brand identity. Must reference the actual token file paths and CSS custom property names. Must be accurate relative to the implemented tokens.

### 6. Design-System Doc Update (TPL-060)

Update `docs/design/design-system.md` from its current placeholder state to reference the new token system, component patterns, and brandbook.

**Update scope:**

- Add layout patterns section referencing the layout utilities in components.css
- Add form patterns section referencing the input/button styles in components.css
- Add feedback and validation states section referencing semantic color tokens
- Reference the token file as the single source of truth for visual properties
- Reference the brandbook for customization guidance

Constraints: Must stay implementation-aware and concise. Must not duplicate the full token list (reference the file instead). Must not replace the brandbook or PRD content.

### 7. Design Token Tests and Validation (TPL-061)

Tests to prove the design-token discipline is maintained.

**Test scope:**

- Contract test: `components.css` does not contain raw color values (hex, rgb, hsl), raw pixel values for spacing/sizing, or raw font-family declarations -- only `var(--...)` references
- Contract test: `tokens.css` defines all token categories (color, spacing, typography, radius, shadow, z-index, transition)
- Contract test: dark-mode overrides exist in both `@media (prefers-color-scheme: dark)` and `:root.dark` blocks
- Contract test: all three design files exist at the expected paths
- Contract test: `reset.css` sets box-sizing border-box and includes reduced-motion media query

Constraints: All tests use `node:test`. Tests should parse CSS as text (regex or string matching) rather than requiring a CSS parser dependency. Tests must be runnable without a browser.

## Out of scope

- CSS preprocessors (Sass, Less, PostCSS)
- CSS-in-JS or runtime style generation
- CSS framework adoption (Tailwind, Bootstrap, etc.)
- Component JavaScript behavior (JS-driven components belong in later slices)
- Specific brand identity or real brand colors
- Complex layout system (CSS grid framework)
- Icon system or asset pipeline
- Animation library or complex keyframe definitions
- Theme persistence (handled by user-preferences module)
- Refactoring existing starter component CSS to use tokens (may be a follow-up slice)

## Cross-cutting constraints

- All files are plain CSS (no build step, no preprocessor)
- All files are loadable via standard `<link>` tags in the browser
- The token naming convention must be consistent and documented
- Dark mode must work via both `prefers-color-scheme` and `.dark` class
- Component styles must reference tokens exclusively (no raw values)
- Existing starter app features must continue to work
- The brandbook must be a fillable template, not a specific brand
- Design docs updates must stay concise and reference files rather than duplicating content

## Acceptance boundaries

### Slice 7

- `apps/starter/design/tokens.css` exists and defines CSS custom properties for colors, spacing, typography, radius, shadows, z-index, and transitions
- Token names follow a consistent `--<category>-<variant>` naming convention
- Dark mode tokens are defined in both `@media (prefers-color-scheme: dark)` and `:root.dark` blocks
- `.dark` class override has correct specificity to take precedence
- `apps/starter/design/reset.css` exists and provides a minimal modern reset
- Reset sets `box-sizing: border-box` on all elements
- Reset includes `prefers-reduced-motion` media query
- Reset references tokens for body background and text color
- `apps/starter/design/components.css` exists and provides base component styles
- Components.css contains zero raw color values, zero raw spacing values, and zero raw font declarations -- only token references
- Button, input, card, and layout utility styles are defined
- All three design files are linked in `apps/starter/index.html` in correct order (reset, tokens, components)
- Existing starter app features continue to work with the new baseline
- `docs/design/brandbook.md` is updated to a fillable template documenting token categories, customization points, and theming approach
- `docs/design/design-system.md` is updated to reference the token system and component patterns
- Contract tests verify token-only discipline in components.css
- Contract tests verify token category coverage in tokens.css
- Contract tests verify dark-mode override presence
- Contract tests verify file existence and reset baseline

```trace-yaml
work_item:
  id: TPL-054
  type: meta
  title: Design Tokens + Brandbook
  parent_ref:
  status: done
  module_ref: starter-design
  spec_refs:
    - docs/prd/design-tokens-brandbook.md
    - docs/prd/index.md
  test_refs:
    - tests/contract/product-docs-contract.test.mjs
  bdd_refs:
  acceptance:
    - Design tokens file provides CSS custom properties for all token categories.
    - Dark mode support via prefers-color-scheme and .dark class toggle.
    - CSS reset provides a minimal modern baseline.
    - Component styles use only token references, never raw values.
    - Design files are wired into the starter app index.html.
    - Brandbook template documents customization points and theming approach.
    - Design-system doc references the new token system.
    - Contract tests verify token discipline and file structure.
```
