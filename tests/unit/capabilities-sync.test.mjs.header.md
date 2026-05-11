---
fileId: contextrail-template:tests:unit:capabilities-sync.test
module: tests/unit
stability: evolving
steward: shared
api: "node --test tests/unit/capabilities-sync.test.mjs"
dependsOn:
  - scripts/checks/capabilities-sync.mjs
  - scripts/checks/lib/jsdoc-typedef-parser.mjs
  - modules/cache/ports/cache-port.mjs
  - modules/cache/manifest.json
summary: Unit tests for the capabilities-sync pure helpers and drift detection against the cache pilot module.
owns: The proving surface for buildCacheCapabilities, serializeCapabilities, and diffCapabilities.
boundaries: Unit-level only. Invokes exported helpers directly, does not spawn the CLI.
invariants: Tests remain deterministic and run in any order; no shared mutable state.
risks: Weak assertions here would let parser drift or serializer drift slip past pre-commit.
securityPrivacy: Reads repo files only; no network.
notesForLLM: Extend with more positive and negative cases as the parser widens in TPL-180+.
specRefs:
  - TPL-179
  - TPL-178
tests: []
linkedDocs:
  - docs/prd/manifest-capabilities.md
  - docs/backlog/manifest-capabilities.md
related:
  - tests/unit/jsdoc-typedef-parser.test.mjs
  - scripts/checks/capabilities-sync.mjs
---

# capabilities-sync.test.mjs
