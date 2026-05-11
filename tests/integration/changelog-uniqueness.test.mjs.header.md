---
fileId: contextrail-template:tests:integration:changelog-uniqueness:test:mjs
module: tests/integration
stability: stable
steward: shared
api: Test
dependsOn:
  - CHANGELOG.md
  - scripts/checks/changelog-sync.mjs
summary: Layer 6 meta-test for the C5 changelog version-uniqueness invariant. Reads live CHANGELOG.md and asserts no duplicate versioned section headings exist.
owns: Permanent regression net for the C5 invariant; catches regressions in layers 1-5.
boundaries: Read-only; never mutates CHANGELOG.md.
invariants:
  - Must pass on every clean trunk CHANGELOG.md.
  - Fails loudly whenever any ## [<version>] heading appears more than once.
runner: node:test
testCount: 3
specRefs:
  - TPL-286
relatedAdr:
  - docs/adr/0024-changelog-uniqueness-defense.md
---

# changelog-uniqueness.test.mjs
