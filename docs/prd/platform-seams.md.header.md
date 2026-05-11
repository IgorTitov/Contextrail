---
fileId: contextrail-template:docs:prd:platform-seams
module: docs/prd
stability: evolving
steward: shared
api: PRD document
dependsOn:
  - docs/prd/index.md
  - docs/prd/starter-common-features.md
  - docs/backlog/index.md
summary: Define the umbrella PRD for multi-platform abstraction seams that make the starter template convertible to PWA, local file, desktop, mobile, browser extension, or static hosted deployments.
owns: The requirement intent for the multi-platform abstraction seams epic.
boundaries: This file owns requirement intent and acceptance boundaries for platform seams. It does not own execution status (backlog) or workflow decomposition (USM). USM is intentionally skipped because this is technical/architectural work.
invariants: Each seam is independently implementable as a backlog slice. Acceptance boundaries are testable. Seams must not break existing starter features.
risks: Drift here can decouple the platform seam requirements from the backlog slices that implement them, or allow seams that silently break existing features.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: This is the umbrella PRD for multi-platform seams. This is technical/architectural work — no USM required. Individual backlog slices reference this document for requirement intent. Slice 1 (TPL-023, TPL-024, TPL-025) covers foundational seams. Slice 2 (TPL-026, TPL-027, TPL-028) covers PWA manifest, icons, service worker, and PWA UI layer. Slice 3 (TPL-029, TPL-030, TPL-031, TPL-032) covers IndexedDB adapter, environment detection, adapter factory, and build scripts. Slice 4 (TPL-033, TPL-034, TPL-035) covers scaffold templates, platform guides, and README/CHANGELOG updates.
tests:
  - node scripts/checks/product-docs-check.mjs
  - node scripts/checks/pre-impl-gate.mjs
linkedDocs:
  - docs/prd/index.md
  - docs/backlog/platform-seams.md
specRefs: TPL-022
related:
  - docs/prd/starter-common-features.md
  - docs/backlog/starter-common-features.md
---

# platform-seams.md
