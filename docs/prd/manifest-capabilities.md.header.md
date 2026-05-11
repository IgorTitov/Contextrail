---
fileId: contextrail-template:docs:prd:manifest-capabilities
module: docs/prd
stability: evolving
steward: shared
api: PRD document
dependsOn:
  - docs/prd/index.md
  - docs/backlog/index.md
  - docs/analysis/mode-b-review.md
  - docs/analysis/port-jsdoc-coverage.md
summary: Define the umbrella PRD for surfacing port capability data in module manifests via a generator that reads JSDoc typedefs and sibling types.d.ts files, closing Mode B audit finding F3.
owns: The requirement intent for the manifest-capabilities epic (TPL-178) that closes Mode B finding F3 by generating capability blocks into module manifests from JSDoc and types.d.ts sources.
boundaries: This file owns requirement intent and acceptance boundaries for TPL-178. It does not own execution status (backlog) or workflow decomposition (USM). USM is intentionally skipped because this is control-plane infrastructure for agent navigation, not user-facing behavior. failureModes (F5) is explicitly out of scope.
invariants: The generator must use only Node.js built-ins. Both inline JSDoc @typedef and sibling types.d.ts are accepted as capability sources. The --check mode is a hard fail from day one, with no soft-warn mode. Retrieval is not forced to migrate from types.d.ts to JSDoc. Capabilities blocks are generator-owned and must not be hand-edited. F5 (failureModes) is deferred and must not be folded into any slice.
risks: Drift here could allow the generator to introduce external dependencies, force retrieval to migrate away from types.d.ts, or silently accept a soft-warn mode that defeats the tier-2 navigation guarantee. Drift could also blur the F3/F5 boundary and pull failureModes design into the wrong epic.
securityPrivacy: Documentation content only; generator reads source files without executing them.
notesForLLM: This PRD implements F3 from the Mode B audit (docs/analysis/mode-b-review.md). Variant 2 = hard fail from day one, explicitly chosen as hard fail from day one, decision recorded in the PRD body. Empirical basis is docs/analysis/port-jsdoc-coverage.md — 31 ports, 27 READY, 2 PARTIAL, 2 MISSING. Slices TPL-179 through TPL-186 are the execution plan. F5 (failureModes) is deferred and must not be pulled into this epic.
tests:
  - node scripts/checks/product-docs-check.mjs
  - node scripts/checks/pre-impl-gate.mjs
linkedDocs:
  - docs/prd/index.md
  - docs/backlog/manifest-capabilities.md
  - docs/adr/0010-manifest-capabilities.md
  - docs/analysis/mode-b-review.md
  - docs/analysis/port-jsdoc-coverage.md
specRefs: TPL-178
related:
  - docs/prd/module-detachment.md
  - docs/prd/tree-shaking.md
  - docs/adr/0006-context-optimized-architecture.md
  - docs/adr/0009-sidecar-first-headers.md
---

# manifest-capabilities.md
