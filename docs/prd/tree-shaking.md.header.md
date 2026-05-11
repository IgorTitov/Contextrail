---
fileId: contextrail-template:docs:prd:tree-shaking
module: docs/prd
stability: evolving
steward: shared
api: PRD document
dependsOn:
  - docs/prd/index.md
  - docs/backlog/index.md
summary: Define the umbrella PRD for the tree-shaking build optimization that adds an import-graph analyzer and a --treeshake flag to the zero-bundler build script.
owns: The requirement intent for the tree-shaking build optimization epic.
boundaries: This file owns requirement intent and acceptance boundaries for tree-shaking. It does not own execution status (backlog) or workflow decomposition (USM). USM is intentionally skipped because this is technical/architectural infrastructure.
invariants: Each deliverable is independently implementable as a backlog slice. Acceptance boundaries are testable. The import-graph analyzer must use only Node.js built-ins. The build script enhancement must not break the default (non-treeshake) build path.
risks: Drift here can decouple the tree-shaking requirements from the backlog slices that implement them, or allow the import-graph analyzer to introduce external dependencies.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: This is the umbrella PRD for tree-shaking build optimization. This is technical/architectural work -- no USM required. Individual backlog slices reference this document for requirement intent. Slice 12 items are TPL-094 through TPL-096. The import-graph analyzer uses only Node.js built-ins (no AST parser dependency). Build output messages are developer-facing CLI output and do not need i18n.
tests:
  - node scripts/checks/product-docs-check.mjs
  - node scripts/checks/pre-impl-gate.mjs
linkedDocs:
  - docs/prd/index.md
  - docs/backlog/tree-shaking.md
specRefs: TPL-093
related:
  - docs/prd/platform-seams.md
  - docs/prd/feature-seams.md
---

# tree-shaking.md
