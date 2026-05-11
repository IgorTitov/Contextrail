---
fileId: contextrail-template:tests:contract:design-tokens-contract.test
module: tests/contract
stability: evolving
steward: shared
api: file-local
dependsOn:
  - apps/starter/design/tokens.css
  - apps/starter/design/reset.css
  - apps/starter/design/components.css
  - apps/starter/index.html
  - docs/design/brandbook.md
summary: "Verify that the design token layer satisfies its structural contract: required files exist, token categories are defined, component styles use only var() references (no raw hex), index.html links all CSS files, and brandbook has real content."
owns: Structural compliance proof that the design token layer has all required files, defines expected token categories, enforces the no-raw-hex rule in components.css, verifies index.html CSS links, and checks brandbook completeness.
boundaries: Must not test visual rendering or runtime behavior. All checks are filesystem-based text assertions.
invariants: Token category checks (--space-*, --font-*, --text-*, --shadow-*, --z-*) must always be present. The no-raw-hex assertion for components.css must not be weakened.
risks: If a CSS file is renamed or moved, tests fail loudly — do not weaken the test; align the file structure instead.
notesForLLM: This file reads CSS files as text and checks for expected patterns. When adding a new token category, add a corresponding assertion here. The no-raw-hex check strips CSS comments before scanning.
tests:
  - Self-contained
  - run via node:test.
linkedDocs:
  - docs/design/brandbook.md
  - docs/design/design-system.md
specRefs:
  - TPL-054
  - TPL-055
  - TPL-056
  - TPL-057
  - TPL-059
related: tests/contract/ui-selector-registry-contract.test.mjs
---

# design-tokens-contract.test.mjs
