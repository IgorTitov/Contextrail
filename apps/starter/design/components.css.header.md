---
fileId: contextrail-template:apps:starter:design:components
module: apps/starter
stability: evolving
steward: shared
api: CSS classes (.btn, .input, .card, .badge, .stack, .row, .center, .divider, .text-*)
dependsOn:
  - apps/starter/design/tokens.css
  - apps/starter/theme-toggle/theme-variables.css
owns: Base visual classes for buttons (.btn variants), inputs (.input variants), cards (.card parts), badges (.badge variants), layout helpers (.stack, .row, .center), text utilities (.text-muted, .text-sm, .text-lg, .text-mono), and the .divider class.
boundaries: Must use only var(--token) references — no raw hex values. Must not duplicate token definitions. Must not contain element-only resets (those belong in reset.css).
invariants: The contract test asserts that no raw hex colors appear in property values. All var() references must resolve to tokens from tokens.css or theme-variables.css.
risks: Adding raw hex colors will fail the contract test. Renaming a class may break app HTML templates.
notesForLLM: Every property value must use var(--token) or inherit. The contract test strips comments and scans for raw hex patterns — do not introduce direct color values. When adding a new component class, document it in the brandbook and design-system doc.
tests: tests/contract/design-tokens-contract.test.mjs
linkedDocs:
  - docs/design/brandbook.md
  - docs/design/design-system.md
specRefs: TPL-057
related:
  - apps/starter/design/tokens.css
  - apps/starter/design/reset.css
summary: Styles for Components in the starter app.
---

# components.css
