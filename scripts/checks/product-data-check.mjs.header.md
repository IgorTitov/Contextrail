---
fileId: contextrail-template:scripts:checks:product-data-check
module: scripts/checks
stability: evolving
steward: shared
api: "CLI: node scripts/checks/product-data-check.mjs [--json]"
dependsOn:
  - node:fs/promises
  - node:path
  - scripts/checks/_shared.mjs
  - scripts/lib/errors.mjs
summary: Validate that product-data persona-economics files are well-formed and reference existing personas.
owns: Deterministic validation of product-data persona-economics files.
boundaries: This file validates product-data structure only. It must not mutate repository state.
invariants: The check remains deterministic and local-only; failures point at structural issues in economics files.
risks: Drift here can let malformed economics files survive into commits.
securityPrivacy: Local filesystem only; avoid network access and hidden side effects.
notesForLLM: Keep checks focused on structural validity. Do not validate economics values themselves.
tests: "Manual: pnpm product-data-check"
linkedDocs:
  - docs/product-data/README.md
  - docs/product-data/persona-economics/README.md
related:
  - scripts/checks/usm-check.mjs
  - scripts/checks/product-docs-check.mjs
---

# product-data-check.mjs
