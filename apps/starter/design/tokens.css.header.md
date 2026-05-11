---
fileId: contextrail-template:apps:starter:design:tokens
module: apps/starter
stability: evolving
steward: shared
api: CSS custom properties on :root
owns: Spacing scale (--space-0 through --space-9), typography tokens (--font-*, --text-*, --font-weight-*, --line-height-*, --letter-spacing-*), shadow scale (--shadow-sm through --shadow-xl), z-index scale (--z-base through --z-tooltip), focus ring, and content width tokens.
boundaries: Must not define color tokens — those belong in theme-toggle/theme-variables.css. Must not contain component classes — those belong in components.css.
invariants: All tokens must be CSS custom properties on :root. Token names must use the category prefixes documented in docs/design/design-system.md.
risks: Renaming or removing a token breaks any component.css class or app CSS that references it. Always check dependents before changing token names.
notesForLLM: Color tokens live in theme-toggle/theme-variables.css, not here. When adding a new token category, also update the brandbook, design-system doc, and the contract test.
tests: tests/contract/design-tokens-contract.test.mjs
linkedDocs:
  - docs/design/brandbook.md
  - docs/design/design-system.md
specRefs: TPL-055
related:
  - apps/starter/theme-toggle/theme-variables.css
  - apps/starter/design/components.css
summary: Styles for Tokens in the starter app.
---

# tokens.css
