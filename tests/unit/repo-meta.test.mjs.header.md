---
fileId: contextrail-template:tests:unit:repo-meta
module: tests/unit
stability: evolving
steward: shared
api: node:test spec
dependsOn:
  - node:test
  - node:assert/strict
  - scripts/lib/repo-meta.mjs
summary: Unit proof for the repository identity and version helpers in scripts/lib/repo-meta.mjs.
owns: Unit proof for the repo-meta helpers.
boundaries: Tests repo identity derivation. Does not mock package.json or VERSION.
invariants: Must fail if FileId prefix derivation or version fallback chain regresses.
risks: Without this proof the repo-identity module has no direct unit coverage.
securityPrivacy: Local test code only; avoid secrets and network access.
notesForLLM: Tests read the real repo package.json and VERSION. Update expected values if they change.
tests: pnpm test:unit
linkedDocs:
  - tests/unit/README.md
  - scripts/lib/repo-meta.mjs
related:
  - scripts/lib/repo-meta.mjs
  - scripts/checks/_shared.mjs
---

# repo-meta.test.mjs
