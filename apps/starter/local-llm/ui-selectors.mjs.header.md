---
fileId: contextrail-template:apps:starter:local-llm:ui-selectors
module: apps/starter
stability: evolving
steward: shared
api: file-local
owns: Canonical data-testid string registry for the Local LLM UI feature; single source of truth preventing scattered hardcoded selector literals in templates and tests.
boundaries: Must not contain logic or DOM manipulation. Must not grow to include selectors from other feature slices. Must remain the only place where local-llm data-testid values are defined.
invariants: All selector values must be unique within this registry; local-llm-panel.mjs must use only selectors from this file; test files must import from this registry rather than hardcoding testid strings.
risks: Adding a selector here without updating the panel or tests (or vice versa) causes silent mismatches that only surface during E2E runs; duplicate values across registries cause ambiguous test queries.
notesForLLM: Import { localLlm } from this file in panel code and tests. Never hardcode a local-llm data-testid string outside this file. All keys map directly to data-testid attribute values used in local-llm-panel.mjs.
tests: tests/unit/local-llm-ui.test.mjs
linkedDocs: docs/prd/local-llm.md
specRefs: TPL-085
related:
  - apps/starter/local-llm/local-llm-panel.mjs
  - tests/unit/local-llm-ui.test.mjs
summary: Bounded UI selector registry for the starter app.
---

# ui-selectors.mjs
