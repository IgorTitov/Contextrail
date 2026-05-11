---
fileId: contextrail-template:tests:contract:retrieval-hex-contract.test
module: tests/contract
stability: evolving
steward: shared
api: file-local
dependsOn: modules/retrieval/public-api.mjs
summary: Verify hex architecture structural compliance for the retrieval module -- folder layout, public-api surface, and no deep imports.
owns: Structural compliance proof for the retrieval hex module -- folder layout, public-api surface completeness, and deep-import prevention.
boundaries: Must only verify structural properties; behavioral testing belongs in unit tests.
invariants: Required hex folders (domain, ports, adapters) must exist; public-api.mjs must export exactly the documented surface; unit tests must not deep-import module internals.
risks: New exports added to public-api.mjs without updating the expected surface list here will be silently allowed.
notesForLLM: Keep the expected export list in sync with public-api.mjs. This test catches structural drift but not behavioral regressions.
tests: self
linkedDocs: docs/prd/retrieval.md
specRefs:
  - TPL-086
  - TPL-087
  - TPL-092
related:
  - tests/contract/ai-chat-hex-contract.test.mjs
  - modules/retrieval/public-api.mjs
---

# retrieval-hex-contract.test.mjs
