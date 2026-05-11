---
fileId: contextrail-template:tests:unit:claim-check.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
dependsOn: scripts/checks/claim-check.mjs
summary: Unit tests for claim-check pure functions including overlap detection, enforcement, negotiation, dependency-aware ordering, cross-repo federation, and active-claim queries.
owns: Unit proof of claim-check pure functions.
boundaries: Must not access the filesystem or .claims/ directory; uses in-memory claim objects only.
invariants: All tests must be independent and deterministic with fixed timestamps.
notesForLLM: Uses in-memory claim data with fixed timestamps. No filesystem access. Phase 4 added dependency ordering, blocked/ready classification, federation tagging, and claim merging coverage.
tests: node --test tests/unit/claim-check.test.mjs
linkedDocs:
  - .claims/README.md
  - docs/adr/0008-inter-agent-coordination-protocol.md
specRefs:
  - TPL-173
  - TPL-174
  - TPL-175
  - TPL-176
related: scripts/checks/claim-check.mjs
---

# claim-check.test.mjs
